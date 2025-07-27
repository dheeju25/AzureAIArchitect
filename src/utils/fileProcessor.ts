import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { parseString } from 'xml2js';
import { JSDOM } from 'jsdom';
// @ts-ignore - pdf-parse doesn't have TypeScript declarations
import pdf from 'pdf-parse';
import { logger } from './logger';

export interface ProcessedFile {
  format: SupportedFormat;
  content: Buffer;
  metadata: FileMetadata;
  extractedData?: any;
}

export interface FileMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  pageCount?: number;
  hasText?: boolean;
}

export type SupportedFormat = 
  | 'png' 
  | 'jpg' 
  | 'jpeg' 
  | 'gif' 
  | 'svg' 
  | 'webp' 
  | 'drawio' 
  | 'vsdx' 
  | 'pdf' 
  | 'unknown';

export class FileProcessor {
  
  async processFile(filePath: string, originalName: string): Promise<ProcessedFile> {
    const fileBuffer = await fs.readFile(filePath);
    const format = this.detectFormat(originalName, fileBuffer);
    
    logger.info('Processing file', {
      originalName,
      format,
      size: fileBuffer.length
    });

    const metadata: FileMetadata = {
      originalName,
      size: fileBuffer.length,
      mimeType: this.getMimeType(format)
    };

    let processedContent = fileBuffer;
    let extractedData: any = {};

    try {
      switch (format) {
        case 'drawio':
          const drawioResult = await this.processDrawioFile(fileBuffer);
          processedContent = drawioResult.imageBuffer;
          extractedData = drawioResult.extractedData;
          metadata.hasText = true;
          break;

        case 'svg':
          const svgResult = await this.processSvgFile(fileBuffer);
          processedContent = svgResult.imageBuffer;
          extractedData = svgResult.extractedData;
          metadata.hasText = true;
          break;

        case 'pdf':
          const pdfResult = await this.processPdfFile(fileBuffer);
          processedContent = pdfResult.imageBuffer;
          extractedData = pdfResult.extractedData;
          metadata.pageCount = pdfResult.pageCount;
          metadata.hasText = true;
          break;

        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
          const imageInfo = await sharp(fileBuffer).metadata();
          metadata.dimensions = {
            width: imageInfo.width || 0,
            height: imageInfo.height || 0
          };
          // Normalize image format to PNG for consistent processing
          if (format !== 'png') {
            processedContent = await sharp(fileBuffer).png().toBuffer();
          }
          break;

        default:
          logger.warn('Unsupported file format', { format, originalName });
          throw new Error(`Unsupported file format: ${format}`);
      }

      // Get final image dimensions if we converted to image
      if (!metadata.dimensions && processedContent) {
        try {
          const imageInfo = await sharp(processedContent).metadata();
          metadata.dimensions = {
            width: imageInfo.width || 0,
            height: imageInfo.height || 0
          };
        } catch (error) {
          logger.warn('Could not extract image dimensions', { error });
        }
      }

    } catch (error) {
      logger.error('File processing failed', {
        originalName,
        format,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }

    return {
      format,
      content: processedContent,
      metadata,
      extractedData
    };
  }

  private detectFormat(fileName: string, buffer: Buffer): SupportedFormat {
    const extension = path.extname(fileName).toLowerCase().slice(1);
    
    // Check by extension first
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
      return extension as SupportedFormat;
    }

    if (extension === 'svg') return 'svg';
    if (extension === 'pdf') return 'pdf';
    if (extension === 'drawio' || extension === 'xml') {
      // Check if it's a draw.io file by looking for specific markers
      const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
      if (content.includes('mxGraphModel') || content.includes('drawio')) {
        return 'drawio';
      }
    }

    // Check by file signature (magic numbers)
    if (buffer.length >= 8) {
      const signature = buffer.subarray(0, 8);
      
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47) {
        return 'png';
      }
      
      // JPEG: FF D8 FF
      if (signature[0] === 0xFF && signature[1] === 0xD8 && signature[2] === 0xFF) {
        return 'jpg';
      }
      
      // PDF: 25 50 44 46 (%PDF)
      if (signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46) {
        return 'pdf';
      }
      
      // SVG (XML): 3C 3F 78 6D or 3C 73 76 67 (<svg)
      const xmlStart = buffer.toString('utf8', 0, 100).toLowerCase();
      if (xmlStart.includes('<svg') || xmlStart.includes('<?xml')) {
        if (xmlStart.includes('<svg')) return 'svg';
        if (xmlStart.includes('mxgraphmodel') || xmlStart.includes('drawio')) return 'drawio';
      }
    }

    return 'unknown';
  }

  private getMimeType(format: SupportedFormat): string {
    const mimeTypes: Record<SupportedFormat, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'drawio': 'application/xml',
      'vsdx': 'application/vnd.ms-visio.drawing',
      'pdf': 'application/pdf',
      'unknown': 'application/octet-stream'
    };
    return mimeTypes[format];
  }

  private async processDrawioFile(buffer: Buffer): Promise<{ imageBuffer: Buffer; extractedData: any }> {
    return new Promise((resolve, reject) => {
      parseString(buffer.toString('utf8'), async (err, result) => {
        if (err) {
          reject(new Error(`Failed to parse draw.io file: ${err.message}`));
          return;
        }

        try {
          // Extract diagram data
          const extractedData = {
            type: 'drawio',
            elements: this.extractDrawioElements(result),
            metadata: this.extractDrawioMetadata(result)
          };

          // Convert to SVG and then to PNG
          const svgContent = this.convertDrawioToSvg(result);
          const imageBuffer = await this.svgToPng(svgContent);

          resolve({ imageBuffer, extractedData });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async processSvgFile(buffer: Buffer): Promise<{ imageBuffer: Buffer; extractedData: any }> {
    const svgContent = buffer.toString('utf8');
    
    // Extract text and structural information from SVG
    const extractedData = {
      type: 'svg',
      textContent: this.extractSvgText(svgContent),
      elements: this.extractSvgElements(svgContent)
    };

    // Convert SVG to PNG
    const imageBuffer = await this.svgToPng(svgContent);

    return { imageBuffer, extractedData };
  }

  private async processPdfFile(buffer: Buffer): Promise<{ imageBuffer: Buffer; extractedData: any; pageCount: number }> {
    const data = await pdf(buffer);
    
    const extractedData = {
      type: 'pdf',
      text: data.text,
      metadata: data.metadata,
      info: data.info
    };

    // For PDF, we'll convert the first page to an image
    // In a real implementation, you might use pdf2pic or similar
    // For now, we'll create a placeholder image with the text content
    const imageBuffer = await this.createTextImage(data.text.substring(0, 1000));

    return {
      imageBuffer,
      extractedData,
      pageCount: data.numpages
    };
  }

  private extractDrawioElements(data: any): any[] {
    const elements: any[] = [];
    
    try {
      // Navigate the draw.io XML structure to extract shapes and connections
      if (data.mxGraphModel && data.mxGraphModel.root) {
        const cells = data.mxGraphModel.root[0].mxCell || [];
        
        cells.forEach((cell: any) => {
          if (cell.$ && cell.$.value) {
            elements.push({
              id: cell.$.id,
              value: cell.$.value,
              style: cell.$.style,
              geometry: cell.mxGeometry ? cell.mxGeometry[0].$ : null
            });
          }
        });
      }
    } catch (error) {
      logger.warn('Failed to extract draw.io elements', { error });
    }

    return elements;
  }

  private extractDrawioMetadata(data: any): any {
    try {
      if (data.mxGraphModel && data.mxGraphModel.$) {
        return {
          version: data.mxGraphModel.$.version,
          grid: data.mxGraphModel.$.grid,
          gridSize: data.mxGraphModel.$.gridSize,
          page: data.mxGraphModel.$.page
        };
      }
    } catch (error) {
      logger.warn('Failed to extract draw.io metadata', { error });
    }
    return {};
  }

  private convertDrawioToSvg(data: any): string {
    // This is a simplified conversion - in a real implementation,
    // you would use the draw.io rendering engine or a library like mxgraph
    const width = 800;
    const height = 600;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="16" fill="black">
    Draw.io Diagram Converted
  </text>
  <text x="50%" y="60%" text-anchor="middle" font-family="Arial" font-size="12" fill="gray">
    Original diagram structure preserved for AI analysis
  </text>
</svg>`;
  }

  private extractSvgText(svgContent: string): string[] {
    const textElements: string[] = [];
    
    try {
      const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
      const document = dom.window.document;
      
      // Extract text from <text> elements
      const textNodes = document.querySelectorAll('text');
      textNodes.forEach(node => {
        if (node.textContent) {
          textElements.push(node.textContent.trim());
        }
      });
      
      // Extract text from <title> elements
      const titleNodes = document.querySelectorAll('title');
      titleNodes.forEach(node => {
        if (node.textContent) {
          textElements.push(node.textContent.trim());
        }
      });
      
    } catch (error) {
      logger.warn('Failed to extract SVG text', { error });
    }
    
    return textElements.filter(text => text.length > 0);
  }

  private extractSvgElements(svgContent: string): any[] {
    const elements: any[] = [];
    
    try {
      const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
      const document = dom.window.document;
      
      // Extract basic shape information
      const shapes = document.querySelectorAll('rect, circle, ellipse, path, polygon');
      shapes.forEach((shape, index) => {
        elements.push({
          type: shape.tagName,
          id: shape.id || `element-${index}`,
          attributes: Object.fromEntries(
            Array.from(shape.attributes).map(attr => [attr.name, attr.value])
          )
        });
      });
      
    } catch (error) {
      logger.warn('Failed to extract SVG elements', { error });
    }
    
    return elements;
  }

  private async svgToPng(svgContent: string): Promise<Buffer> {
    try {
      return await sharp(Buffer.from(svgContent))
        .png()
        .resize(1024, 768, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to convert SVG to PNG', { error });
      throw error;
    }
  }

  private async createTextImage(text: string): Promise<Buffer> {
    // Create a simple SVG with the text content, then convert to PNG
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject x="20" y="20" width="760" height="560">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 12px; padding: 10px; word-wrap: break-word;">
      ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
  </foreignObject>
</svg>`;

    return await this.svgToPng(svgContent);
  }
}

export const fileProcessor = new FileProcessor();
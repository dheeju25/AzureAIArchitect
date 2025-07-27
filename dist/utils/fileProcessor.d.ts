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
    dimensions?: {
        width: number;
        height: number;
    };
    pageCount?: number;
    hasText?: boolean;
}
export type SupportedFormat = 'png' | 'jpg' | 'jpeg' | 'gif' | 'svg' | 'webp' | 'drawio' | 'vsdx' | 'pdf' | 'unknown';
export declare class FileProcessor {
    processFile(filePath: string, originalName: string): Promise<ProcessedFile>;
    private detectFormat;
    private getMimeType;
    private processDrawioFile;
    private processSvgFile;
    private processPdfFile;
    private extractDrawioElements;
    private extractDrawioMetadata;
    private convertDrawioToSvg;
    private extractSvgText;
    private extractSvgElements;
    private svgToPng;
    private createTextImage;
}
export declare const fileProcessor: FileProcessor;
//# sourceMappingURL=fileProcessor.d.ts.map
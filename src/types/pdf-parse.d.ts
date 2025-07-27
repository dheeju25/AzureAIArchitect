declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    Creator: string;
    Producer: string;
    CreationDate: string;
    ModDate: string;
  }

  interface PDFMetadata {
    [key: string]: any;
  }

  interface PDFResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  }

  function parse(buffer: Buffer, options?: PDFOptions): Promise<PDFResult>;
  
  export = parse;
}
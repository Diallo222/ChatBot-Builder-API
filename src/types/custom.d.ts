declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
    info: any;
  }

  function PDFParse(dataBuffer: Buffer): Promise<PDFData>;
  export default PDFParse;
}

declare module "mammoth" {
  interface ConversionResult {
    value: string;
    messages: any[];
  }

  interface Options {
    buffer: Buffer;
  }

  export function extractRawText(options: Options): Promise<ConversionResult>;
}

declare module 'react-native-html-to-pdf' {
  export interface PDFOptions {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
  }

  export interface PDFFile {
    filePath: string;
    base64?: string;
  }

  interface RNHTMLtoPDFStatic {
    convert(options: PDFOptions): Promise<PDFFile>;
  }

  const RNHTMLtoPDF: RNHTMLtoPDFStatic;
  export default RNHTMLtoPDF;
}

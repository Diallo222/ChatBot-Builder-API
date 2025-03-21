import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const parseFile = async (file: Express.Multer.File): Promise<string> => {
  const fileContent = await fs.readFile(file.path);
  const fileType = file.mimetype;

  switch (fileType) {
    case "application/pdf":
      const pdfData = await pdf(fileContent);
      return pdfData.text;

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      const { value } = await mammoth.extractRawText({ buffer: fileContent });
      return value;

    case "text/plain":
      return fileContent.toString();

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

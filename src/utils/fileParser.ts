import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const parseFile = async (file: Express.Multer.File): Promise<string> => {
  try {
    const fileContent = await fs.readFile(file.path);
    const fileType = file.mimetype;
    // console.log("fileType", fileType);

    let result: string;

    switch (fileType) {
      case "application/pdf":
        const pdfData = await pdf(fileContent);
        result = pdfData.text;
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        const { value } = await mammoth.extractRawText({ buffer: fileContent });
        result = value;
        break;

      case "text/plain":
      case "text/csv":
      case "application/json":
        result = fileContent.toString();
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Clean up the file after processing
    await fs.unlink(file.path);
    return result;
  } catch (error) {
    // Clean up file even if processing fails
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      console.error("Failed to clean up file:", unlinkError);
    }

    throw error instanceof Error ? error : new Error("Failed to parse file");
  }
};

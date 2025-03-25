import axios from "axios";
import openai from "../config/openai.js";
import fs from "fs";
import os from "os";
import path from "path";

interface CloudinaryFile {
  originalname: string;
  path: string;
  size: number;
}

interface UploadResult {
  originalName: string;
  success: boolean;
  fileId: string | null;
  error: {
    message: string;
    code: string;
  } | null;
}

const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB
const AXIOS_TIMEOUT = 30000; // 30 seconds

const downloadToTemp = async (file: CloudinaryFile): Promise<string> => {
  const tempFilePath = path.join(
    os.tmpdir(),
    `${Date.now()}_${file.originalname}`
  );
  const response = await axios.get(file.path, {
    responseType: "stream",
    timeout: AXIOS_TIMEOUT,
  });

  await new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return tempFilePath;
};

const cleanupTempFile = (tempFilePath: string): void => {
  fs.unlink(tempFilePath, (err) => {
    if (err) {
      console.error(`Error deleting temp file ${tempFilePath}:`, err.message);
    }
  });
};

export const uploadAttachmentsToOpenAI = async (
  cloudinaryFiles: CloudinaryFile[]
): Promise<string[]> => {
  if (!Array.isArray(cloudinaryFiles)) {
    throw new Error("Invalid files format - expected array");
  }

  const processFile = async (file: CloudinaryFile): Promise<UploadResult> => {
    const result: UploadResult = {
      originalName: file.originalname,
      success: false,
      fileId: null,
      error: null,
    };

    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File exceeds 512MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      const tempFilePath = await downloadToTemp(file);
      const fileStream = fs.createReadStream(tempFilePath);

      const openaiFile = await openai.files.create({
        file: fileStream,
        purpose: "assistants",
      });

      result.fileId = openaiFile.id;
      result.success = true;

      cleanupTempFile(tempFilePath);
    } catch (error: any) {
      result.error = {
        message: error.message,
        code: error.code || "UPLOAD_ERROR",
      };
      console.error(`Upload failed for ${file.originalname}:`, error.message);
    }

    return result;
  };

  const results = await Promise.all(cloudinaryFiles.map(processFile));
  return results
    .filter((result) => result.fileId)
    .map((result) => result.fileId!) as string[];
};

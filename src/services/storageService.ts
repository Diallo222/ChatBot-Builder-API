import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

export const uploadToStorage = async (
  file: Express.Multer.File
): Promise<string> => {
  try {
    // Convert buffer to stream
    const stream = Readable.from(file.buffer);

    // Create upload stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "avatars",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url || "");
        }
      );

      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export const deleteFromStorage = async (fileUrl: string): Promise<void> => {
  try {
    // Extract public_id from the URL
    const publicId = fileUrl.split("/").slice(-1)[0].split(".")[0];
    await cloudinary.uploader.destroy(`avatars/${publicId}`);
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

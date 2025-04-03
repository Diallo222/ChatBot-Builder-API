import { Request, Response, NextFunction } from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

// Define custom file interface
interface CustomFile extends Express.Multer.File {
  cloudinaryId: string;
  cloudinaryUrl: string;
}

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "knowledge_files",
    resource_type: (req: any, file: Express.Multer.File) => {
      const ext = path.extname(file.originalname).toLowerCase();
      // Text-based files need to use "raw" resource type
      if ([".txt", ".csv", ".md"].includes(ext)) {
        return "raw";
      }
      // For other document types, auto detection works fine
      return "auto";
    },
    // Remove allowed_formats as it's not needed when we specify resource_type correctly
  } as any,
});

// Configure multer
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedFileTypes = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".md",
      ".csv",
      ".xlsx",
    ];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedFileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOC, DOCX, TXT, MD, CSV, and XLSX files are allowed."
        ) as any
      );
    }
  },
});

// Middleware to handle file uploads
export const handleDocumentUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const multerUpload = upload.array("files", 5); // Allow up to 5 files

  multerUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading files",
      });
    }

    try {
      // Add cloudinary properties to the files
      if (req.files) {
        // We'll access the files as they are, without type conflicts
        const files = req.files as Express.Multer.File[];

        // Add cloudinary properties to each file
        files.forEach((file: any) => {
          file.cloudinaryId = file.filename;
          file.cloudinaryUrl = file.path;
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Error processing uploaded files",
      });
    }
  });
};

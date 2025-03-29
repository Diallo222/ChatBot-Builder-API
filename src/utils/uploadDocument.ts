import multer from "multer";
import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import path from "path";
dotenv.config();

// Extend the Params type to include the folder property
interface CustomParams {
  folder: string;
  resource_type: string;
  public_id: (req: Express.Request, file: Express.Multer.File) => string;
  allowed_formats: string[];
}

// Configure Multer Storage for Cloudinary documents
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "document_uploads",
    resource_type: "auto",
    public_id: (req, file) => {
      const ext = path.extname(file.originalname); // Get file extension
      const sanitizedBase = file.originalname
        .replace(ext, "") // Remove extension for sanitization
        .replace(/[^a-zA-Z0-9]/g, "-");
      return `document-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}-${sanitizedBase}${ext}`; // Append extension back
    },
    allowed_formats: ["pdf", "doc", "docx", "txt", "csv", "json"],
  } as CustomParams,
});

// Define allowed MIME types for documents
const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/json",
];

// File filter to allow only document files
const documentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: any
) => {
  const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".csv", ".json"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedDocumentMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type. Allowed types: ${allowedDocumentMimeTypes.join(
          ", "
        )}`
      ),
      false
    );
  }
};

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 10, // Maximum 10 files per upload
  },
});

// Middleware wrapper for better error handling
const handleDocumentUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadDocument.array("files")(req, res, (err) => {
    console.log("files Uploaded", req.files);
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

export default handleDocumentUpload;

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
  format: (
    req: Express.Request,
    file: Express.Multer.File
  ) => string | undefined;
  type: string;
}

// Configure Multer Storage for Cloudinary documents
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "training_documents",
    resource_type: "raw",
    allowed_formats: ["pdf", "doc", "docx", "txt", "csv", "json"],
    format: (req, file) => {
      const ext = path
        .extname(file.originalname)
        .toLowerCase()
        .replace(".", "");
      return ext || undefined;
    },
    public_id: (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const sanitizedBase = file.originalname
        .replace(ext, "")
        .replace(/[^a-zA-Z0-9]/g, "-");
      return `doc-${Date.now()}-${sanitizedBase}${ext}`;
    },
    type: "upload",
  } as unknown as CustomParams,
});

// Define allowed MIME types for documents
const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/json",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/x-csv",
  "application/vnd.ms-excel",
  "text/plain",
];

// File filter to allow only document files
const documentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".csv", ".json"];
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Debugging logs
  // console.log("------------------------------------------------");
  // console.log("File Validation Report:");
  // console.log(`Filename: ${file.originalname}`);
  // console.log(`Detected MIME Type: ${mimeType}`);
  // console.log(`Detected Extension: ${ext}`);

  // Special validation cases
  const isCSVAsText = ext === ".csv" && mimeType === "text/plain";
  const isTextAsCSV = ext === ".txt" && mimeType.startsWith("text/csv");

  // Validation checks
  const isMimeValid = allowedDocumentMimeTypes.some(
    (allowed) => allowed.toLowerCase() === mimeType
  );
  const isExtValid = allowedExtensions.includes(ext);
  const isSpecialCase = isCSVAsText || isTextAsCSV;

  // console.log(`MIME Valid: ${isMimeValid}`);
  // console.log(`Extension Valid: ${isExtValid}`);
  // console.log(`Special Case Valid: ${isSpecialCase}`);

  if (isMimeValid || isExtValid || isSpecialCase) {
    // console.log("✅ File accepted");
    cb(null, true);
  } else {
    // console.log("❌ File rejected");
    cb(new Error(`Unsupported format: ${mimeType} (${ext})`));
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
  uploadDocument.array("files")(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Check if files were actually uploaded to Cloudinary
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files processed by Cloudinary",
      });
    }

    // Verify Cloudinary upload results
    try {
      const cloudinaryResults = await Promise.all(
        (req.files as Express.Multer.File[]).map((file) =>
          cloudinary.api.resource(`training_documents/${file.filename}`, {
            resource_type: "raw",
            type: "upload",
          })
        )
      );
      // console.log("Cloudinary Verification:", cloudinaryResults);
      next();
    } catch (cloudErr) {
      console.error("Cloudinary Verification Failed:", cloudErr);
      return res.status(500).json({
        success: false,
        message: "File uploaded but Cloudinary processing failed",
      });
    }
  });
};

export default handleDocumentUpload;

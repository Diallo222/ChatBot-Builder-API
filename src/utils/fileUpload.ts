import multer from "multer";
import cloudinary from "../config/cloudinary";

// Modify storage to use memory storage instead of disk
const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PNG, JPG, GIF, and PDF files are allowed."
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadFiles = async (files: Express.Multer.File[]) => {
  const uploadPromises = files.map(async (file) => {
    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
    });

    return {
      filename: file.originalname,
      path: result.secure_url,
      mimetype: file.mimetype,
      public_id: result.public_id,
    };
  });

  return Promise.all(uploadPromises);
};

export const uploadFilesMiddleware = async (req: any, res: any, next: any) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const uploadedFiles = await uploadFiles(req.files);
    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

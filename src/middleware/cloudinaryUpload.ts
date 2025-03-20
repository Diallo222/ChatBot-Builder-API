import multer from "multer";
import { Request } from "express";
import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    public_id: (req: Request, file: Express.Multer.File): string =>
      `avatars/${file.originalname}`,
    // resource_type: "auto" as unknown as string, // Use type assertion here
    // allowed_formats: ["jpg", "jpeg", "png"],
    // transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const cloudinaryUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
});

export default cloudinaryUpload;

import { Request } from "express";
import { Multer } from "multer";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
      };
      user?: any;
      file?: any;
      files?: any;
      csrfToken(): string;
    }
    interface Multer extends Multer {}
  }
}

export {};

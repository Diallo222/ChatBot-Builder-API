import mongoose from "mongoose";
import { Admin } from "../models/Admin";
import dotenv from "dotenv";

dotenv.config();

const createDefaultAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);

    const defaultAdmin = new Admin({
      email: "admin@example.com",
      password: "12345678", // This will be hashed automatically
    });

    await defaultAdmin.save();
    console.log("Default admin created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating default admin:", error);
    process.exit(1);
  }
};

createDefaultAdmin();

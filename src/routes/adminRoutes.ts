import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin";
import User from "../models/User";
import Avatar from "../models/Avatar";
import { auth } from "../middleware/auth";
import cloudinaryUpload from "../middleware/cloudinaryUpload";

const router = express.Router();

// Admin login
const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update admin credentials
const updateCredentials = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (email) admin.email = email;
    if (password) admin.password = password;

    await admin.save();
    res.json({ message: "Admin credentials updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users
const getAllUsers = async (req: express.Request, res: express.Response) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "userId",
          as: "projects",
        },
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          subscriptionPlan: 1,
          createdAt: 1,
          projectCount: { $size: "$projects" },
        },
      },
    ]);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Avatar management
const getAvatars = async (req: express.Request, res: express.Response) => {
  try {
    const avatars = await Avatar.find();
    res.json(avatars);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const createAvatar = async (req: express.Request, res: express.Response) => {
  try {
    const avatar = new Avatar({
      imageUrl: req.file.path,
    });
    await avatar.save();
    res.status(201).json(avatar);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateAvatar = async (req: express.Request, res: express.Response) => {
  try {
    const avatar = await Avatar.findByIdAndUpdate(
      req.params.id,
      { imageUrl: req.file.path },
      { new: true }
    );
    res.json(avatar);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAvatar = async (req: express.Request, res: express.Response) => {
  try {
    await Avatar.findByIdAndDelete(req.params.id);
    res.json({ message: "Avatar deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Route definitions
router.post("/login", login);
router.put("/update", auth, updateCredentials);
router.get("/users", auth, getAllUsers);
router.get("/avatars", auth, getAvatars);
router.post("/avatars", auth, cloudinaryUpload.single("image"), createAvatar);
router.put(
  "/avatars/:id",
  auth,
  cloudinaryUpload.single("image"),
  updateAvatar
);
router.delete("/avatars/:id", auth, deleteAvatar);

export default router;

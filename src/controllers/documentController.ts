import express from "express";
import Document from "../models/Document";

export const getDocument = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { type } = req.params;

    if (type !== "privacy-policy" && type !== "terms-conditions") {
      return res.status(400).json({ message: "Invalid document type" });
    }

    const document = await Document.findOne({ type });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Update document
export const updateDocument = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { type } = req.params;
    const { content } = req.body;

    if (type !== "privacy-policy" && type !== "terms-conditions") {
      return res.status(400).json({ message: "Invalid document type" });
    }

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const document = await Document.findOneAndUpdate(
      { type },
      { content },
      { new: true, upsert: true }
    );

    res.json({ message: "Document updated successfully", document });
  } catch (error) {
    console.error("Update document error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Public: Get document by type
export const getPublicDocument = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { type } = req.params;

    if (type !== "privacy-policy" && type !== "terms-conditions") {
      return res.status(400).json({ message: "Invalid document type" });
    }

    const document = await Document.findOne({ type });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json({ content: document.content, updatedAt: document.updatedAt });
  } catch (error) {
    console.error("Get public document error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

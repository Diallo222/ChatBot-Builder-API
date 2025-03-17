import { Request, Response } from "express";
import Conversation, { IMessage } from "../models/Conversation";
import { generateResponse } from "../services/aiTrainingService";

export const startConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId, visitorInfo } = req.body;

    const conversation = await Conversation.create({
      project: projectId,
      visitor: visitorInfo,
      messages: [],
      startedAt: new Date(),
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Start conversation error:", error);
    res.status(500).json({
      message: "Error starting conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { message } = req.body;
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    // Add user message
    const userMessage: IMessage = {
      sender: "user",
      content: message,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Generate AI response
    const response = await generateResponse(
      conversation.project.toString(),
      message,
      conversation.messages.map((msg) => ({
        role: msg.sender,
        content: msg.content,
      }))
    );

    // Add AI response
    const aiMessage: IMessage = {
      sender: "bot",
      content: response,
      timestamp: new Date(),
    };
    conversation.messages.push(aiMessage);

    await conversation.save();
    res.json(aiMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      message: "Error sending message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getConversationHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const conversations = await Conversation.find({ project: projectId })
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Conversation.countDocuments({ project: projectId });

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get conversation history error:", error);
    res.status(500).json({
      message: "Error fetching conversation history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

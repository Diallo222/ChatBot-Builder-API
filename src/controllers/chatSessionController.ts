import OpenAI from "openai";
import { Request, Response } from "express";
import ChatSession from "../models/ChatSession";
import Project from "../models/Project";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getChatSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10, startDate, endDate, status } = req.query;

    // Delete sessions with no messages
    await ChatSession.deleteMany({
      project: projectId,
      $or: [{ messages: { $size: 0 } }, { messages: { $exists: false } }],
    });

    const query: any = {
      project: projectId,
      messages: { $exists: true, $ne: [] }, // Only return sessions with messages
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate as string);
      if (endDate) query.startedAt.$lte = new Date(endDate as string);
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [sessions, total] = await Promise.all([
      ChatSession.find(query)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-metadata.ipAddress"), // Exclude sensitive data

      ChatSession.countDocuments(query),
    ]);

    res.json({
      sessions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get chat sessions error:", error);
    res.status(500).json({
      message: "Error fetching chat sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getChatSessionDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId).select(
      "-metadata.ipAddress"
    ); // Exclude sensitive data

    if (!session) {
      res.status(404).json({ message: "Chat session not found" });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error("Get chat session details error:", error);
    res.status(500).json({
      message: "Error fetching chat session details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getChatSessionStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    const query: any = { project: projectId };

    // Add date range filter if provided
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate as string);
      if (endDate) query.startedAt.$lte = new Date(endDate as string);
    }

    const stats = await ChatSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          averageDuration: { $avg: "$duration" },
          totalMessages: { $sum: "$messagesCount" },
          completedSessions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          abandonedSessions: {
            $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] },
          },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalSessions: 0,
        averageDuration: 0,
        totalMessages: 0,
        completedSessions: 0,
        abandonedSessions: 0,
      }
    );
  } catch (error) {
    console.error("Get chat session stats error:", error);
    res.status(500).json({
      message: "Error fetching chat session stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createChatSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;

    // Get project and its assistantId
    const project = await Project.findById(projectId).select("assistantId");

    if (!project?.assistantId) {
      res
        .status(400)
        .json({ message: "No assistant configured for this project" });
      return;
    }

    // Create a new thread
    const thread = await openai.beta.threads.create();

    const chatSession = await ChatSession.create({
      project: projectId,
      threadId: thread.id,
      assistantId: project.assistantId,
      startedAt: new Date(),
      status: "active",
      messagesCount: 0,
      messages: [],
      metadata: {
        userAgent: req.headers["user-agent"],
        device: req.headers["sec-ch-ua-platform"],
        browser: req.headers["sec-ch-ua"],
      },
    });
    res.status(201).json(chatSession);
  } catch (error) {
    console.error("Create chat session error:", error);
    res.status(500).json({
      message: "Error creating chat session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: "Chat session not found" });
      return;
    }

    // Add user message to OpenAI thread
    const userMessage = await openai.beta.threads.messages.create(
      session.threadId,
      { role: "user", content: message }
    );

    // Run the assistant
    const run = await openai.beta.threads.runs.create(session.threadId, {
      assistant_id: session.assistantId,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(
      session.threadId,
      run.id
    );

    while (
      runStatus.status === "queued" ||
      runStatus.status === "in_progress"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(
        session.threadId,
        run.id
      );
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(session.threadId);

    // Get only the assistant's response (first message in the list is the most recent)
    const assistantMessage = messages.data[0];
    const messageContent = {
      role: assistantMessage.role,
      content:
        assistantMessage.content[0].type === "text"
          ? (
              assistantMessage.content[0] as {
                type: "text";
                text: { value: string };
              }
            ).text.value
          : "Non-text content",
      timestamp: new Date(assistantMessage.created_at * 1000),
      messageId: assistantMessage.id,
    };

    // Update the chat session with both messages
    const updatedMessages = messages.data.slice(0, 2).map((msg) => ({
      role: msg.role,
      content:
        msg.content[0].type === "text"
          ? (msg.content[0] as { type: "text"; text: { value: string } }).text
              .value
          : "Non-text content",
      timestamp: new Date(msg.created_at * 1000),
      messageId: msg.id,
    }));

    await ChatSession.findByIdAndUpdate(sessionId, {
      $push: { messages: { $each: updatedMessages } },
      $inc: { messagesCount: updatedMessages.length },
    });

    res.status(200).json({
      assistantResponse: messageContent,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      message: "Error sending message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

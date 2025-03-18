import { Request, Response } from "express";
import ChatSession from "../models/ChatSession";

export const getChatSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10, startDate, endDate, status } = req.query;

    const query: any = { project: projectId };

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

import { Request, Response } from "express";
import Analytics from "../models/Analytics";
import { generateAnalytics } from "../services/analyticsService";

export const getAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate date parameters
    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
    const end = endDate ? new Date(endDate as string) : new Date();

    // Generate analytics if they don't exist
    await generateAnalytics(projectId, start, end);

    // Fetch analytics
    const analytics = await Analytics.findOne({
      project: projectId,
      "period.start": start,
      "period.end": end,
    });

    res.json(analytics);
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      message: "Error fetching analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;

    // Get analytics for last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    await generateAnalytics(projectId, startDate, endDate);

    const analytics = await Analytics.findOne({
      project: projectId,
      "period.start": startDate,
      "period.end": endDate,
    });

    if (!analytics) {
      res.status(404).json({ message: "Analytics not found" });
      return;
    }

    // Calculate daily average
    const dailyAverage = analytics.metrics.totalConversations / 7;

    res.json({
      overview: {
        totalConversations: analytics.metrics.totalConversations,
        totalMessages: analytics.metrics.totalMessages,
        averageResponseTime: analytics.metrics.averageResponseTime,
        dailyAverage,
        averageConversationLength: analytics.metrics.averageConversationLength,
      },
      messageDistribution: analytics.metrics.messageDistribution,
      popularTopics: analytics.metrics.popularTopics,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      message: "Error fetching dashboard stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

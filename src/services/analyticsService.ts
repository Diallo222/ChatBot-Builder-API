import Analytics from "../models/Analytics";
import Conversation from "../models/Conversation";

export const generateAnalytics = async (
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<void> => {
  try {
    // Get conversations for the period
    const conversations = await Conversation.find({
      project: projectId,
      startedAt: { $gte: startDate, $lte: endDate },
    });

    // Calculate metrics
    const metrics = calculateMetrics(conversations);

    // Create or update analytics
    await Analytics.findOneAndUpdate(
      {
        project: projectId,
        "period.start": startDate,
        "period.end": endDate,
      },
      { metrics },
      { upsert: true }
    );
  } catch (error) {
    console.error("Generate analytics error:", error);
    throw error;
  }
};

const calculateMetrics = (conversations: any[]) => {
  const totalConversations = conversations.length;
  let totalMessages = 0;
  let totalResponseTime = 0;
  let responseTimes = 0;
  const topics = new Map<string, number>();
  const messageDistribution = { user: 0, assistant: 0 };

  conversations.forEach((conv) => {
    // Count messages and distribution
    conv.messages.forEach((msg: any, i: number) => {
      totalMessages++;
      messageDistribution[msg.sender]++;

      // Calculate response times for assistant messages
      if (i > 0 && msg.sender === "assistant") {
        const responseTime =
          msg.timestamp.getTime() - conv.messages[i - 1].timestamp.getTime();
        totalResponseTime += responseTime;
        responseTimes++;
      }

      // Extract topics (simple keyword extraction)
      const words = msg.content
        .toLowerCase()
        .split(" ")
        .filter((word: string) => word.length > 4);

      words.forEach((word: string) => {
        topics.set(word, (topics.get(word) || 0) + 1);
      });
    });
  });

  // Calculate average conversation length
  const averageConversationLength =
    totalConversations > 0 ? totalMessages / totalConversations : 0;

  // Format popular topics
  const popularTopics = Array.from(topics.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalConversations,
    totalMessages,
    averageResponseTime:
      responseTimes > 0 ? totalResponseTime / responseTimes : 0,
    popularTopics,
    messageDistribution,
    averageConversationLength,
  };
};

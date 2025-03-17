import { OpenAI } from "openai";
import { IProject } from "../models/Project";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TrainingData {
  websiteContent: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export const trainChatbot = async (project: IProject): Promise<void> => {
  try {
    // Gather training data from selected pages and FAQs
    const trainingData = getTrainingData(project);

    // Create initial system message with context
    const systemMessage = createSystemMessage(project, trainingData);

    // Store the training data in vector database or similar
    await storeTrainingData(
      project._id.toString(),
      systemMessage,
      trainingData
    );
  } catch (error) {
    console.error("Training error:", error);
    throw error;
  }
};

export const generateResponse = async (
  projectId: string,
  message: string,
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = []
): Promise<string> => {
  try {
    // Get project context and training data
    const context = await getProjectContext(projectId);

    const messages = [
      { role: "system", content: context },
      ...conversationHistory,
      { role: "user", content: message },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      completion.choices[0]?.message?.content ||
      "I apologize, but I cannot generate a response at the moment."
    );
  } catch (error) {
    console.error("Response generation error:", error);
    throw error;
  }
};

const getTrainingData = (project: IProject): TrainingData => {
  const websiteContent =
    project.scrapedPages
      ?.filter((page) => page.selected)
      .map((page) => page.content || "")
      .filter((content) => content.length > 0) || [];

  return {
    websiteContent,
    faqs: project.customFaqs || [],
  };
};

const createSystemMessage = (
  project: IProject,
  trainingData: TrainingData
): string => {
  return `
You are an AI chatbot assistant for ${project.name}. 
Your responses should be helpful, concise, and friendly.

Website Content:
${trainingData.websiteContent.join("\n\n")}

Frequently Asked Questions:
${trainingData.faqs
  .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
  .join("\n\n")}

Remember to:
1. Provide accurate information based on the training data
2. Be polite and professional
3. Admit when you don't know something
4. Keep responses concise and relevant
5. Maintain a consistent tone
`;
};

// Mock implementation - replace with actual vector database
const storeTrainingData = async (
  projectId: string,
  systemMessage: string,
  trainingData: TrainingData
): Promise<void> => {
  // TODO: Implement vector database storage
  console.log(`Storing training data for project ${projectId}`);
};

const getProjectContext = async (projectId: string): Promise<string> => {
  // TODO: Implement retrieval from vector database
  // For now, return a basic context
  return `You are an AI chatbot assistant. Please provide helpful and accurate information.`;
};

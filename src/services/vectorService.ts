import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Pinecone } from "@pinecone-database/pinecone";

// Initialize Pinecone client with the correct configuration
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

// Get the index
const index = pinecone.Index(process.env.PINECONE_INDEX as string);

export const prepareTrainingData = async (
  projectId: string,
  websiteContent: string[],
  faqs: Array<{ question: string; answer: string }>
): Promise<Document[]> => {
  try {
    const combinedContent = [
      ...websiteContent,
      ...faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`),
    ].join("\n\n");

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.createDocuments(
      [combinedContent],
      [
        {
          projectId,
          source: "training",
          timestamp: new Date().toISOString(),
        },
      ]
    );

    return docs;
  } catch (error) {
    console.error("Error preparing training data:", error);
    throw error;
  }
};

export const storeVectors = async (
  projectId: string,
  documents: Document[]
): Promise<void> => {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    await PineconeStore.fromDocuments(documents, embeddings, {
      pineconeIndex: index,
      namespace: projectId,
    });
  } catch (error) {
    console.error("Error storing vectors:", error);
    throw error;
  }
};

export const searchSimilarContent = async (
  projectId: string,
  query: string,
  limit: number = 3
): Promise<Document[]> => {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: projectId,
    });

    const results = await vectorStore.similaritySearch(query, limit);
    return results;
  } catch (error) {
    console.error("Error searching similar content:", error);
    throw error;
  }
};

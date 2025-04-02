import OpenAI from "openai";
import { Readable } from "stream";
import { uploadToStorage } from "./storageService";
import fal from "../config/falConfig";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateAvatarOptions {
  prompt: string;
  referenceImage?: Express.Multer.File;
  style?: "natural" | "vivid";
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  seed?: number;
}

export const generateAIAvatar = async (
  options: GenerateAvatarOptions
): Promise<string> => {
  try {
    let finalPrompt = options.prompt;

    // If reference image is provided, create a variation-based prompt
    if (options.referenceImage) {
      finalPrompt = await createPromptWithReference(
        options.prompt,
        options.referenceImage
      );
    }

    // Generate image using Fal
    const response = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt: enhancePrompt(finalPrompt),

        seed: options.seed,
      },
    });
    // console.log("response", response.data);
    const imageUrl = response.data.images[0].url;
    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Create a file object for storage service
    const file: Express.Multer.File = {
      buffer,
      mimetype: "image/png",
      originalname: "ai-generated-avatar.png",
      fieldname: "image",
      encoding: "7bit",
      size: buffer.length,
      stream: Readable.from(buffer),
      destination: "",
      filename: "",
      path: "",
    };

    // Upload to storage (Cloudinary)
    const storedImageUrl = await uploadToStorage(file);
    return storedImageUrl;
  } catch (error) {
    console.error("AI Avatar generation error:", error);
    throw error;
  }
};

// Helper function to enhance the prompt for better avatar generation
const enhancePrompt = (basePrompt: string): string => {
  return `Create a professional avatar image: ${basePrompt}. 
    The image should be high quality, suitable for a business chatbot avatar, 
    with clean lines and professional appearance. 
    Ensure the image is centered and well-composed.`;
};

// Helper function to create a prompt that incorporates reference image
const createPromptWithReference = async (
  prompt: string,
  referenceImage: Express.Multer.File
): Promise<string> => {
  try {
    // Use the existing Cloudinary URL directly
    const imageUrl = referenceImage.path;

    // Get image description using GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe the key visual elements of this image that would be relevant for creating a similar but unique avatar.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    const imageDescription = response.choices[0]?.message?.content || "";

    // Combine original prompt with reference image description
    return `${prompt}. Reference style elements: ${imageDescription}`;
  } catch (error) {
    console.error("Error processing reference image:", error);
    return prompt; // Fallback to original prompt if reference processing fails
  }
};

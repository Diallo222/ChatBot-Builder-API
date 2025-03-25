import { Request, Response } from "express";
import Project from "../models/Project";
import openai from "../config/openai";
import { parseFile } from "../utils/fileParser"; // You'll need to implement this
import { ICustomFaq, IProcessedFile, IKnowledgefiles } from "../models/Project";
import * as fs from "fs";
import { uploadAttachmentsToOpenAI } from "../services/attachementService";

interface TrainingRequestBody {
  knowledgefiles?: Express.Multer.File[];
  customFaqs?: ICustomFaq[];
}

export const trainProjectAI = async (
  req: Request<{ projectId: string }, {}, TrainingRequestBody>,
  res: Response
): Promise<void> => {
  // let uploadedFileIds: string[] = [];
  let project: any;
  try {
    const { projectId } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];
    console.log("files GGG", files);
    let customFaqs = req.body.customFaqs;

    // Parse customFaqs if it's a string
    if (typeof customFaqs === "string") {
      try {
        customFaqs = JSON.parse(customFaqs) as ICustomFaq[];
      } catch (e) {
        res.status(400).json({ message: "Invalid customFaqs format" });
        return;
      }
    }

    // Validate customFaqs structure
    if (customFaqs && !Array.isArray(customFaqs)) {
      res.status(400).json({ message: "customFaqs must be an array" });
      return;
    }

    // Add additional validation
    if (
      customFaqs?.some((faq) => !faq.question?.trim() || !faq.answer?.trim())
    ) {
      res
        .status(400)
        .json({ message: "All FAQs must have non-empty question and answer" });
      return;
    }

    // Find the project
    project = await Project.findOne({
      _id: projectId,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Update training status
    project.training.status = "processing";
    await project.save();

    // 6. Process files content
    let processedFiles: IKnowledgefiles | undefined;
    if (files.length > 0) {
      console.log("files MAPPING", files);
      processedFiles = {
        name: "Training Batch",
        description: "Knowledge files for AI training",
        files: files.map((file, index) => ({
          content: file.path,
          cloudinaryUrl: files[index].path,
          // openAiFileId: uploadedFileIds[index],
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 7. Process FAQs
    const validFaqs =
      customFaqs
        ?.filter((faq): faq is ICustomFaq =>
          Boolean(faq.question?.trim() && faq.answer?.trim())
        )
        .map(({ question, answer }) => ({ question, answer })) || [];

    // 8. Get all existing file IDs from knowledge files
    const existingFileIds = project.knowledgefiles.flatMap((kf) =>
      kf.files.map((f) => f.openAiFileId).filter(Boolean)
    ) as string[];

    const trainingContent = [
      ...project.knowledgefiles.flatMap((kf) => kf.files),
      ...project.customFaqs.map(
        (faq) => `Q: ${faq.question}\nA: ${faq.answer}`
      ),
    ].join("\n\n");
    const scrapedInstructions = project.scrapedPages
      .filter((page) => page)
      .map((page) => `Content from ${page.url}:\n${page.content}`)
      .join("\n\n");

    // Update or create OpenAI assistant
    let assistant: any;
    if (project.assistantId) {
      // Update existing assistant
      assistant = await openai.beta.assistants.update(project.assistantId, {
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4-turbo-preview",
        // fileIds: allFileIds, // temporary type assertion
      });
    } else {
      // Create new assistant
      assistant = await openai.beta.assistants.create({
        name: `${project.name} Assistant`,
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4-turbo-preview",
        // fileIds: allFileIds, // temporary type assertion
      });
      project.assistantId = assistant.id;
    }

    if (processedFiles) {
      project.knowledgefiles.push(processedFiles);
    }

    if (validFaqs.length > 0) {
      project.customFaqs = [...(project.customFaqs || []), ...validFaqs];
    }

    // Update project status
    project.training.status = "completed";
    project.training.lastTrainedAt = new Date();
    await project.save();

    res.json({
      message: "AI training completed successfully",
      training: project.training,
    });
  } catch (error) {
    console.log("project", error);
    res.status(500).json({
      message: "Training failed",
      error: project.training.error,
    });
    return;
  }
};

export const getTrainingStatus = async (
  req: Request<{ projectId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    console.log("project", project.knowledgefiles, project.customFaqs);
    res.status(200).json({
      training: project.training,
      knowledgefiles: project.knowledgefiles,
      customFaqs: project.customFaqs,
    });
  } catch (error) {
    console.error("Get training status error:", error);
    res.status(500).json({
      message: "Error fetching training status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

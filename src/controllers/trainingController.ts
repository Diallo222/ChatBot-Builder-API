import { Request, Response } from "express";
import Project from "../models/Project";
import openai from "../config/openai";
import { parseFile } from "../utils/fileParser"; // You'll need to implement this
import { ICustomFaq, IKnowledgefiles } from "../models/Project";

interface TrainingRequestBody {
  knowledgefiles?: Express.Multer.File[];
  customFaqs?: ICustomFaq[];
}

export const trainProjectAI = async (
  req: Request<{ projectId: string }, {}, TrainingRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const files = req.files as Express.Multer.File[];
    let customFaqs = req.body.customFaqs;

    // Parse customFaqs if it's a string
    if (typeof customFaqs === "string") {
      try {
        customFaqs = JSON.parse(customFaqs);
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

    // Find the project
    const project = await Project.findOne({
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

    try {
      // Process knowledge files
      if (files?.length) {
        const processedFiles: IKnowledgefiles = {
          name: "Training Batch",
          description: "Knowledge files for AI training",
          files: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Parse and process each file
        for (const file of files) {
          const content = await parseFile(file);
          processedFiles.files.push(content);
        }

        // Add to project's knowledge files
        project.knowledgefiles.push(processedFiles);
      }

      // Process custom FAQs
      if (customFaqs?.length) {
        // Validate each FAQ object and remove _id fields
        const validFaqs = customFaqs
          .filter(
            (faq: ICustomFaq) =>
              faq &&
              typeof faq === "object" &&
              typeof faq.question === "string" &&
              typeof faq.answer === "string"
          )
          .map(({ question, answer }) => ({ question, answer })); // Only keep question and answer fields

        project.customFaqs = [...(project.customFaqs || []), ...validFaqs];
      }

      // Prepare training content
      const trainingContent = [
        ...project.knowledgefiles.flatMap((kf) => kf.files),
        ...project.customFaqs.map(
          (faq) => `Q: ${faq.question}\nA: ${faq.answer}`
        ),
      ].join("\n\n");

      // Update or create OpenAI assistant
      let assistant;
      if (project.assistantId) {
        // Update existing assistant
        assistant = await openai.beta.assistants.update(project.assistantId, {
          instructions: `You are a helpful AI assistant. Use the following knowledge to answer questions:\n\n${trainingContent}`,
          model: "gpt-4-turbo-preview",
        });
      } else {
        // Create new assistant
        assistant = await openai.beta.assistants.create({
          name: `${project.name} Assistant`,
          instructions: `You are a helpful AI assistant. Use the following knowledge to answer questions:\n\n${trainingContent}`,
          model: "gpt-4-turbo-preview",
        });
        project.assistantId = assistant.id;
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
      // Handle training error
      project.training.status = "failed";
      project.training.error =
        error instanceof Error ? error.message : "Unknown error";
      await project.save();

      throw error;
    }
  } catch (error) {
    console.error("AI training error:", error);
    res.status(500).json({
      message: "Error training AI assistant",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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

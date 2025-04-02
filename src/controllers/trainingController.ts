import { Request, Response } from "express";
import Project from "../models/Project";
import openai from "../config/openai";
import { ICustomFaq } from "../models/Project";

interface TrainingRequestBody {
  knowledgefiles?: Express.Multer.File[];
  customFaqs?: ICustomFaq[];
}

export const trainProjectAI = async (
  req: Request<{ projectId: string }, {}, TrainingRequestBody>,
  res: Response
): Promise<void> => {
  let project: any;

  try {
    const { projectId } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];
    let customFaqs = req.body.customFaqs;

    // Parse customFaqs if it's a string
    if (typeof customFaqs === "string") {
      try {
        customFaqs = JSON.parse(customFaqs) as ICustomFaq[];
      } catch (e) {
        console.log("customFaqs ERROR", e);
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
    if (files.length > 0) {
      const processedFiles = files.map((file) => ({
        content: file.originalname,
        path: file.path,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      project.knowledgefiles.push(...processedFiles);
    }

    // 7. Process FAQs
    const validFaqs =
      customFaqs
        ?.filter((faq): faq is ICustomFaq =>
          Boolean(faq.question?.trim() && faq.answer?.trim())
        )
        .map(({ question, answer }) => ({ question, answer })) || [];

    const trainingContent = [
      ...project.knowledgefiles.map((kf) => kf.content),
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
        model: "gpt-4o-mini",
      });
    } else {
      // Create new assistant
      assistant = await openai.beta.assistants.create({
        name: `${project.name} Assistant`,
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4o-mini",
      });
      project.assistantId = assistant.id;
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
    // console.log("project", project.knowledgefiles, project.customFaqs);
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

export const updateKnowledgeFile = async (
  req: Request<
    { projectId: string; knowledgeFileId: string },
    {},
    { name?: string; description?: string }
  >,
  res: Response
): Promise<void> => {
  // console.log("updateKnowledgeFile", req.body);
  try {
    const { projectId, knowledgeFileId } = req.params;
    const { name, description } = req.body;

    const project = await Project.findOneAndUpdate(
      {
        _id: projectId,
        owner: req.user!.id,
        "knowledgefiles._id": knowledgeFileId,
      },
      {
        $set: {
          "knowledgefiles.$.name": name,
          "knowledgefiles.$.description": description,
          "knowledgefiles.$.updatedAt": new Date(),
        },
      },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ message: "Project or knowledge file not found" });
      return;
    }

    const updatedKnowledgeFile = project.knowledgefiles.find(
      (kf) => kf._id?.toString() === knowledgeFileId
    );
    res.json(updatedKnowledgeFile);
  } catch (error) {
    console.log("updateKnowledgeFile", error);
    console.error("Update knowledge file error:", error);
    res.status(500).json({
      message: "Error updating knowledge file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteKnowledgeFile = async (
  req: Request<{ projectId: string; knowledgeFileId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { projectId, knowledgeFileId } = req.params;

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { knowledgefiles: { _id: knowledgeFileId } } },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ message: "Project or knowledge file not found" });
      return;
    }

    res.json({ message: "Knowledge file deleted successfully" });
  } catch (error) {
    console.error("Delete knowledge file error:", error);
    res.status(500).json({
      message: "Error deleting knowledge file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateCustomFaq = async (
  req: Request<{ projectId: string; faqId: string }, {}, ICustomFaq>,
  res: Response
): Promise<void> => {
  try {
    const { projectId, faqId } = req.params;
    const { question, answer } = req.body;

    if (!question?.trim() || !answer?.trim()) {
      res.status(400).json({ message: "Question and answer are required" });
      return;
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: projectId,
        owner: req.user!.id,
        "customFaqs._id": faqId,
      },
      {
        $set: {
          "customFaqs.$.question": question,
          "customFaqs.$.answer": answer,
        },
      },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ message: "Project or FAQ not found" });
      return;
    }

    // Update assistant with new FAQ content
    const trainingContent = [
      ...project.knowledgefiles.map((kf) => kf.content),
      ...project.customFaqs.map(
        (faq) => `Q: ${faq.question}\nA: ${faq.answer}`
      ),
    ].join("\n\n");
    const scrapedInstructions = project.scrapedPages
      .filter((page) => page)
      .map((page) => `Content from ${page.url}:\n${page.content}`)
      .join("\n\n");

    if (project.assistantId) {
      await openai.beta.assistants.update(project.assistantId, {
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4o-mini",
      });
    }

    const updatedFaq = project.customFaqs.find(
      (faq) => faq._id?.toString() === faqId
    );
    res.json(updatedFaq);
  } catch (error) {
    console.error("Update FAQ error:", error);
    res.status(500).json({
      message: "Error updating FAQ",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteCustomFaq = async (
  req: Request<{ projectId: string; faqId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { projectId, faqId } = req.params;

    const project = await Project.findOneAndUpdate(
      {
        _id: projectId,
        owner: req.user!.id,
        "customFaqs._id": faqId,
      },
      { $pull: { customFaqs: { _id: faqId } } },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ message: "Project or FAQ not found" });
      return;
    }

    // Update assistant after FAQ deletion
    const trainingContent = [
      ...project.knowledgefiles.map((kf) => kf.content),
      ...project.customFaqs.map(
        (faq) => `Q: ${faq.question}\nA: ${faq.answer}`
      ),
    ].join("\n\n");
    const scrapedInstructions = project.scrapedPages
      .filter((page) => page)
      .map((page) => `Content from ${page.url}:\n${page.content}`)
      .join("\n\n");

    if (project.assistantId) {
      await openai.beta.assistants.update(project.assistantId, {
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4o-mini",
      });
    }

    res.json({ message: "FAQ deleted successfully" });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    res.status(500).json({
      message: "Error deleting FAQ",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const addKnowledgeFile = async (
  req: Request<{ projectId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      res.status(400).json({ message: "No files provided" });
      return;
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const processedFiles = files.map((file) => ({
      content: file.originalname,
      path: file.path,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    project.knowledgefiles.push(...processedFiles);
    await project.save();

    // Update assistant with new knowledge files
    const trainingContent = [
      ...project.knowledgefiles.map((kf) => kf.content),
      ...project.customFaqs.map(
        (faq) => `Q: ${faq.question}\nA: ${faq.answer}`
      ),
    ].join("\n\n");
    const scrapedInstructions = project.scrapedPages
      .filter((page) => page)
      .map((page) => `Content from ${page.url}:\n${page.content}`)
      .join("\n\n");

    if (project.assistantId) {
      await openai.beta.assistants.update(project.assistantId, {
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4o-mini",
      });
    }

    res.status(201).json({
      message: "Knowledge files added successfully",
      knowledgefiles: processedFiles,
    });
  } catch (error) {
    console.error("Add knowledge file error:", error);
    res.status(500).json({
      message: "Error adding knowledge file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const addCustomFaq = async (
  req: Request<{ projectId: string }, {}, { customFaqs: ICustomFaq[] }>,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { customFaqs } = req.body;

    if (!Array.isArray(customFaqs)) {
      res.status(400).json({ message: "customFaqs must be an array" });
      return;
    }

    if (
      customFaqs.some((faq) => !faq.question?.trim() || !faq.answer?.trim())
    ) {
      res.status(400).json({
        message: "All FAQs must have non-empty question and answer",
      });
      return;
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const validFaqs = customFaqs.map(({ question, answer }) => ({
      question: question.trim(),
      answer: answer.trim(),
    }));

    project.customFaqs.push(...validFaqs);
    await project.save();

    // Update assistant with new FAQs
    const trainingContent = [
      ...project.knowledgefiles.map((kf) => kf.content),
      ...project.customFaqs.map(
        (faq) => `Q: ${faq.question}\nA: ${faq.answer}`
      ),
    ].join("\n\n");
    const scrapedInstructions = project.scrapedPages
      .filter((page) => page)
      .map((page) => `Content from ${page.url}:\n${page.content}`)
      .join("\n\n");

    if (project.assistantId) {
      await openai.beta.assistants.update(project.assistantId, {
        instructions: `You are a helpful AI assistant for the website ${project.websiteUrl}. Use the following content to answer questions:\n\n${scrapedInstructions}, and the following knowledge:\n\n${trainingContent}`,
        model: "gpt-4o-mini",
      });
    }

    res.status(201).json({
      message: "Custom FAQs added successfully",
      customFaqs: validFaqs,
    });
  } catch (error) {
    console.error("Add custom FAQ error:", error);
    res.status(500).json({
      message: "Error adding custom FAQs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

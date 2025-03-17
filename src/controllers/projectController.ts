import { Request, Response } from "express";
import Project from "../models/Project";
import User from "../models/User";
import { scrapeWebsite } from "../services/webScraper";
import { IPlan } from "../models/Plan";

export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description, websiteUrl } = req.body;
    const userId = req.user!.id;

    // Check user's subscription and project limits
    const user = await User.findById(userId).populate<{
      subscription: { plan: IPlan };
    }>("subscription.plan");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Count user's existing projects
    const projectCount = await Project.countDocuments({ owner: userId });
    const avatarLimit = user.subscription.plan.avatarLimit;

    if (projectCount >= avatarLimit) {
      res.status(403).json({
        message: "Project limit reached for your subscription plan",
      });
      return;
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      owner: userId,
      websiteUrl,
    });

    // If website URL is provided, start scraping
    if (websiteUrl) {
      const scrapedPages = await scrapeWebsite(websiteUrl);
      project.scrapedPages = scrapedPages;
      await project.save();
    }

    res.status(201).json(project);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      message: "Error creating project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const projects = await Project.find({ owner: userId })
      .populate("avatar")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      message: "Error fetching projects",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getProjectById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user!.id,
    }).populate("avatar");

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      message: "Error fetching project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      websiteUrl,
      scrapedPages,
      avatar,
      customFaqs,
      appearance,
    } = req.body;

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Update fields if provided
    if (name) project.name = name;
    if (description) project.description = description;
    if (websiteUrl && websiteUrl !== project.websiteUrl) {
      project.websiteUrl = websiteUrl;
      project.scrapedPages = await scrapeWebsite(websiteUrl);
    }
    if (scrapedPages) project.scrapedPages = scrapedPages;
    if (avatar) project.avatar = avatar;
    if (customFaqs) project.customFaqs = customFaqs;
    if (appearance) project.appearance = appearance;

    // Generate embed code if not exists
    if (!project.embedCode) {
      project.embedCode = generateEmbedCode(project._id);
    }

    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      message: "Error updating project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    await project.deleteOne();
    res.json({ message: "Project removed" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      message: "Error deleting project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateSelectedPages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { selectedPages } = req.body;
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Update selected status for pages
    project.scrapedPages = project.scrapedPages?.map((page) => ({
      ...page,
      selected: selectedPages.includes(page.url),
    }));

    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (error) {
    console.error("Update selected pages error:", error);
    res.status(500).json({
      message: "Error updating selected pages",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Helper function to generate embed code
const generateEmbedCode = (projectId: string): string => {
  return `
<script src="${process.env.APP_URL}/chatbot.js"></script>
<script>
  initChatbot({
    projectId: "${projectId}",
    position: "bottom-right"
  });
</script>
  `.trim();
};

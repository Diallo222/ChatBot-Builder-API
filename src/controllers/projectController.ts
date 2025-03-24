import { Request, Response } from "express";
import Project, { IProject } from "../models/Project";
import User from "../models/User";
import { scrapeWebsite } from "../services/webScraper";
import { IPlan } from "../models/Plan";
import { LauncherIcon, IScrapedPage } from "../models/Project";
import Avatar from "../models/Avatar";
import openai from "../config/openai";

interface CreateProjectBody {
  name: string;
  description?: string;
  websiteUrl?: string;
  scrapedPages?: IScrapedPage[];
  avatar?: {
    type: "custom" | "predefined";
    avatarId?: string; // For predefined avatars
  };
}

export const createProject = async (
  req: Request<{}, {}, CreateProjectBody> & {
    file?: Express.Multer.File & { path: string };
  },
  res: Response
): Promise<void> => {
  console.log("createProject CALLED");
  console.log("AVATAR", req.body.avatar);

  try {
    const { name, description, websiteUrl, scrapedPages } = req.body;
    const userId = req.user!.id;

    // Check user's subscription and project limits
    const user = await User.findById(userId).populate<{
      subscription: { plan: IPlan };
    }>("subscription.plan");

    if (!user) {
      console.log("user not found");

      res.status(404).json({ message: "User not found" });
      return;
    }

    // Count user's existing projects
    // const projectCount = await Project.countDocuments({ owner: userId });
    // const avatarLimit = user.subscription.plan.avatarLimit;

    // if (projectCount >= avatarLimit) {
    //   console.log("project limit reached");

    //   res.status(403).json({
    //     message: "Project limit reached for your subscription plan",
    //   });
    //   return;
    // }

    // Handle avatar data
    let avatarData;
    let avatar = req.body.avatar;
    if (typeof avatar === "string") {
      try {
        avatar = JSON.parse(avatar);
      } catch (e) {
        /* handle error */
      }
    }
    if (avatar?.type === "predefined" && avatar?.avatarId) {
      // Verify predefined avatar exists
      const predefinedAvatar = await Avatar.findById(avatar.avatarId);
      console.log("predefinedAvatar", predefinedAvatar);
      if (!predefinedAvatar) {
        res
          .status(404)
          .json({ message: "Selected predefined avatar not found" });
        return;
      }
      avatarData = {
        type: "predefined",
        imageUrl: predefinedAvatar.imageUrl,
        avatarId: predefinedAvatar._id,
      };
    } else if (req.file) {
      // Custom avatar from file upload
      avatarData = {
        type: "custom",
        imageUrl: req.file.path, // Cloudinary URL from middleware
      };
    } else {
      // Default avatar
      avatarData = {
        type: "predefined",
        imageUrl:
          "https://res.cloudinary.com/doaxoti6i/image/upload/v1740363595/Screenshot_2025-02-24_101927_k8yz4j.png", // Your default avatar URL
      };
    }

    // Create OpenAI assistant with scraped content
    let assistantId: string | undefined;

    // First, ensure scrapedPages is an array
    let scrapedPagesParsed = scrapedPages;

    // If it's a string, try to parse it
    if (typeof scrapedPagesParsed === "string") {
      try {
        scrapedPagesParsed = JSON.parse(scrapedPagesParsed);
      } catch (e) {
        console.warn("Failed to parse scrapedPages:", e);
        scrapedPagesParsed = [];
      }
    }

    // If it's still not an array, initialize it as empty array
    if (!Array.isArray(scrapedPagesParsed)) {
      scrapedPagesParsed = [];
    }
    if (scrapedPagesParsed?.length) {
      const instructions = scrapedPagesParsed
        .filter((page) => page)
        .map((page) => `Content from ${page.url}:\n${page.content}`)
        .join("\n\n");

      const assistant = await openai.beta.assistants.create({
        name: `${name} Assistant`,
        instructions: `You are a helpful AI assistant for the website ${websiteUrl}. Use the following content to answer questions:\n\n${instructions}`,
        model: "gpt-4-turbo-preview",
      });
      console.log("assistant", assistant);
      assistantId = assistant.id;
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      owner: userId,
      websiteUrl,
      avatar: avatarData,
      scrapedPages: scrapedPagesParsed,
      ...(assistantId && { assistantId }),
    });
    project.embedCode = generateEmbedCode(project);
    await project.save();

    // console.log("project created !!!!!!!!!!", project, assistantId);

    res.status(201).json(project);
  } catch (error) {
    // console.log("error", error);

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
    console.log("userId", userId);
    const projects = await Project.find({ owner: userId })
      .populate("avatar")
      .sort({ createdAt: -1 });
    console.log("projects GOTTEN");

    res.status(200).json(projects);
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
    })
      .populate("avatar")
      .select("+appearance +configuration");

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    console.log("project", project);
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
  req: Request & { file?: Express.Multer.File & { path: string } },
  res: Response
): Promise<void> => {
  console.log("updateProject CALLED", req.file);
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

    // Handle avatar data
    let avatarData;
    let parsedAvatar = avatar;
    if (typeof avatar === "string") {
      try {
        parsedAvatar = JSON.parse(avatar);
      } catch (e) {
        /* handle error */
      }
    }

    if (parsedAvatar?.type === "predefined" && parsedAvatar?.avatarId) {
      // Verify predefined avatar exists
      const predefinedAvatar = await Avatar.findById(parsedAvatar.avatarId);
      if (!predefinedAvatar) {
        res
          .status(404)
          .json({ message: "Selected predefined avatar not found" });
        return;
      }
      avatarData = {
        type: "predefined",
        imageUrl: predefinedAvatar.imageUrl,
        avatarId: predefinedAvatar._id,
      };
    } else if (req.file) {
      // Custom avatar from file upload
      avatarData = {
        type: "custom",
        imageUrl: req.file.path, // Cloudinary URL from middleware
      };
    }

    // Update fields if provided
    if (name) project.name = name;
    if (description) project.description = description;
    if (websiteUrl && websiteUrl !== project.websiteUrl) {
      project.websiteUrl = websiteUrl;
      project.scrapedPages = scrapedPages;
    }
    if (scrapedPages) project.scrapedPages = scrapedPages;
    if (avatarData) project.avatar = avatarData as any;
    if (customFaqs) project.customFaqs = customFaqs;
    if (appearance) project.appearance = appearance;

    project.embedCode = generateEmbedCode(project);
    console.log("project.embedCode", project.embedCode);
    const updatedProject = await project.save();
    res.status(200).json(updatedProject);
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

    // Delete OpenAI assistant if it exists
    if (project.assistantId) {
      try {
        await openai.beta.assistants.del(project.assistantId);
      } catch (assistantError) {
        console.error("Error deleting OpenAI assistant:", assistantError);
        // Continue with project deletion even if assistant deletion fails
      }
    }

    await project.deleteOne();
    console.log("project and associated assistant deleted");
    res.status(200).json({ message: "Project removed" });
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
const generateEmbedCode = (project: IProject): string => {
  const configData = JSON.stringify({
    projectId: project._id,
    baseUrl: process.env.APP_URL,
    config: {
      appearance: {
        primaryColor: project.appearance.mainColor,
        launcherIcon: project.appearance.launcherIcon,
        customIconUrl: project.appearance.customIconUrl,
        avatarUrl: project.avatar.imageUrl,
      },
      configuration: {
        welcomeMessage: project.configuration.welcomeMessage,
        sampleQuestions: project.configuration.sampleQuestions,
      },
    },
  });

  return `
<!-- Chatbot Widget -->
<script>
  (function() {
    window.CHATBOT_CONFIG = ${configData};
    const script = document.createElement('script');
    script.src = "${process.env.APP_URL}/js/chatbot-widget.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  })();
</script>
`;
};

export const updateConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { welcomeMessage, sampleQuestions, appearance } = req.body;

    // First find the project to ensure it exists and belongs to the user
    const project = await Project.findOne({
      _id: id,
      owner: req.user!.id,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Validate appearance if provided
    if (appearance) {
      if (
        appearance.mainColor &&
        !/^#[0-9A-Fa-f]{6}$/.test(appearance.mainColor)
      ) {
        res.status(400).json({ message: "Invalid main color format" });
        return;
      }

      if (
        appearance.launcherIcon &&
        !Object.values(LauncherIcon).includes(appearance.launcherIcon)
      ) {
        res.status(400).json({ message: "Invalid launcher icon" });
        return;
      }

      if (
        appearance.launcherIcon !== LauncherIcon.CUSTOM &&
        appearance.customIconUrl
      ) {
        res.status(400).json({
          message:
            "Custom icon URL is only allowed when launcher icon is set to CUSTOM",
        });
        return;
      }
    }

    // Update only the provided fields
    const updateData: any = {};
    if (welcomeMessage !== undefined) {
      console.log("welcomeMessage", welcomeMessage);
      updateData["configuration.welcomeMessage"] = welcomeMessage;
    }
    if (sampleQuestions !== undefined) {
      console.log("sampleQuestions", sampleQuestions);
      updateData["configuration.sampleQuestions"] = sampleQuestions;
    }
    if (appearance !== undefined) {
      console.log("DEEP APPEARANCE", appearance);
      updateData["appearance"] = appearance;
    }

    // Update the project with the new configuration
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    updatedProject.embedCode = generateEmbedCode(updatedProject);
    console.log("updatedProject.embedCode", updatedProject.embedCode);
    await updatedProject.save();

    res.status(200).json(updatedProject.configuration);
  } catch (error) {
    console.error("Update configuration error:", error);
    res.status(500).json({
      message: "Error updating configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("getConfiguration CALLED", req.params);
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.json(project.configuration);
  } catch (error) {
    console.error("Get configuration error:", error);
    res.status(500).json({
      message: "Error getting configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const resetConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Reset to default values
    project.configuration = {
      welcomeMessage: "Hello! How can I help you today?",
      sampleQuestions: [
        "What services do you offer?",
        "How can I contact support?",
        "What are your business hours?",
      ],
      appearance: {
        mainColor: "#3498db",
        launcherIcon: LauncherIcon.CHAT,
      },
    };

    project.appearance = {
      mainColor: "#3498db",
      launcherIcon: LauncherIcon.CHAT,
    };

    await project.save();
    res.json(project.configuration);
  } catch (error) {
    console.error("Reset configuration error:", error);
    res.status(500).json({
      message: "Error resetting configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateProjectAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("updateProjectAvatar CALLED", req.body);
  try {
    const { id } = req.params;
    const { avatarId } = req.body;

    // Find the avatar first
    const avatar = await Avatar.findById(avatarId);
    if (!avatar) {
      res.status(404).json({ message: "Avatar not found" });
      return;
    }

    // Check if the avatar belongs to the user or is public
    if (!avatar.isPublic && avatar.owner?.toString() !== req.user!.id) {
      res.status(403).json({ message: "Not authorized to use this avatar" });
      return;
    }

    // Update the project with the new avatar
    const project = await Project.findByIdAndUpdate(
      id,
      {
        avatar: {
          type: avatar.type,
          imageUrl: avatar.imageUrl,
          avatarId: avatar._id,
        },
      },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    console.log("project.avatar DONE", project.avatar);
    res.json({
      message: "Project avatar updated successfully",
      avatar: project.avatar,
    });
  } catch (error) {
    console.error("Update project avatar error:", error);
    res.status(500).json({
      message: "Error updating project avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const resetProjectAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndUpdate(
      id,
      {
        avatar: {
          type: "predefined",
          imageUrl: "default-avatar-url", // Replace with your default avatar URL
          avatarId: null,
        },
      },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.json({
      message: "Project avatar reset to default",
      avatar: project.avatar,
    });
  } catch (error) {
    console.error("Reset project avatar error:", error);
    res.status(500).json({
      message: "Error resetting project avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Add new controller for website scraping
export const scrapeWebsitePages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { websiteUrl } = req.body;

    if (!websiteUrl) {
      res.status(400).json({ message: "Website URL is required" });
      return;
    }

    const scrapedPages = await scrapeWebsite(websiteUrl);
    res.json({ scrapedPages });
  } catch (error) {
    console.error("Website scraping error:", error);
    res.status(500).json({
      message: "Error scraping website",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

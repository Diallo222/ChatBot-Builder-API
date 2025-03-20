import mongoose from "mongoose";
import Avatar from "../models/Avatar";
import dotenv from "dotenv";

dotenv.config();

const avatarsImages = [
  "https://res.cloudinary.com/doaxoti6i/image/upload/v1740363595/Screenshot_2025-02-24_101927_k8yz4j.png",
  "https://res.cloudinary.com/doaxoti6i/image/upload/v1740363597/Screenshot_2025-02-24_101936_ce6qrf.png",
  "https://res.cloudinary.com/doaxoti6i/image/upload/v1740363618/Screenshot_2025-02-24_102002_d1poxe.png",
];

const createDefaultAvatars = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);

    // Clear existing avatars (optional - remove if you want to keep existing ones)
    await Avatar.deleteMany({});

    // Create new avatars
    const avatarPromises = avatarsImages.map((imageUrl, index) => {
      const avatar = new Avatar({
        name: `Avatar ${index + 1}`,
        imageUrl,
        type: "predefined",
        isPublic: true,
      });
      return avatar.save();
    });

    await Promise.all(avatarPromises);

    console.log("Default avatars created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating default avatars:", error);
    process.exit(1);
  }
};

createDefaultAvatars();

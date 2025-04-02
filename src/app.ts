import express, { RequestHandler } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import planRoutes from "./routes/planRoutes";
import { handleStripeWebhook } from "./services/paymentService";
import { stripe } from "./config/stripe";
import projectRoutes from "./routes/projectRoutes";
import avatarRoutes from "./routes/avatarRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import chatSessionRoutes from "./routes/chatSessionRoutes";
import ticketRoutes from "./routes/ticketRoutes";
import trainingRoutes from "./routes/trainingRoutes";
import forgotRoutes from "./routes/forgotRoutes";
import publicBlogRoutes from "./routes/publicBlogRoutes";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createDefaultFreePlan } from "./controllers/planController";
import tutorialRoutes from "./routes/tutorialRoutes";
import blogRoutes from "./routes/blogRoutes";
import path from "path";
import documentRoutes from "./routes/documentRoutes";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Create default free plan
//createDefaultFreePlan();
// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      csrfToken(): string;
    }
  }
}

const app = express();

// Security headers
app.use(helmet());

// CORS configuration

// app.use(
//   cors({
//     origin: [process.env.CLIENT_URL, process.env.APP_URL].filter(
//       Boolean
//     ) as string[],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "x-csrf-token", "Authorization"],
//     exposedHeaders: ["x-csrf-token"],
//   })
// );

// Replace the existing CORS configuration with this:
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in production (since embed code could be used anywhere)
      // For development, you might want to keep the existing origin checks
      if (process.env.NODE_ENV === "production") {
        callback(null, true);
      } else {
        callback(null, true);
        // const allowedOrigins = [
        //   process.env.CLIENT_URL,
        //   process.env.APP_URL,
        // ].filter(Boolean) as string[];
        // if (!origin || allowedOrigins.includes(origin)) {
        //   callback(null, origin);
        // } else {
        //   callback(new Error("Not allowed by CORS"));
        // }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use("/api/conversations", conversationRoutes);
app.use("/api/public-blogs", publicBlogRoutes);
app.use("/api/documents", documentRoutes);

// Serve static files from both src and dist
if (process.env.NODE_ENV === "production") {
  app.use("/js", express.static(path.join(__dirname, "../dist/public/js")));
} else {
  app.use("/js", express.static(path.join(__dirname, "public/js")));
}

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/avatars", avatarRoutes);
app.use("/api/chat-sessions", chatSessionRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api", tutorialRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/forgot", forgotRoutes);

// Stripe webhook route
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );

      await handleStripeWebhook(event);
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res
        .status(400)
        .send(
          `Webhook Error: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
    }
  }
);

// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

export default app;

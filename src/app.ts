import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import planRoutes from "./routes/planRoutes";
import { handleStripeWebhook } from "./services/paymentService";
import { stripe } from "./config/stripe";
import projectRoutes from "./routes/projectRoutes";
import avatarRoutes from "./routes/avatarRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import chatSessionRoutes from "./routes/chatSessionRoutes";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// Load environment variables
dotenv.config();

// Connect to database
connectDB();

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
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-csrf-token"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(cookieParser());

// CSRF protection
app.use(
  csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/avatars", avatarRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/chat-sessions", chatSessionRoutes);

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

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

export default app;

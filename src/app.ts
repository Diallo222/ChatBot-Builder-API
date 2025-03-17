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
// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/avatars", avatarRoutes);
app.use("/api/conversations", conversationRoutes);

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

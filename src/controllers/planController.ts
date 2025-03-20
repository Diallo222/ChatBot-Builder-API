import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import Plan from "../models/Plan";
import User from "../models/User";

export const createPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description, price, features, avatarLimit } = req.body;

    // Create Stripe product and price
    const product = await stripe.products.create({
      name,
      description,
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: price * 100, // Convert to cents
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    // Create plan in database
    const plan = await Plan.create({
      name,
      description,
      price,
      features,
      avatarLimit,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({
      message: "Error creating plan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      message: "Error fetching plans",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updatePlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description, price, features, avatarLimit } = req.body;
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    // Update Stripe product
    await stripe.products.update(plan.stripeProductId!, {
      name,
      description,
    });

    // Create new price in Stripe (prices cannot be updated)
    if (price !== plan.price) {
      const newPrice = await stripe.prices.create({
        product: plan.stripeProductId!,
        unit_amount: price * 100,
        currency: "usd",
        recurring: {
          interval: "month",
        },
      });
      plan.stripePriceId = newPrice.id;
    }

    // Update plan in database
    plan.name = name;
    plan.description = description;
    plan.price = price;
    plan.features = features;
    plan.avatarLimit = avatarLimit;

    const updatedPlan = await plan.save();
    res.json(updatedPlan);
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({
      message: "Error updating plan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deletePlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    // Archive Stripe product
    await stripe.products.update(plan.stripeProductId!, {
      active: false,
    });

    // Delete plan from database
    await plan.deleteOne();
    res.json({ message: "Plan removed" });
  } catch (error) {
    console.error("Delete plan error:", error);
    res.status(500).json({
      message: "Error deleting plan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const subscribeToPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;

    const plan = await Plan.findById(planId);
    const user = await User.findById(userId);

    if (!plan || !user) {
      res.status(404).json({ message: "Plan or user not found" });
      return;
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    // Update user subscription details
    user.subscription = {
      plan: plan._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: "active",
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
    };

    await user.save();

    res.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent
        .client_secret,
    });
  } catch (error) {
    console.error("Subscribe to plan error:", error);
    res.status(500).json({
      message: "Error subscribing to plan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createDefaultFreePlan = async (): Promise<void> => {
  try {
    // Check if free plan already exists
    const existingFreePlan = await Plan.findOne({ price: 0 });
    if (existingFreePlan) {
      return;
    }

    // Create Stripe product for free plan
    const product = await stripe.products.create({
      name: "Free Plan",
      description: "Basic features for getting started",
    });

    // Create $0 price in Stripe
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 0,
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    // Create free plan in database
    await Plan.create({
      name: "Free Plan",
      description: "Basic features for getting started",
      price: 0,
      avatarLimit: 3,
      features: [
        "3 AI Avatars",
        "Basic Chat Features",
        "Standard Response Time",
      ],
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
    });

    console.log("Default free plan created successfully");
  } catch (error) {
    console.error("Create default free plan error:", error);
    throw error;
  }
};

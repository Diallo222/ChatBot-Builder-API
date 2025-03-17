import { stripe } from "../config/stripe";
import User from "../models/User";
import Stripe from "stripe";

export const handleStripeWebhook = async (
  event: Stripe.Event
): Promise<void> => {
  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleFailedPayment(invoice);
        break;
      }
    }
  } catch (error) {
    console.error("Webhook error:", error);
    throw error;
  }
};

const updateSubscriptionStatus = async (
  subscription: Stripe.Subscription
): Promise<void> => {
  const user = await User.findOne({
    "subscription.stripeSubscriptionId": subscription.id,
  });

  if (!user) return;

  user.subscription.status =
    subscription.status === "active" ? "active" : "canceled";

  if (subscription.status === "active") {
    user.subscription.endDate = new Date(
      subscription.current_period_end * 1000
    );
  }

  await user.save();
};

const handleFailedPayment = async (invoice: Stripe.Invoice): Promise<void> => {
  const user = await User.findOne({
    "subscription.stripeCustomerId": invoice.customer,
  });

  if (!user) return;

  user.subscription.status = "expired";
  await user.save();
};

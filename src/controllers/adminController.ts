import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Admin, IAdmin } from "../models/Admin";
import User, { IUser } from "../models/User";
import Avatar from "../models/Avatar";
import {
  generateAdminTokens,
  setTokenCookies,
  clearTokenCookies,
  verifyAdminToken,
} from "../services/authService";
import Plan from "../models/Plan";
import { stripe } from "../config/stripe";

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokens = generateAdminTokens(admin as unknown as IAdmin);
    setTokenCookies(res, tokens);

    res.json({
      adminId: admin._id,
      email: admin.email,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.log("login route error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const refresh = async (req: express.Request, res: express.Response) => {
  //   console.log("refresh route req.cookies", req.cookies);
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    const decoded = verifyAdminToken(refreshToken, true);
    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    const tokens = generateAdminTokens(admin as unknown as IAdmin);
    setTokenCookies(res, tokens);

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.log("refresh route error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req: express.Request, res: express.Response) => {
  try {
    clearTokenCookies(res);
    res.json({ message: "Admin logged out successfully" });
  } catch (error) {
    console.log("logout route error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCredentials = async (
  req: express.Request,
  res: express.Response
) => {
  console.log("updateCredentials route req.admin", req);
  try {
    const { email, password } = req.body;
    const admin = await Admin.findById(req.admin?.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (email) admin.email = email;
    if (password) admin.password = password;

    await admin.save();
    res.json({ message: "Admin credentials updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteAvatar = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    await Avatar.findByIdAndDelete(req.params.id);
    res.json({ message: "Avatar deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getOverview = async (
  req: express.Request,
  res: express.Response
) => {
  console.log("getOverview route req.admin", req.admin);
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get total users and new users from last month
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: lastMonth },
    });
    const userGrowthRate = totalUsers ? (newUsers / totalUsers) * 100 : 0;

    // Get subscription data and revenue
    const subscriptionData = await User.aggregate([
      {
        $match: {
          subscription: { $exists: true },
          "subscription.status": "active",
        },
      },
      {
        $lookup: {
          from: "plans",
          localField: "subscription.plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $first: "$planDetails.price" },
          },
          totalSubscriptions: { $sum: 1 },
          newSubscriptions: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", lastMonth] }, 1, 0],
            },
          },
        },
      },
    ]);

    const {
      totalRevenue = 0,
      totalSubscriptions = 0,
      newSubscriptions = 0,
    } = subscriptionData[0] || {};

    const subscriptionGrowthRate = totalSubscriptions
      ? (newSubscriptions / totalSubscriptions) * 100
      : 0;

    // Get projects data
    const projectsData = await User.aggregate([
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "owner",
          as: "projects",
        },
      },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: { $size: "$projects" } },
          newProjects: {
            $sum: {
              $size: {
                $filter: {
                  input: "$projects",
                  cond: { $gte: ["$$this.createdAt", lastMonth] },
                },
              },
            },
          },
        },
      },
    ]);

    const totalProjects = projectsData[0]?.totalProjects || 0;
    const newProjects = projectsData[0]?.newProjects || 0;
    const projectGrowthRate = totalProjects
      ? (newProjects / totalProjects) * 100
      : 0;

    res.json({
      users: {
        total: totalUsers,
        growthRate: Number(userGrowthRate.toFixed(2)),
      },
      revenue: {
        total: Number(totalRevenue.toFixed(2)),
        subscriptionGrowthRate: Number(subscriptionGrowthRate.toFixed(2)),
      },
      projects: {
        total: totalProjects,
        growthRate: Number(projectGrowthRate.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { search } = req.query;

    // Create match stage based on search parameter
    const matchStage = search
      ? {
          $match: {
            fullName: {
              $regex: search as string,
              $options: "i", // case-insensitive
            },
          },
        }
      : { $match: {} };

    const users = await User.aggregate([
      matchStage,
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "owner",
          as: "projects",
        },
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          subscription: 1,
          createdAt: 1,
          projectCount: { $size: "$projects" },
        },
      },
    ]);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Add error handling middleware for CSRF errors
export const handleCSRFError = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      message: "Invalid CSRF token",
      error: "CSRF_ERROR",
    });
  }
  next(err);
};

export const getSubscriptionsOverview = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get all stripe payments
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    // Calculate metrics
    const totalRevenue = charges.data.reduce(
      (sum, charge) => sum + charge.amount / 100,
      0
    );

    const successfulTransactions = charges.data.filter(
      (charge) => charge.status === "succeeded"
    ).length;

    const failedTransactions = charges.data.filter(
      (charge) => charge.status === "failed"
    ).length;

    // Get active subscriptions count
    const activeSubscriptions = await User.countDocuments({
      "subscription.status": "active",
    });

    // Get subscription distribution by plan
    const subscriptionsByPlan = await User.aggregate([
      {
        $match: {
          "subscription.status": "active",
        },
      },
      {
        $lookup: {
          from: "plans",
          localField: "subscription.plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $group: {
          _id: { $first: "$planDetails.name" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      overview: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        successfulTransactions,
        failedTransactions,
        activeSubscriptions,
      },
      subscriptionsByPlan,
      periodStart: startDate,
      periodEnd: endDate,
    });
  } catch (error) {
    console.error("Subscriptions overview error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUsersTransactions = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build match stage based on search parameter
    const matchStage = search
      ? {
          $match: {
            $or: [
              { fullName: { $regex: search as string, $options: "i" } },
              { email: { $regex: search as string, $options: "i" } },
            ],
          },
        }
      : { $match: {} };

    const transactions = await User.aggregate([
      matchStage,
      {
        $lookup: {
          from: "plans",
          localField: "subscription.plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          planName: { $first: "$planDetails.name" },
          planPrice: { $first: "$planDetails.price" },
          transactionDate: "$subscription.startDate",
          status: "$subscription.status",
        },
      },
      { $skip: skip },
      { $limit: Number(limit) },
      { $sort: { transactionDate: -1 } },
    ]);

    // Get total count for pagination
    const totalCount = await User.countDocuments(matchStage.$match);

    res.json({
      transactions,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
        currentPage: Number(page),
        perPage: Number(limit),
      },
    });
  } catch (error) {
    console.error("Users transactions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const downloadUsersTransactionsCSV = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { search } = req.query;

    // Build match stage based on search parameter
    const matchStage = search
      ? {
          $match: {
            fullName: { $regex: search as string, $options: "i" },
          },
        }
      : { $match: {} };

    const transactions = await User.aggregate([
      matchStage,
      {
        $lookup: {
          from: "plans",
          localField: "subscription.plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          planName: { $first: "$planDetails.name" },
          planPrice: { $first: "$planDetails.price" },
          transactionDate: "$subscription.startDate",
          status: "$subscription.status",
        },
      },
      { $sort: { transactionDate: -1 } },
    ]);

    // Convert transactions to CSV format
    const csvHeader =
      "Full Name,Email,Plan Name,Plan Price,Transaction Date,Status\n";
    const csvRows = transactions
      .map(
        (t) =>
          `${t.fullName},${t.email},${t.planName},${t.planPrice},${new Date(
            t.transactionDate
          ).toISOString()},${t.status}`
      )
      .join("\n");
    const csvContent = csvHeader + csvRows;

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions.csv"
    );

    res.send(csvContent);
  } catch (error) {
    console.error("CSV download error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

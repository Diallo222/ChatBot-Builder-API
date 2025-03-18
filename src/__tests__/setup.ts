import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || process.env.MONGO_URI;

if (!MONGODB_TEST_URI) {
  throw new Error("MongoDB URI is not defined in environment variables");
}

beforeAll(async () => {
  try {
    await mongoose.connect(MONGODB_TEST_URI);
    console.log("Connected to test database");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  console.log("Disconnected from test database");
});

afterEach(async () => {
  // Clean up test data
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

import request from "supertest";
import app from "../../app";
import User from "../../models/User";
import { hashPassword } from "../../utils/passwordUtils";

describe("Auth Endpoints", () => {
  let csrfToken: string;

  beforeEach(async () => {
    // Get CSRF token
    const response = await request(app).get("/api/csrf-token");
    csrfToken = response.body.csrfToken;
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .set("x-csrf-token", csrfToken)
        .send({
          email: "test@example.com",
          password: "password123",
          firstName: "Test",
          lastName: "User",
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await hashPassword("password123");
      await User.create({
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
      });
    });

    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should fail with invalid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid credentials");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user data when authenticated", async () => {
      // First login to get the cookies
      const user = await User.create({
        email: "test@example.com",
        password: await hashPassword("password123"),
        name: "Test User",
      });

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({
          email: "test@example.com",
          password: "password123",
        });

      const cookies = loginResponse.headers["set-cookie"];

      const meResponse = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookies)
        .set("x-csrf-token", csrfToken);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user).toBeDefined();
      expect(meResponse.body.user.email).toBe("test@example.com");
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("x-csrf-token", csrfToken);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Not authenticated");
    });
  });
});

import { Server as HTTPServer } from "http";
import { Server as WebSocketServer, Socket } from "socket.io";
import { generateResponse } from "./aiTrainingService";

export const initializeWebSocket = (server: HTTPServer): WebSocketServer => {
  const io = new WebSocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // Join project-specific room
    socket.on("join_project", (projectId: string) => {
      socket.join(`project_${projectId}`);
    });

    // Handle incoming messages
    socket.on(
      "send_message",
      async (data: {
        conversationId: string;
        projectId: string;
        message: string;
        history: Array<{ role: "user" | "assistant"; content: string }>;
      }) => {
        try {
          // Generate AI response
          const response = await generateResponse(
            data.projectId,
            data.message,
            data.history
          );

          // Emit response back to the specific conversation
          socket.emit("receive_message", {
            conversationId: data.conversationId,
            message: response,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit("error", {
            message: "Error generating response",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

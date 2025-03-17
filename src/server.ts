import { createServer } from "http";
import app from "./app";
import { initializeWebSocket } from "./services/websocketService";

const httpServer = createServer(app);
const io = initializeWebSocket(httpServer);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

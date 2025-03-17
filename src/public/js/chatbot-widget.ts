interface ChatbotConfig {
  projectId: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  secondaryColor?: string;
}

class ChatbotWidget {
  private container: HTMLDivElement;
  private socket: any; // Socket.io client
  private conversationId: string | null = null;
  private messageHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  constructor(private config: ChatbotConfig) {
    this.initializeWidget();
    this.initializeSocket();
  }

  private initializeWidget(): void {
    // Create widget container
    this.container = document.createElement("div");
    this.container.id = "chatbot-widget-container";
    this.container.style.position = "fixed";
    this.container.style.bottom = "20px";
    this.container.style[
      this.config.position === "bottom-left" ? "left" : "right"
    ] = "20px";

    // Add widget HTML
    this.container.innerHTML = `
      <div class="chatbot-widget" style="
        background: white;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: none;
        width: 350px;
        height: 500px;
        overflow: hidden;
      ">
        <div class="chatbot-header" style="
          background: ${this.config.primaryColor || "#3498db"};
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>Chat Support</span>
          <button class="close-btn">×</button>
        </div>
        <div class="chatbot-messages" style="
          height: 400px;
          overflow-y: auto;
          padding: 15px;
        "></div>
        <div class="chatbot-input" style="
          padding: 15px;
          border-top: 1px solid #eee;
        ">
          <input type="text" placeholder="Type your message..." style="
            width: 80%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
          ">
          <button class="send-btn" style="
            width: 18%;
            padding: 8px;
            background: ${this.config.secondaryColor || "#2ecc71"};
            color: white;
            border: none;
            border-radius: 4px;
            margin-left: 2%;
          ">Send</button>
        </div>
      </div>
      <button class="chatbot-toggle" style="
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${this.config.primaryColor || "#3498db"};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
    `;

    // Add event listeners
    this.addEventListeners();

    // Add to page
    document.body.appendChild(this.container);
  }

  private initializeSocket(): void {
    // Initialize Socket.io client
    this.socket = io(process.env.WEBSOCKET_URL || "http://localhost:4000");

    this.socket.on("connect", () => {
      this.socket.emit("join_project", this.config.projectId);
    });

    this.socket.on(
      "receive_message",
      (data: { conversationId: string; message: string; timestamp: Date }) => {
        this.addMessage("assistant", data.message);
        this.messageHistory.push({ role: "assistant", content: data.message });
      }
    );

    this.socket.on("error", (error: any) => {
      console.error("Chatbot error:", error);
      this.addMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again."
      );
    });
  }

  private addEventListeners(): void {
    const widget = this.container.querySelector(".chatbot-widget")!;
    const toggleBtn = this.container.querySelector(".chatbot-toggle")!;
    const closeBtn = this.container.querySelector(".close-btn")!;
    const input = this.container.querySelector("input")!;
    const sendBtn = this.container.querySelector(".send-btn")!;

    toggleBtn.addEventListener("click", () => {
      widget.style.display = widget.style.display === "none" ? "block" : "none";
      if (widget.style.display === "block" && !this.conversationId) {
        this.startNewConversation();
      }
    });

    closeBtn.addEventListener("click", () => {
      widget.style.display = "none";
    });

    sendBtn.addEventListener("click", () => this.sendMessage());
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage();
    });
  }

  private async startNewConversation(): Promise<void> {
    try {
      const response = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: this.config.projectId,
          visitorInfo: {
            userAgent: navigator.userAgent,
          },
        }),
      });

      const data = await response.json();
      this.conversationId = data._id;
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  }

  private async sendMessage(): Promise<void> {
    const input = this.container.querySelector("input") as HTMLInputElement;
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = "";

    // Add message to chat
    this.addMessage("user", message);
    this.messageHistory.push({ role: "user", content: message });

    // Send message via socket
    this.socket.emit("send_message", {
      conversationId: this.conversationId,
      projectId: this.config.projectId,
      message,
      history: this.messageHistory,
    });
  }

  private addMessage(sender: "user" | "assistant", content: string): void {
    const messagesContainer =
      this.container.querySelector(".chatbot-messages")!;
    const messageElement = document.createElement("div");

    messageElement.className = `message ${sender}`;
    messageElement.style.cssText = `
      margin: 10px 0;
      padding: 10px;
      border-radius: 10px;
      max-width: 80%;
      ${
        sender === "user"
          ? "margin-left: auto; background: #e3f2fd;"
          : "background: #f5f5f5;"
      }
    `;

    messageElement.textContent = content;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Initialize chatbot when script loads
window.initChatbot = (config: ChatbotConfig) => {
  new ChatbotWidget(config);
};

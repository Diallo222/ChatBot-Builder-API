class ChatbotWidget {
  constructor(config) {
    this.config = config;
    this.conversationId = null;
    this.messageHistory = [];
    this.pollingInterval = null;
    this.startPolling = () => {
      // Poll every 3 seconds for new messages
      this.pollingInterval = window.setInterval(async () => {
        var _a;
        if (!this.conversationId) return;
        try {
          const response = await fetch(
            `${this.baseUrl}/api/conversations/${this.conversationId}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );
          const data = await response.json();
          if (
            (_a = data.messages) === null || _a === void 0 ? void 0 : _a.length
          ) {
            data.messages.forEach((msg) => {
              this.addMessage("assistant", msg.content);
              this.messageHistory.push({
                role: "assistant",
                content: msg.content,
              });
            });
          }
        } catch (error) {
          console.error("Error polling messages:", error);
        }
      }, 3000);
    };
    if (!config.baseUrl) {
      throw new Error("baseUrl is required in ChatbotConfig");
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash if present
    this.initializeWidget();
  }
  initializeWidget() {
    // Create widget container
    this.container = document.createElement("div");
    this.container.id = "chatbot-widget-container";
    this.container.style.position = "fixed";
    this.container.style.bottom = "20px";
    this.container.style.zIndex = "999999";
    this.container.style[
      this.config.position === "bottom-left" ? "left" : "right"
    ] = "20px";
    const primaryColor =
      this.config.config.appearance.primaryColor || "#3498db";
    const welcomeMessage = this.config.config.configuration.welcomeMessage;
    const sampleQuestions = this.config.config.configuration.sampleQuestions;
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
          background: ${primaryColor};
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>Chat Support</span>
          <button class="close-btn" style="
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
          ">×</button>
        </div>
        <div class="chatbot-messages" style="
          height: 400px;
          overflow-y: auto;
          padding: 15px;
        ">
          ${
            welcomeMessage
              ? `
            <div class="message assistant" style="
              margin: 10px 0;
              padding: 10px;
              border-radius: 10px;
              background: #f5f5f5;
              max-width: 80%;
            ">${welcomeMessage}</div>
          `
              : ""
          }
          ${
            (
              sampleQuestions === null || sampleQuestions === void 0
                ? void 0
                : sampleQuestions.length
            )
              ? `
            <div class="sample-questions" style="
              margin-top: 10px;
              display: flex;
              flex-direction: column;
              gap: 5px;
            ">
              ${sampleQuestions
                .map(
                  (q) => `
                <button class="sample-question" style="
                  background: #f5f5f5;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  padding: 8px;
                  text-align: left;
                  cursor: pointer;
                ">${q}</button>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
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
            background: ${primaryColor};
            color: white;
            border: none;
            border-radius: 4px;
            margin-left: 2%;
            cursor: pointer;
          ">Send</button>
        </div>
      </div>
      <button class="chatbot-toggle" style="
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${this.getLauncherIcon()}
      </button>
    `;
    // Add event listeners
    this.addEventListeners();
    // Add to page
    document.body.appendChild(this.container);
  }
  addEventListeners() {
    const widget = this.container.querySelector(".chatbot-widget");
    const toggleBtn = this.container.querySelector(".chatbot-toggle");
    const closeBtn = this.container.querySelector(".close-btn");
    const input = this.container.querySelector("input");
    const sendBtn = this.container.querySelector(".send-btn");
    toggleBtn.addEventListener("click", () => {
      widget.style.display = widget.style.display === "none" ? "block" : "none";
      if (widget.style.display === "block" && !this.conversationId) {
        this.startNewConversation();
      }
    });
    closeBtn.addEventListener("click", () => {
      widget.style.display = "none";
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    });
    sendBtn.addEventListener("click", () => this.sendMessage());
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage();
    });
  }
  async startNewConversation() {
    try {
      if (!this.baseUrl) {
        throw new Error("baseUrl is not configured");
      }
      const response = await fetch(`${this.baseUrl}/api/conversations/start`, {
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
  async sendMessage() {
    const input = this.container.querySelector("input");
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    this.addMessage("user", message);
    this.messageHistory.push({ role: "user", content: message });
    try {
      const response = await fetch(
        `${this.baseUrl}/api/conversations/${this.conversationId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: this.conversationId,
            projectId: this.config.projectId,
            message,
            history: this.messageHistory,
          }),
        }
      );
      const data = await response.json();
      if (data.message) {
        this.addMessage("assistant", data.message);
        this.messageHistory.push({ role: "assistant", content: data.message });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      this.addMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again."
      );
    }
  }
  addMessage(sender, content) {
    const messagesContainer = this.container.querySelector(".chatbot-messages");
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
  getLauncherIcon() {
    const icon = this.config.config.appearance.launcherIcon;
    const customUrl = this.config.config.appearance.customIconUrl;
    if (icon === "CUSTOM" && customUrl) {
      return `<img src="${customUrl}" width="24" height="24" alt="Chat" />`;
    }
    // Default chat icon SVG
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>`;
  }
}
// Modify the initialization at the bottom of the file
if (typeof window !== "undefined") {
  window.initChatbot = (config) => {
    var _a, _b;
    // Basic config validation
    if (!config || typeof config !== "object") {
      console.error("ChatbotWidget: Invalid configuration object");
      return;
    }
    // Validate required fields
    if (!config.baseUrl || typeof config.baseUrl !== "string") {
      console.error("ChatbotWidget: baseUrl is required and must be a string");
      return;
    }
    if (!config.projectId || typeof config.projectId !== "string") {
      console.error(
        "ChatbotWidget: projectId is required and must be a string"
      );
      return;
    }
    // Validate nested config structure
    if (
      !((_a = config.config) === null || _a === void 0
        ? void 0
        : _a.appearance) ||
      !((_b = config.config) === null || _b === void 0
        ? void 0
        : _b.configuration)
    ) {
      console.error(
        "ChatbotWidget: Invalid config structure - missing required nested properties"
      );
      return;
    }
    // Check if widget already exists
    if (!document.getElementById("chatbot-widget-container")) {
      try {
        new ChatbotWidget(config);
      } catch (error) {
        console.error("ChatbotWidget: Failed to initialize -", error);
      }
    }
  };
  // Auto-initialize with validation
  if (window.CHATBOT_CONFIG) {
    try {
      window.initChatbot(window.CHATBOT_CONFIG);
    } catch (error) {
      console.error("ChatbotWidget: Auto-initialization failed -", error);
    }
  }
}

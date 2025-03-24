class ChatbotWidget {
  constructor(config) {
    this.config = config;
    this.conversationId = null;
    this.messageHistory = [];
    this.pollingInterval = null;
    this.isLoading = false;
    if (!config.baseUrl) {
      throw new Error("baseUrl is required in ChatbotConfig");
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash if present
    this.styleSheet = this.createStyleSheet();
    document.head.appendChild(this.styleSheet);
    this.initializeWidget();
  }
  createStyleSheet() {
    const style = document.createElement("style");
    const primaryColor =
      this.config.config.appearance.primaryColor || "#3498db";
    style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    
    .chatbot-widget {
      animation: fadeIn 0.5s ease forwards;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      display: flex;
      flex-direction: column;
    }
    
    .chatbot-widget.closing {
      animation: fadeOut 0.5s ease forwards;
    }
    
    .message {
      animation: slideUp 0.3s ease forwards;
    }
    
    .typing-indicator span {
      animation: bounce 0.6s infinite;
    }
    
    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    .send-btn-container {
      transition: all 0.3s ease;
    }
    
    .send-btn-container.hidden {
      transform: scale(0);
      opacity: 0;
    }
    
    .send-btn-container.visible {
      transform: scale(1);
      opacity: 1;
    }
    
    .chatbot-toggle {
      transition: transform 0.3s ease;
    }
    
    .chatbot-toggle:hover {
      transform: scale(1.05);
    }
    
    .sample-question {
      transition: background-color 0.2s ease;
    }
    
    .sample-question:hover {
      background-color: #e0e0e0 !important;
    }
    
    /* Scrollbar styling */
    .chatbot-messages::-webkit-scrollbar {
      width: 6px;
    }
    
    .chatbot-messages::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .chatbot-messages::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 10px;
    }
    
    .chatbot-messages::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    .sample-questions-container::-webkit-scrollbar {
      display: none;
    }

    .sample-questions-container {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .chatbot-input {
      flex-shrink: 0;
      border-top: 1px solid #eee;
    }
    
    .chatbot-messages {
      flex-grow: 1;
      overflow-y: auto;
    }
    
    @media (max-width: 480px) {
      .chatbot-widget {
        width: 100% !important;
        height: 100% !important;
        border-radius: 0 !important;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
    }
  `;
    return style;
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
    const avatarUrl =
      this.config.config.appearance.avatarUrl ||
      "https://res.cloudinary.com/doaxoti6i/image/upload/v1740362205/Screenshot_2025-02-24_095544_pl9gji.png";
    // Add widget HTML
    this.container.innerHTML = `
    <div class="chatbot-widget" style="
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: none;
      width: 380px;
      height: 550px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    ">
      <!-- Avatar Header -->
      <div style="
        position: relative;
        height: 180px;
        background-color: #1a1a1a;
        overflow: hidden;
        flex-shrink: 0;
      ">
        <button class="close-btn" style="
          position: absolute;
          right: 16px;
          top: 16px;
          z-index: 10;
          height: 32px;
          width: 32px;
          border-radius: 50%;
          background: rgba(0,0,0,0.5);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img 
          src="${avatarUrl}" 
          alt="AI Assistant" 
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.9;
          "
        />
      </div>
      
      <!-- Chat Messages -->
      <div class="chatbot-messages" style="
        flex-grow: 1;
        overflow-y: auto;
        padding: 16px;
        scroll-behavior: smooth;
        min-height: 200px;
      ">
        ${
          welcomeMessage
            ? `
          <div class="message assistant" style="
            margin: 10px 0;
            padding: 12px;
            border-radius: 16px;
            background: #f5f5f5;
            max-width: 80%;
            color: #1a1a1a;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          ">${welcomeMessage}</div>
        `
            : ""
        }
      </div>
      
      <!-- Input Area -->
      <div class="chatbot-input" style="
        padding: 12px 16px 20px 16px;
        background: white;
        position: relative;
        flex-shrink: 0;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
      ">
        ${
          (
            sampleQuestions === null || sampleQuestions === void 0
              ? void 0
              : sampleQuestions.length
          )
            ? `
<div class="sample-questions-container" style="
  margin-bottom: 12px;
  overflow-x: auto;
  white-space: nowrap;
  padding: 4px 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
">
  <div style="
    display: inline-flex;
    gap: 8px;
    padding: 0 4px;
  ">
    ${sampleQuestions
      .map(
        (q) => `
      <button class="sample-question" style="
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 16px;
        padding: 8px 12px;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
        white-space: nowrap;
        color: #333;
        font-weight: 500;
      ">${q}</button>
    `
      )
      .join("")}
  </div>
</div>
`
            : ""
        }
        <form class="message-form" style="
          display: flex;
          gap: 8px;
          align-items: center;
        ">
          <input type="text" placeholder="Type your message..." style="
            flex: 1;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 24px;
            font-size: 14px;
            outline: none;
            transition: border 0.2s, box-shadow 0.2s;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            background: white;
          " onfocus="this.style.borderColor='${primaryColor}'; this.style.boxShadow='0 0 0 2px rgba(52, 152, 219, 0.2)';" 
            onblur="this.style.borderColor='#e0e0e0'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.05)';">
          <div class="send-btn-container hidden" style="
            transition: all 0.3s ease;
          ">
            <button type="submit" class="send-btn" style="
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: ${primaryColor};
              color: white;
              border: none;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
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
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s, box-shadow 0.3s;
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
    const form = this.container.querySelector(".message-form");
    const input = this.container.querySelector("input");
    const sendBtnContainer = this.container.querySelector(
      ".send-btn-container"
    );
    // Toggle chat widget
    toggleBtn.addEventListener("click", () => {
      if (widget.style.display === "none") {
        widget.style.display = "flex";
        toggleBtn.style.display = "none";
        if (!this.conversationId) {
          this.startNewConversation();
        }
      } else {
        this.closeWidget();
      }
    });
    // Close chat widget
    closeBtn.addEventListener("click", () => {
      this.closeWidget();
    });
    // Handle form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    // Show/hide send button based on input
    input.addEventListener("input", () => {
      if (input.value.trim()) {
        sendBtnContainer.classList.remove("hidden");
        sendBtnContainer.classList.add("visible");
      } else {
        sendBtnContainer.classList.remove("visible");
        sendBtnContainer.classList.add("hidden");
      }
    });
    // Handle sample question clicks
    const sampleQuestions = this.container.querySelectorAll(".sample-question");
    sampleQuestions.forEach((btn) => {
      btn.addEventListener("click", () => {
        const questionText = btn.textContent || "";
        input.value = questionText;
        input.focus();
        sendBtnContainer.classList.remove("hidden");
        sendBtnContainer.classList.add("visible");
        // Optional: Uncomment the next line if you want to automatically send the question
        // this.sendMessage();
      });
    });
  }
  closeWidget() {
    const widget = this.container.querySelector(".chatbot-widget");
    const toggleBtn = this.container.querySelector(".chatbot-toggle");
    widget.classList.add("closing");
    widget.style.display = "none";
    setTimeout(() => {
      widget.style.display = "none";
      widget.classList.remove("closing");
      toggleBtn.style.display = "flex";
    }, 300); // Match the animation duration
  }
  async startNewConversation() {
    try {
      if (!this.baseUrl) {
        throw new Error("baseUrl is not configured");
      }
      this.setLoading(true);
      const response = await fetch(
        `${this.baseUrl}/api/conversations/project/${this.config.projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metadata: {
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              url: window.location.href,
            },
          }),
        }
      );
      const data = await response.json();
      this.conversationId = data._id;
      this.setLoading(false);
    } catch (error) {
      console.error("Error starting conversation:", error);
      this.setLoading(false);
      this.addMessage(
        "assistant",
        "Sorry, I couldn't start a conversation. Please try again later.",
        `error_${Date.now()}`
      );
    }
  }
  async sendMessage() {
    const input = this.container.querySelector("input");
    const message = input.value.trim();
    const sendBtnContainer = this.container.querySelector(
      ".send-btn-container"
    );
    if (!message) return;
    input.value = "";
    sendBtnContainer.classList.remove("visible");
    sendBtnContainer.classList.add("hidden");
    const messageId = `msg_${Date.now()}`;
    this.addMessage("user", message, messageId);
    this.messageHistory.push({ role: "user", content: message, messageId });
    this.setLoading(true);
    try {
      const response = await fetch(
        `${this.baseUrl}/api/conversations/${this.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
          }),
        }
      );
      const data = await response.json();
      this.setLoading(false);
      if (data.assistantResponse) {
        const responseId = data.assistantResponse.messageId;
        this.addMessage(
          "assistant",
          data.assistantResponse.content,
          responseId
        );
        this.messageHistory.push({
          role: "assistant",
          content: data.assistantResponse.content,
          messageId: responseId,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      this.setLoading(false);
      this.addMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again.",
        `error_${Date.now()}`
      );
    }
  }
  setLoading(isLoading) {
    this.isLoading = isLoading;
    // Remove existing typing indicator if any
    const existingIndicator = this.container.querySelector(".typing-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }
    if (isLoading) {
      const messagesContainer =
        this.container.querySelector(".chatbot-messages");
      const typingIndicator = document.createElement("div");
      typingIndicator.className = "typing-indicator message assistant";
      typingIndicator.style.cssText = `
        margin: 10px 0;
        padding: 16px;
        border-radius: 16px;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        gap: 4px;
        width: fit-content;
      `;
      typingIndicator.innerHTML = `
        <span style="width: 8px; height: 8px; background: #aaa; border-radius: 50%; display: inline-block;"></span>
        <span style="width: 8px; height: 8px; background: #aaa; border-radius: 50%; display: inline-block;"></span>
        <span style="width: 8px; height: 8px; background: #aaa; border-radius: 50%; display: inline-block;"></span>
      `;
      messagesContainer.appendChild(typingIndicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  addMessage(sender, content, messageId) {
    const messagesContainer = this.container.querySelector(".chatbot-messages");
    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}`;
    messageElement.dataset.messageId = messageId;
    messageElement.style.cssText = `
      margin: 10px 0;
      padding: 12px 16px;
      border-radius: 16px;
      max-width: 80%;
      line-height: 1.4;
      word-break: break-word;
      ${
        sender === "user"
          ? `margin-left: auto; 
             background: ${this.config.config.appearance.primaryColor}; 
             color: white;
             border-bottom-right-radius: 4px;`
          : `background: #f5f5f5; 
             color: #1a1a1a;
             border-bottom-left-radius: 4px;`
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
    // Modern chat icon SVG
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
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

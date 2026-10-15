import { AIProvider } from "./ai-provider.interface.js";
import { GeminiAIProvider } from "./gemini-provider.js";
import { DemoAIProvider } from "./demo-provider.js";
import { config } from "../../config.js";

class AIService {
  private provider: AIProvider;

  constructor() {
    if (config.AI_PROVIDER === "gemini" && config.GEMINI_API_KEY) {
      console.log("🤖 AIService initialized with Google Gemini Provider (@google/genai)");
      this.provider = new GeminiAIProvider();
    } else {
      console.log("🧪 AIService initialized with Deterministic Demo Provider");
      this.provider = new DemoAIProvider();
    }
  }

  getProvider(): AIProvider {
    return this.provider;
  }
}

export const aiService = new AIService();
export const ai = aiService.getProvider();

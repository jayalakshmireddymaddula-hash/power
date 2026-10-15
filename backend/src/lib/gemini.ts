import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

let geminiClient: GoogleGenAI | null = null;

if (config.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({
    apiKey: config.GEMINI_API_KEY,
  });
}

export const gemini = geminiClient;

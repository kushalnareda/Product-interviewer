import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { getSystemInstruction } from '../types';

// Singleton instance management for the chat session
let chatSession: Chat | null = null;

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const startInterviewSession = async (): Promise<string> => {
  const ai = getAiClient();
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: getSystemInstruction(),
      temperature: 0.7, // Slightly creative but focused
    },
  });

  // Initial kick-off message to start the persona
  const response: GenerateContentResponse = await chatSession.sendMessage({
    message: "Hello. I am ready to begin." 
  });

  return response.text || "Error: No response from AI.";
};

export const sendMessageToAi = async (message: string): Promise<string> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized.");
  }

  try {
    const response: GenerateContentResponse = await chatSession.sendMessage({
      message,
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
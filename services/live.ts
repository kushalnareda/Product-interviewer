import { GoogleGenAI, Modality } from "@google/genai";
import { getSystemInstruction } from '../types';

export class LiveClient {
  private session: Promise<any> | null = null;

  constructor() {
    // Client is initialized in connect() to ensure API_KEY is ready
  }

  connect(callbacks: {
    onOpen: () => void;
    onMessage: (data: any) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
  }, initialContext?: string) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }

    const ai = new GoogleGenAI({ apiKey });

    this.session = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        systemInstruction: getSystemInstruction(initialContext),
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
      callbacks: {
        onopen: callbacks.onOpen,
        onmessage: callbacks.onMessage,
        onerror: callbacks.onError,
        onclose: callbacks.onClose,
      }
    });
    return this.session;
  }

  async sendAudio(blob: any) {
    if (!this.session) return;
    try {
        const session = await this.session;
        session.sendRealtimeInput({ media: blob });
    } catch (e) {
        console.error("Error sending audio:", e);
    }
  }
  
  async close() {
    if (this.session) {
        try {
            const s = await this.session;
            s.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
    }
    this.session = null;
  }
}

export const liveClient = new LiveClient();
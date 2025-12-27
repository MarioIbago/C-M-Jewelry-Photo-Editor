import { GoogleGenAI } from "@google/genai";

/**
 * Edits an image using Gemini 2.5 Flash Image.
 * Initializes the AI client using process.env.API_KEY as per security standards.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string
): Promise<string> => {
  // The API key is obtained exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean base64 string if it has prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Act as a professional high-end jewelry photo editor. ${prompt}. Return ONLY the edited image part. Maintain high resolution, sharp details, and realistic luxury lighting.`,
          },
        ],
      },
    });

    // Extract image part from response candidates
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("The model did not return an image part.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Transcribes audio using Gemini 3 Flash.
 * @param audioBlob The recorded audio blob.
 * @returns The transcribed text.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  // The API key is obtained exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Convert blob to base64 for multimodal processing
  const base64Audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio,
            },
          },
          {
            text: "Please transcribe this audio input precisely. Provide only the text of the transcription.",
          },
        ],
      },
    });

    // Access text property directly as per latest SDK guidelines
    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};
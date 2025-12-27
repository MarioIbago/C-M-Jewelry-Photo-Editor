import { GoogleGenAI } from "@google/genai";

/**
 * Edits an image using Gemini 2.5 Flash Image.
 * Initializes a new client instance for each call to ensure the latest API key is used.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string
): Promise<string> => {
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
            text: `Act as a professional high-end jewelry photo editor. ${prompt}. Return ONLY the edited image part. Maintain high resolution and realistic lighting.`,
          },
        ],
      },
    });

    // Extract image part from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image was returned by the model.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    throw error;
  }
};

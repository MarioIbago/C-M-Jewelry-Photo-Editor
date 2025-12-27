import { GoogleGenAI } from "@google/genai";

/**
 * Edits an image using Gemini 2.5 Flash Image.
 * Initializes the AI client using process.env.API_KEY as per security standards.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  aspectRatio: string = '4:5'
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
            text: `Act as a professional high-end jewelry photo editor. ${prompt}. 
            IMPORTANT: The output image MUST have an aspect ratio of ${aspectRatio}. 
            If the input is different, crop or extend the background elegantly to fit ${aspectRatio}.
            Return ONLY the edited image part. Maintain high resolution, sharp details, and realistic luxury lighting.`,
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
    
    // Check for text refusal
    if (candidate?.content?.parts?.[0]?.text) {
       console.warn("Model text response:", candidate.content.parts[0].text);
    }

    throw new Error("The model did not return an image part. Please try again.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('403')) {
      throw new Error("Permission Denied (403). Ensure you are using a supported model like gemini-2.5-flash-image.");
    }
    throw error;
  }
};

/**
 * Generates an Instagram caption for a jewelry image.
 */
export const generateJewelryCaption = async (
  imageBase64: string, 
  userIdea: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Multimodal model suitable for text generation from images
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Act as a Social Media Manager for a luxury jewelry brand called 'CM Jewelry Studio'.
            Write an engaging, elegant, and high-converting Instagram caption based on the attached image and this context: "${userIdea}".
            
            MANDATORY REQUIREMENTS:
            1. Tone: Sophisticated, minimal, luxury.
            2. MUST include the phrase: "📍 Envío en MTY".
            3. MUST include the phrase: "📩 Pedidos por DM".
            4. Use line breaks for readability.
            5. Add 3-5 relevant high-performing hashtags for jewelry in Mexico.
            
            Return ONLY the caption text.`,
          },
        ],
      },
    });

    return response.text || "Could not generate caption.";
  } catch (error) {
    console.error("Caption Generation Error:", error);
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
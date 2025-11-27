
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ScriptAnalysisResult, AspectRatio, ArtStyle } from "../types";

// Helper to get API key safely
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables");
    return "";
  }
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Analyzes a raw script text and breaks it down into shots.
 */
export const analyzeScript = async (scriptText: string): Promise<ScriptAnalysisResult> => {
  if (!scriptText.trim()) throw new Error("Script is empty");

  const prompt = `
    You are a professional film director and cinematographer. 
    Analyze the following movie script segment. 
    Break it down into a list of visual shots (storyboard panels).
    For each shot, provide:
    1. sceneHeader: The Scene Header (e.g., INT. ROOM - DAY) translated to Simplified Chinese (e.g., 内景 房间 - 日).
    2. actionDescription: A concise Action Description of what happens in Simplified Chinese.
    3. cameraAngle: A Camera Angle (Wide, Close-up, etc.) in Simplified Chinese (e.g., 特写, 广角).
    4. visualPrompt: A highly descriptive English prompt suitable for an image generation AI (detailed lighting, composition, style).
    
    Also extract the main characters present (names and descriptions in Simplified Chinese).
  `;

  // Define schema for structured JSON output
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      shots: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneHeader: { type: Type.STRING },
            actionDescription: { type: Type.STRING },
            cameraAngle: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
          },
          required: ["sceneHeader", "actionDescription", "cameraAngle", "visualPrompt"],
        },
      },
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["name", "description"],
        },
      },
    },
    required: ["shots", "characters"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { text: scriptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert storyboard artist and director.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText) as { shots: any[], characters: any[] };
    
    // Map to our internal types adding IDs
    return {
      shots: result.shots.map((s, i) => ({ ...s, id: `shot-${Date.now()}-${i}`, isGenerating: false })),
      characters: result.characters.map((c, i) => ({ ...c, id: `char-${Date.now()}-${i}` })),
    };

  } catch (error) {
    console.error("Script analysis failed:", error);
    throw error;
  }
};

/**
 * Maps internal ArtStyle enum to prompt suffixes.
 */
const getStylePrompt = (style: ArtStyle): string => {
  switch (style) {
    case ArtStyle.CINEMATIC_REALISM:
      return "cinematic film still, photorealistic, 8k, highly detailed, dramatic lighting, movie scene, depth of field";
    case ArtStyle.CONCEPT_ART:
      return "digital concept art, atmospheric, painterly style, artstation, vibrant colors, fantasy art style";
    case ArtStyle.ANIME:
      return "anime style, makoto shinkai style, cel shaded, vibrant, high quality 2d animation";
    case ArtStyle.SKETCH:
      return "black and white storyboard sketch, rough pencil drawing, gestural lines, minimal shading, hand drawn";
    default:
      return "cinematic film still";
  }
};

/**
 * Maps internal AspectRatio to Gemini API supported aspect ratios.
 * Gemini supports: "1:1", "3:4", "4:3", "9:16", "16:9"
 */
const getApiAspectRatio = (ratio: AspectRatio): string => {
  switch (ratio) {
    case AspectRatio.RATIO_239_1:
      return "16:9"; // Closest supported, will be cropped in UI
    case AspectRatio.RATIO_16_9:
      return "16:9";
    case AspectRatio.RATIO_4_3:
      return "4:3";
    case AspectRatio.RATIO_9_16:
      return "9:16";
    case AspectRatio.RATIO_1_1:
      return "1:1";
    default:
      return "16:9";
  }
};

/**
 * Generates an initial image for a shot description.
 * Using gemini-2.5-flash-image for generation.
 */
export const generateShotImage = async (
  visualPrompt: string, 
  style: ArtStyle = ArtStyle.CINEMATIC_REALISM,
  ratio: AspectRatio = AspectRatio.RATIO_239_1
): Promise<string> => {
  try {
    const styleSuffix = getStylePrompt(style);
    const fullPrompt = `Generate a high quality image. ${visualPrompt}, ${styleSuffix}.`;
    
    const apiRatio = getApiAspectRatio(ratio);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        { text: fullPrompt }
      ],
      config: {
        imageConfig: {
          aspectRatio: apiRatio as any, // Cast to any to avoid type complaints if type defs aren't perfect yet
        }
      }
    });

    // Check for image in parts
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
       for (const part of candidates[0].content.parts) {
         if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
         }
       }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Image generation failed:", error);
    // Fallback for demo purposes if API doesn't return image bytes directly for this model/prompt combo
    return `https://picsum.photos/seed/${Math.random()}/800/450`; 
  }
};

/**
 * Edits an existing image based on a text prompt.
 * KEY FEATURE: Uses Gemini 2.5 Flash Image.
 */
export const editShotImage = async (base64Image: string, editInstruction: string): Promise<string> => {
  try {
    // Strip prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", 
              data: cleanBase64,
            },
          },
          {
            text: `Edit this image. ${editInstruction}. Maintain the style of a storyboard. Return the result as an image.`,
          },
        ],
      },
    });

    // Extract the new image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Model did not return an edited image.");
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

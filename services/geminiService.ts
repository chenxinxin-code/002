
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ScriptAnalysisResult, AspectRatio, ArtStyle, ModelType } from "../types";

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

  // Reduced truncate limit to 15000 chars to avoid RPC/Payload errors on large scripts
  const truncatedScript = scriptText.length > 15000 ? scriptText.substring(0, 15000) : scriptText;

  const prompt = `
    You are a professional film director. 
    Analyze the following movie script segment. 
    Break it down into a list of visual shots.
    For each shot, provide:
    1. sceneHeader: Translated to Simplified Chinese.
    2. actionDescription: Concise description in Simplified Chinese.
    3. cameraAngle: In Simplified Chinese (e.g., 特写, 广角).
    4. visualPrompt: A highly descriptive English prompt for image generation.
    
    Also extract main characters.
  `;

  // Define schema for structured output
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
            visualPrompt: { type: Type.STRING }
          },
          required: ["sceneHeader", "actionDescription", "cameraAngle", "visualPrompt"]
        }
      },
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    },
    required: ["shots", "characters"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: prompt + "\n\nSCRIPT:\n" + truncatedScript }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    if (response.text) {
      try {
        const parsed = JSON.parse(response.text);
        return {
          shots: parsed.shots.map((s: any, i: number) => ({
            ...s,
            id: `shot-${Date.now()}-${i}`,
            isGenerating: false
          })),
          characters: parsed.characters.map((c: any, i: number) => ({
            ...c,
            id: `char-${Date.now()}-${i}`
          }))
        };
      } catch (parseError) {
        console.error("JSON Parse Error on Script Analysis:", parseError);
        throw new Error("Failed to parse AI response");
      }
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Script Analysis API Error:", error);
    throw error;
  }
};

const getStylePrompt = (style: ArtStyle): string => {
  switch (style) {
    case ArtStyle.CINEMATIC_REALISM:
      return "cinematic lighting, photorealistic, 8k, detailed textures, depth of field, film grain";
    case ArtStyle.GUOFENG_ANIME:
      return "Chinese anime style, delicate lines, ethereal atmosphere, elegant costumes, ancient Chinese aesthetics";
    case ArtStyle.INK_WASH:
      return "traditional Chinese ink wash painting, sumi-e style, black and white with subtle colors";
    case ArtStyle.CYBERPUNK:
      return "cyberpunk aesthetic, neon lights, high contrast, futuristic city, rain, reflections";
    case ArtStyle.CLAYMATION:
      return "claymation style, stop motion, plasticine texture, handmade look, soft studio lighting";
    case ArtStyle.PIXEL_ART:
      return "pixel art, 16-bit, retro game style, dithering, limited color palette";
    case ArtStyle.CONCEPT_ART:
      return "digital concept art, painterly style, atmospheric perspective, highly detailed environment";
    case ArtStyle.ANIME:
      return "Japanese anime style, cel shaded, vibrant colors, expressive characters";
    case ArtStyle.WATERCOLOR:
      return "watercolor painting, wet on wet, paper texture, soft edges, artistic, dreamy";
    case ArtStyle.SKETCH:
      return "black and white pencil sketch, storyboard drawing, rough lines, charcoal";
    default:
      return "cinematic";
  }
};

export const generateShotImage = async (
  basePrompt: string,
  style: ArtStyle,
  aspectRatio: AspectRatio,
  modelType: ModelType,
  subjectRef?: string,
  styleRef?: string[] // Changed to array of base64 strings
): Promise<string> => {
  
  const styleModifiers = getStylePrompt(style);
  
  let textPrompt = "";
  
  // Inject Subject Reference (Character Description)
  if (subjectRef && subjectRef.trim()) {
     textPrompt += `SUBJECT DESCRIPTION: ${subjectRef}. `;
  }

  // Add the main visual action (The user edited Chinese description)
  textPrompt += `SCENE DESCRIPTION: ${basePrompt}. `;

  // Add technical style modifiers
  textPrompt += `\nVISUAL STYLE: ${styleModifiers}. `;
  textPrompt += `\nAspect Ratio: ${aspectRatio}.`;

  console.log("Generating with Text Prompt:", textPrompt);

  // Determine model name
  const modelName = modelType === ModelType.GEMINI_NANO_PRO 
    ? 'gemini-3-pro-image-preview'
    : 'gemini-2.5-flash-image'; 

  // Construct Content Parts
  const parts: any[] = [{ text: textPrompt }];

  // Add Style Reference Images (Multimodal)
  if (styleRef && styleRef.length > 0) {
    // Add instruction for the images
    parts.push({ text: "Use the following images as Style Reference (lighting, color, atmosphere):" });
    
    styleRef.forEach(base64Str => {
      // Strip prefix if present
      const cleanBase64 = base64Str.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/png", // Assuming PNG/JPEG, API usually handles detection or generic image type
          data: cleanBase64
        }
      });
    });
  }

  // Use Gemini for everything now to support multimodal
  try {
    const validRatio = aspectRatio as any;
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { role: "user", parts: parts }
      ],
      config: {
          imageConfig: {
            aspectRatio: validRatio
          }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("Generation failed: No image returned");
  } catch (e) {
    console.error("Gemini Generation Error", e);
    throw e;
  }
};

// ... keep editShotImage and analyzeImage as is ...
export const editShotImage = async (
  imageBase64: string,
  editInstruction: string
): Promise<string> => {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/png", data: base64Data } },
            { text: `Edit this image: ${editInstruction}. Maintain style.` }
          ]
        }
      ]
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("Image edit failed");
  } catch (error) {
    console.error("Edit Error:", error);
    throw error;
  }
};

export const analyzeImage = async (
  imageBase64: string,
  type: 'subject' | 'style'
): Promise<string> => {
   const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
   const prompt = type === 'subject' 
     ? "Analyze this image and provide a concise physical description of the main character (age, hair, clothing, distinct features). Keep it under 50 words."
     : "Analyze the art style."; // Not used for style anymore, but kept for signature compatibility
   try {
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: [
         {
           role: "user",
           parts: [
             { inlineData: { mimeType: "image/jpeg", data: base64Data } },
             { text: prompt }
           ]
         }
       ]
     });
     return response.text?.trim() || "Analysis failed";
   } catch (error) {
     console.error("Image Analysis Error", error);
     throw error;
   }
}
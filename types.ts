
export enum AspectRatio {
  RATIO_239_1 = "2.39:1",
  RATIO_16_9 = "16:9",
  RATIO_4_3 = "4:3",
  RATIO_9_16 = "9:16",
  RATIO_1_1 = "1:1"
}

export enum ArtStyle {
  CINEMATIC_REALISM = "cinematic-realism",
  GUOFENG_ANIME = "guofeng-anime",
  INK_WASH = "ink-wash",
  CYBERPUNK = "cyberpunk",
  CLAYMATION = "claymation",
  PIXEL_ART = "pixel-art",
  CONCEPT_ART = "concept-art",
  ANIME = "anime",
  SKETCH = "sketch",
  WATERCOLOR = "watercolor"
}

export enum ModelType {
  GEMINI_NANO = "gemini-nano",           // Maps to gemini-2.5-flash-image
  GEMINI_NANO_PRO = "gemini-nano-pro",   // Maps to gemini-3-pro-image-preview
  IMAGEN_4 = "imagen-4",                 // Maps to imagen-4.0-generate-001
  FLUX_REALISM = "flux-realism",         // Simulation via prompt
  MIDJOURNEY_V6 = "midjourney-v6",       // Simulation via prompt
  NIJI_V6 = "niji-v6",                   // Simulation via prompt
  SDXL_TURBO = "sdxl-turbo"              // Simulation via prompt
}

export interface ShotSettings {
  aspectRatio: AspectRatio;
  artStyle: ArtStyle;
  modelType: ModelType;
  subjectReference?: string; 
  styleReference?: string[];   // Changed to array of base64 strings
}

export interface CharacterReference {
  id: string;
  name: string;      // The tag used to identify the character in script
  description: string; // The visual description extracted from image
  imageUrl: string;  // The base64 reference image
}

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImage?: string;
}

export interface ProjectSettings {
  defaultAspectRatio: AspectRatio;
  defaultArtStyle: ArtStyle;
  defaultModelType: ModelType;
  defaultSubjectReference: string;
  defaultStyleReference: string[]; // Changed to array of base64 strings
  characterLibrary: CharacterReference[];
}

export interface Shot {
  id: string;
  sceneHeader: string;
  actionDescription: string;
  cameraAngle: string; 
  visualPrompt: string; 
  imageUrl?: string; 
  variations?: string[]; // Store multiple image variations
  progress?: number;     // Tracking generation progress (0-100)
  isGenerating: boolean;
  overrideSettings?: Partial<ShotSettings>; 
}

export interface Episode {
  id: string;
  title: string;
  scriptContent: string;
  shots: Shot[];
  characters: Character[];
  lastAnalyzed?: number;
}

export interface ScriptAnalysisResult {
  shots: Shot[];
  characters: Character[];
}

export enum AppState {
  IDLE,
  ANALYZING,
  EDITING
}


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
  // STRICTLY AS REQUESTED
  GEMINI_3_PRO = "gemini-3-pro-image-preview",
  GEMINI_2_5_FLASH = "gemini-2.5-flash-image",
  IMAGEN_4_STD = "imagen-4.0-generate-001",
  IMAGEN_4_ULTRA = "imagen-4.0-ultra-generate-001",
  IMAGEN_4_FAST = "imagen-4.0-fast-generate-001",
  
  // Legacy/Simulation styles
  FLUX_REALISM = "flux-realism",         
  MIDJOURNEY_V6 = "midjourney-v6",       
  NIJI_V6 = "niji-v6",                   
  SDXL_TURBO = "sdxl-turbo"              
}

export interface CharacterReference {
  id: string;
  name: string;      // The tag used to identify the character in script
  description: string; // The visual description extracted from image
  imageUrl: string;  // The base64 reference image
}

// New Interface for Style References with Tags
export interface StyleReference {
  id: string;
  tag: string;       // User defined tag for the style (e.g., "Dream Sequence")
  imageUrl: string;  // Base64 image
}

export interface ShotSettings {
  aspectRatio: AspectRatio;
  artStyle: ArtStyle;
  modelType: ModelType;
  subjectReference?: string; 
  styleReference?: StyleReference[];   // Changed to array of objects
}

export interface ProjectSettings {
  defaultAspectRatio: AspectRatio;
  defaultArtStyle: ArtStyle;
  defaultModelType: ModelType;
  defaultSubjectReference: string;
  defaultStyleReference: StyleReference[]; // Changed to array of objects
  characterLibrary: CharacterReference[];
}

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImage?: string;
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

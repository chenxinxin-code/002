
export enum AspectRatio {
  RATIO_239_1 = "2.39:1",
  RATIO_16_9 = "16:9",
  RATIO_4_3 = "4:3",
  RATIO_9_16 = "9:16",
  RATIO_1_1 = "1:1"
}

export enum ArtStyle {
  CINEMATIC_REALISM = "cinematic-realism",
  CONCEPT_ART = "concept-art",
  ANIME = "anime",
  SKETCH = "sketch"
}

export interface ShotSettings {
  aspectRatio: AspectRatio;
  artStyle: ArtStyle;
}

export interface ProjectSettings {
  defaultAspectRatio: AspectRatio;
  defaultArtStyle: ArtStyle;
}

export interface Shot {
  id: string;
  sceneHeader: string;
  actionDescription: string;
  cameraAngle: string; // e.g., "Wide Shot", "Close Up"
  visualPrompt: string; // The translated prompt for the image model
  imageUrl?: string; // Base64 or URL
  isGenerating: boolean;
  // Settings specific to this shot. If null/undefined, use global project settings.
  overrideSettings?: Partial<ShotSettings>; 
}

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImage?: string;
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

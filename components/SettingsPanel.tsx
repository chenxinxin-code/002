
import React, { useState, useRef } from 'react';
import { ProjectSettings, Shot, AspectRatio, ArtStyle, ModelType, CharacterReference, StyleReference } from '../types';
import { analyzeImage } from '../services/geminiService';

interface SettingsPanelProps {
  projectSettings: ProjectSettings;
  selectedShot: Shot | null;
  onUpdateProjectSettings: (settings: ProjectSettings) => void;
  onUpdateShotSettings: (shotId: string, settings: Partial<Shot>['overrideSettings']) => void;
  onUpdateShotData: (shotId: string, updates: Partial<Shot>) => void; // For prompt editing
}

const ASPECT_RATIOS = [
  { value: AspectRatio.RATIO_239_1, label: '2.39:1 (Cinematic)' },
  { value: AspectRatio.RATIO_16_9, label: '16:9 (HDTV)' },
  { value: AspectRatio.RATIO_4_3, label: '4:3 (Academy)' },
  { value: AspectRatio.RATIO_9_16, label: '9:16 (Vertical)' },
  { value: AspectRatio.RATIO_1_1, label: '1:1 (Square)' },
];

const ART_STYLES = [
  { value: ArtStyle.CINEMATIC_REALISM, label: '电影写实 (Cinematic Realism)' },
  { value: ArtStyle.GUOFENG_ANIME, label: '国风动漫 (Guofeng Anime)' },
  { value: ArtStyle.INK_WASH, label: '水墨画 (Ink Wash Painting)' },
  { value: ArtStyle.CYBERPUNK, label: '赛博朋克 (Cyberpunk)' },
  { value: ArtStyle.CLAYMATION, label: '黏土动画 (Claymation)' },
  { value: ArtStyle.PIXEL_ART, label: '像素艺术 (Pixel Art)' },
  { value: ArtStyle.CONCEPT_ART, label: '2.5D 概念图 (Concept Art)' },
  { value: ArtStyle.ANIME, label: '日系动画 (Anime)' },
  { value: ArtStyle.WATERCOLOR, label: '艺术水彩 (Watercolor)' },
  { value: ArtStyle.SKETCH, label: '黑白线稿 (Storyboard Sketch)' },
];

const MODEL_TYPES = [
  { value: ModelType.GEMINI_3_PRO, label: 'gemini-3-pro-image-preview' },
  { value: ModelType.GEMINI_2_5_FLASH, label: 'gemini-2.5-flash-image' },
  { value: ModelType.IMAGEN_4_STD, label: 'imagen-4.0-generate-001' },
  { value: ModelType.IMAGEN_4_ULTRA, label: 'imagen-4.0-ultra-generate-001' },
  { value: ModelType.IMAGEN_4_FAST, label: 'imagen-4.0-fast-generate-001' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  projectSettings,
  selectedShot,
  onUpdateProjectSettings,
  onUpdateShotSettings,
  onUpdateShotData
}) => {
  const isGlobalMode = !selectedShot;
  
  // Character Library State
  const [analyzingChar, setAnalyzingChar] = useState(false);
  const [newCharImage, setNewCharImage] = useState<string | null>(null);
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [isAddingChar, setIsAddingChar] = useState(false);
  
  // File input refs
  const charFileRef = useRef<HTMLInputElement>(null);
  const styleFileRef = useRef<HTMLInputElement>(null);

  // Helpers to handle changes
  const handleGlobalChange = (key: keyof ProjectSettings, value: any) => {
    onUpdateProjectSettings({ ...projectSettings, [key]: value });
  };

  const handleShotChange = (key: keyof import('../types').ShotSettings, value: any) => {
    if (!selectedShot) return;
    const currentOverrides = selectedShot.overrideSettings || {};
    onUpdateShotSettings(selectedShot.id, { ...currentOverrides, [key]: value });
  };

  const toggleShotOverride = (enable: boolean) => {
    if (!selectedShot) return;
    if (enable) {
      // Initialize with current global values if enabling overrides
      onUpdateShotSettings(selectedShot.id, {
        aspectRatio: projectSettings.defaultAspectRatio,
        artStyle: projectSettings.defaultArtStyle,
        modelType: projectSettings.defaultModelType,
        subjectReference: projectSettings.defaultSubjectReference,
        styleReference: projectSettings.defaultStyleReference
      });
    } else {
      // Clear overrides to inherit global
      onUpdateShotSettings(selectedShot.id, undefined);
    }
  };

  // --- Character Library Logic ---

  const handleCharImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingChar(true);
    setIsAddingChar(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setNewCharImage(base64String);
        try {
          const description = await analyzeImage(base64String, 'subject');
          setNewCharDesc(description);
          setNewCharName(""); // Reset name for user input
        } catch (err) {
          alert("角色分析失败");
        } finally {
          setAnalyzingChar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setAnalyzingChar(false);
    }
  };

  const saveCharacter = () => {
    if (!newCharName.trim() || !newCharDesc.trim() || !newCharImage) return;
    
    const newChar: CharacterReference = {
      id: Date.now().toString(),
      name: newCharName.trim(),
      description: newCharDesc.trim(),
      imageUrl: newCharImage
    };

    const updatedLibrary = [...(projectSettings.characterLibrary || []), newChar];
    handleGlobalChange('characterLibrary', updatedLibrary);
    
    // Reset
    setNewCharImage(null);
    setNewCharName('');
    setNewCharDesc('');
    setIsAddingChar(false);
  };

  const removeCharacter = (id: string) => {
    const updatedLibrary = (projectSettings.characterLibrary || []).filter(c => c.id !== id);
    handleGlobalChange('characterLibrary', updatedLibrary);
  };

  // --- Style Logic (Image Upload with Tag) ---

  const handleStyleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentRefs = isGlobalMode ? projectSettings.defaultStyleReference : (selectedShot?.overrideSettings?.styleReference ?? projectSettings.defaultStyleReference);
    
    if (currentRefs && currentRefs.length >= 3) {
      alert("最多只能上传 3 张风格参考图。");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Prompt user for a tag
        const tag = prompt("请为这张参考图输入标签 (例如: '赛博夜景', '复古色调'):", "风格参考");
        
        if (tag) {
            const newRef: StyleReference = {
                id: Date.now().toString(),
                tag: tag,
                imageUrl: base64String
            };
            const newRefs = [...(currentRefs || []), newRef];
            
            if (isGlobalMode) handleGlobalChange('defaultStyleReference', newRefs);
            else handleShotChange('styleReference', newRefs);
        }
        
        if (e.target) e.target.value = ''; // Reset input
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    }
  };

  const removeStyleRef = (id: string) => {
    const currentRefs = isGlobalMode ? projectSettings.defaultStyleReference : (selectedShot?.overrideSettings?.styleReference ?? projectSettings.defaultStyleReference);
    if (!currentRefs) return;
    
    const newRefs = currentRefs.filter((ref) => ref.id !== id);
    if (isGlobalMode) handleGlobalChange('defaultStyleReference', newRefs);
    else handleShotChange('styleReference', newRefs);
  };

  const shotHasOverrides = !!selectedShot?.overrideSettings;

  // Get current values based on mode
  const currentAspectRatio = isGlobalMode ? projectSettings.defaultAspectRatio : (selectedShot?.overrideSettings?.aspectRatio || projectSettings.defaultAspectRatio);
  const currentArtStyle = isGlobalMode ? projectSettings.defaultArtStyle : (selectedShot?.overrideSettings?.artStyle || projectSettings.defaultArtStyle);
  const currentModelType = isGlobalMode ? projectSettings.defaultModelType : (selectedShot?.overrideSettings?.modelType || projectSettings.defaultModelType);
  const currentStyleRefs = isGlobalMode ? projectSettings.defaultStyleReference : (selectedShot?.overrideSettings?.styleReference ?? projectSettings.defaultStyleReference);
  const characterLibrary = projectSettings.characterLibrary || [];

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700 w-full text-sm">
      <div className="p-4 border-b border-gray-700 bg-gray-850 select-none">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
           <div className="drag-handle cursor-grab text-gray-600 hover:text-gray-300 p-1 rounded hover:bg-gray-800 transition-colors" title="拖拽移动模块">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path></svg>
          </div>
          {isGlobalMode ? (
            <>
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              项目设置 (Global)
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              镜头设置 #{selectedShot.id.split('-').pop()}
            </>
          )}
        </h2>
      </div>

      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        
        {/* Inheritance Control for Shot Mode */}
        {!isGlobalMode && (
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
             <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!shotHasOverrides}
                  onChange={(e) => toggleShotOverride(!e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <span className="text-gray-300">跟随全局设置 (Inherit Global)</span>
             </label>
          </div>
        )}

        {/* Inputs */}
        <div className={`space-y-8 transition-opacity ${!isGlobalMode && !shotHasOverrides ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          
          {/* Section 1: Visual Specs */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-2">
              画面规格 & 引擎
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">画面比例</label>
              <select
                value={currentAspectRatio}
                onChange={(e) => isGlobalMode 
                  ? handleGlobalChange('defaultAspectRatio', e.target.value)
                  : handleShotChange('aspectRatio', e.target.value)
                }
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
              >
                {ASPECT_RATIOS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">渲染风格 (Style)</label>
              <select
                value={currentArtStyle}
                onChange={(e) => isGlobalMode
                  ? handleGlobalChange('defaultArtStyle', e.target.value)
                  : handleShotChange('artStyle', e.target.value)
                }
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
              >
                {ART_STYLES.map(s => (
                  <option key={s.value} value={s.label}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">基座模型 (Model)</label>
              <select
                value={currentModelType}
                onChange={(e) => isGlobalMode
                  ? handleGlobalChange('defaultModelType', e.target.value)
                  : handleShotChange('modelType', e.target.value)
                }
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
              >
                {MODEL_TYPES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Character Library */}
          <div className={`space-y-4 rounded-lg p-3 border-2 ${isGlobalMode ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700'}`}>
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest border-b border-gray-600/50 pb-2 flex items-center justify-between">
              角色库 (Character Consistency)
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm">PROMPT 增强</span>
            </h3>

            {/* Existing Characters List */}
            {characterLibrary.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {characterLibrary.map(char => (
                  <div key={char.id} className="bg-gray-800 p-2 rounded border border-gray-700 flex gap-3 relative group hover:border-blue-500 transition-colors">
                    <img src={char.imageUrl} alt={char.name} className="w-12 h-12 object-cover rounded bg-black shrink-0" />
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div className="font-bold text-xs text-blue-400">标签: {char.name}</div>
                      <div className="text-[10px] text-gray-500 truncate" title={char.description}>{char.description}</div>
                    </div>
                    <button 
                      onClick={() => removeCharacter(char.id)}
                      className="absolute top-1 right-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Character Form */}
            {isAddingChar ? (
               <div className="bg-gray-800 p-3 rounded border border-blue-500/50 space-y-3 animate-fade-in">
                 {newCharImage && (
                   <div className="w-full h-32 bg-black rounded overflow-hidden flex items-center justify-center relative">
                      <img src={newCharImage} className="h-full object-contain" />
                      {analyzingChar && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                          <span className="text-[10px] text-blue-300">AI 正在识别外貌特征...</span>
                        </div>
                      )}
                   </div>
                 )}
                 <input 
                   type="text" 
                   placeholder="角色标签 (例: 凯, 润儿)" 
                   value={newCharName}
                   onChange={(e) => setNewCharName(e.target.value)}
                   className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs focus:border-blue-500 outline-none"
                 />
                 <textarea 
                   placeholder="AI 分析的角色特征..." 
                   value={newCharDesc}
                   onChange={(e) => setNewCharDesc(e.target.value)}
                   className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs h-16 resize-none focus:border-blue-500 outline-none"
                 />
                 <div className="flex gap-2">
                   <button onClick={saveCharacter} disabled={analyzingChar || !newCharName.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs disabled:opacity-50 font-medium">保存角色</button>
                   <button onClick={() => { setIsAddingChar(false); setNewCharImage(null); }} className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs">取消</button>
                 </div>
               </div>
            ) : (
              characterLibrary.length < 3 && (
                <button 
                  onClick={() => charFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500/50 bg-gray-800/30 hover:bg-gray-800 text-gray-400 hover:text-blue-400 py-4 rounded-lg flex flex-col items-center gap-1 transition-all group"
                >
                  <div className="p-2 bg-gray-800 rounded-full group-hover:bg-blue-500/20 transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <span className="text-xs">上传角色参考图 (自动识别)</span>
                </button>
              )
            )}
            <input 
              type="file" 
              ref={charFileRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleCharImageUpload} 
            />

            <p className="text-[10px] text-gray-500 leading-relaxed px-1">
              * 上传角色图片并设置标签（如“凯”）。当剧本或提示词中出现该标签时，AI 将自动注入该角色的外貌描述。
            </p>
          </div>

          {/* Section 3: Style Reference (Images with Tags) */}
          <div className={`space-y-4 rounded-lg p-3 border-2 ${isGlobalMode ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700'}`}>
             <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest border-b border-gray-600/50 pb-2 flex items-center justify-between">
              风格/环境参考 (Style)
              <span className="text-[10px] text-gray-500">{currentStyleRefs?.length || 0}/3</span>
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                 {currentStyleRefs?.map((ref) => (
                   <div key={ref.id} className="flex items-center gap-3 bg-gray-800 p-2 rounded border border-gray-700 group hover:border-blue-500 transition-colors">
                      <img src={ref.imageUrl} className="w-10 h-10 object-cover rounded bg-black shrink-0" />
                      <div className="flex-1 overflow-hidden min-w-0">
                         <div className="text-[10px] text-gray-400 uppercase tracking-wider">Style Tag</div>
                         <div className="font-bold text-xs text-green-400 truncate">{ref.tag}</div>
                      </div>
                      <button 
                        onClick={() => removeStyleRef(ref.id)}
                        className="text-gray-600 hover:text-red-400 p-1"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                   </div>
                 ))}
                 
                 {(!currentStyleRefs || currentStyleRefs.length < 3) && (
                   <button 
                    onClick={() => styleFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-700 hover:border-green-500/50 bg-gray-800/30 hover:bg-gray-800 text-gray-400 hover:text-green-400 py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
                   >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-[10px]">上传风格参考图 + 打标签</span>
                   </button>
                 )}
              </div>
              <input 
                type="file" 
                ref={styleFileRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleStyleUpload} 
              />
              <p className="text-[10px] text-gray-500 leading-relaxed px-1">
                 * 上传 1-3 张图片并打上标签（如“赛博朋克”），AI 将结合该图片与标签生成画面。
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className="p-4 bg-gray-850 border-t border-gray-700 text-xs text-gray-500 text-center">
        {isGlobalMode ? '修改全局设置将影响所有新生成的镜头' : '当前仅修改此镜头的属性'}
      </div>
    </div>
  );
};

export default SettingsPanel;

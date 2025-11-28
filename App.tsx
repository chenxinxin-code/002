
import React, { useState, useRef } from 'react';
import ScriptPanel from './components/ScriptPanel';
import ShotCard from './components/ShotCard';
import EditorModal from './components/EditorModal';
import SettingsPanel from './components/SettingsPanel';
import EpisodeList from './components/EpisodeList';
import Lightbox from './components/Lightbox';
import { Shot, Character, CharacterReference, ScriptAnalysisResult, ProjectSettings, AspectRatio, ArtStyle, Episode, ModelType } from './types';
import { analyzeScript, generateShotImage } from './services/geminiService';
import JSZip from 'jszip';

const DEFAULT_SCRIPT = `内景 霓虹面馆 - 夜

窗外雨水冲刷着霓虹灯的倒影。凯（30多岁，颓废，机械手臂）佝偻着背，对着一碗热气腾腾的面条。

他看了一眼手表。全息投影信息闪烁着：“目标即将到达”。

门滑开了。一个模糊的人影走了进来，全身湿透。

凯
(头也不抬)
你迟到了。`;

// Added 'episode' back to PanelId type
type PanelId = 'episode' | 'script' | 'main' | 'settings';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  
  // Episode/Script State
  const [episodes, setEpisodes] = useState<Episode[]>([
    {
      id: 'ep-1',
      title: '第一场：霓虹面馆',
      scriptContent: DEFAULT_SCRIPT,
      shots: [],
      characters: [],
    }
  ]);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string>('ep-1');

  // UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [viewingShot, setViewingShot] = useState<Shot | null>(null); // For Lightbox
  const [isZenMode, setIsZenMode] = useState(false); // Zen Mode State
  const [isTimelineFullscreen, setIsTimelineFullscreen] = useState(false); // Timeline Fullscreen State
  
  // Layout Dimensions State
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(['episode', 'script', 'main', 'settings']);
  const [panelWidths, setPanelWidths] = useState<Record<PanelId, number>>({
    episode: 200,
    script: 320,
    main: 0, // Flex
    settings: 320
  });
  const [timelineHeight, setTimelineHeight] = useState(160);

  // Drag & Drop State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Project Global Settings
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    defaultAspectRatio: AspectRatio.RATIO_239_1,
    defaultArtStyle: ArtStyle.CINEMATIC_REALISM,
    defaultModelType: ModelType.GEMINI_2_5_FLASH, 
    defaultSubjectReference: "",
    defaultStyleReference: [], // Empty array of style refs
    characterLibrary: [] 
  });

  // Derived State
  const currentEpisode = episodes.find(e => e.id === currentEpisodeId) || episodes[0];
  const selectedShot = currentEpisode.shots.find(s => s.id === selectedShotId) || null;

  // --- ACTIONS ---

  const handleAddEpisode = () => {
    const newId = `ep-${Date.now()}`;
    const newEpisode: Episode = {
      id: newId,
      title: `新剧集 ${episodes.length + 1}`,
      scriptContent: '',
      shots: [],
      characters: []
    };
    setEpisodes([...episodes, newEpisode]);
    setCurrentEpisodeId(newId);
  };

  const handleRenameEpisode = (id: string, newName: string) => {
    setEpisodes(prev => prev.map(e => e.id === id ? { ...e, title: newName } : e));
  };

  const handleDeleteEpisode = (id: string) => {
    const newEpisodes = episodes.filter(e => e.id !== id);
    if (newEpisodes.length === 0) return; 
    setEpisodes(newEpisodes);
    if (currentEpisodeId === id) {
      setCurrentEpisodeId(newEpisodes[0].id);
    }
  };

  const handleScriptChange = (newScript: string) => {
    setEpisodes(prev => prev.map(e => e.id === currentEpisodeId ? { ...e, scriptContent: newScript } : e));
  };

  const handleAnalyzeScript = async () => {
    if (!currentEpisode.scriptContent.trim()) return;
    setIsAnalyzing(true);
    try {
      const result: ScriptAnalysisResult = await analyzeScript(currentEpisode.scriptContent);
      setEpisodes(prev => prev.map(e => e.id === currentEpisodeId ? { 
        ...e, 
        shots: result.shots, 
        characters: result.characters,
        lastAnalyzed: Date.now()
      } : e));
    } catch (error) {
      alert("剧本解析失败，请检查 API Key 并重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to detect characters in text
  const detectCharactersInText = (text: string) => {
    if (!projectSettings.characterLibrary || projectSettings.characterLibrary.length === 0) return [];
    
    return projectSettings.characterLibrary
      .filter(char => text.toLowerCase().includes(char.name.toLowerCase()))
      .map(char => char.name);
  };

  // Core Generation Logic - supports Batch (count > 1)
  const handleGenerateShot = async (shot: Shot, count: number = 1) => {
    // 1. Setup Prompt and Config
    const effectiveAspectRatio = shot.overrideSettings?.aspectRatio || projectSettings.defaultAspectRatio;
    const effectiveArtStyle = shot.overrideSettings?.artStyle || projectSettings.defaultArtStyle;
    const effectiveModelType = shot.overrideSettings?.modelType || projectSettings.defaultModelType;
    let effectiveSubjectRef = shot.overrideSettings?.subjectReference ?? projectSettings.defaultSubjectReference;
    const effectiveStyleRef = shot.overrideSettings?.styleReference ?? projectSettings.defaultStyleReference;

    const shotText = (shot.actionDescription + " " + shot.visualPrompt).toLowerCase();
    
    if (projectSettings.characterLibrary && projectSettings.characterLibrary.length > 0) {
      const matchedCharacters = projectSettings.characterLibrary.filter(char => 
        shotText.includes(char.name.toLowerCase())
      );
      if (matchedCharacters.length > 0) {
         const charDescriptions = matchedCharacters.map(c => `[Character Reference for ${c.name}: ${c.description}]`).join(" ");
         effectiveSubjectRef = effectiveSubjectRef ? `${effectiveSubjectRef}. ${charDescriptions}` : charDescriptions;
      }
    }

    const promptToUse = shot.actionDescription || shot.visualPrompt;

    // 2. Update Status to Generating
    setEpisodes(prev => prev.map(e => {
      if (e.id !== currentEpisodeId) return e;
      return {
        ...e,
        shots: e.shots.map(s => s.id === shot.id ? { ...s, isGenerating: true, progress: 0 } : s)
      };
    }));

    // 3. Batch Processing
    const generatedImages: string[] = [];
    let completedCount = 0;

    // Function to execute a single generation
    const generateOne = async () => {
      try {
        const url = await generateShotImage(
          promptToUse, 
          effectiveArtStyle, 
          effectiveAspectRatio,
          effectiveModelType,
          effectiveSubjectRef,
          effectiveStyleRef
        );
        generatedImages.push(url);
      } catch (err) {
        console.error("Single gen failed", err);
      } finally {
        completedCount++;
        const progress = Math.round((completedCount / count) * 100);
        
        // Update progress bar
        setEpisodes(prev => prev.map(e => {
          if (e.id !== currentEpisodeId) return e;
          return {
            ...e,
            shots: e.shots.map(s => s.id === shot.id ? { ...s, progress: progress } : s)
          };
        }));
      }
    };

    // Execute all promises
    const promises = Array.from({ length: count }, () => generateOne());
    await Promise.all(promises);

    // 4. Final Update
    if (generatedImages.length > 0) {
      setEpisodes(prev => prev.map(e => {
        if (e.id !== currentEpisodeId) return e;
        return {
          ...e,
          shots: e.shots.map(s => s.id === shot.id ? { 
            ...s, 
            imageUrl: generatedImages[0], // Defaults to the first one
            variations: generatedImages, 
            isGenerating: false, 
            progress: 100 
          } : s)
        };
      }));
    } else {
      // Handle full failure
      setEpisodes(prev => prev.map(e => {
        if (e.id !== currentEpisodeId) return e;
        return {
          ...e,
          shots: e.shots.map(s => s.id === shot.id ? { ...s, isGenerating: false, progress: 0 } : s)
        };
      }));
      alert("生成失败，请检查网络或 Key 设置。");
    }
  };

  // Wrappers for Card Actions
  const onGenerateSingle = (shot: Shot) => handleGenerateShot(shot, 1);
  const onGenerateBatch = (shot: Shot) => handleGenerateShot(shot, 4);

  const handleUpdateShot = (updatedShot: Shot) => {
    setEpisodes(prev => prev.map(e => {
      if (e.id !== currentEpisodeId) return e;
      return {
        ...e,
        shots: e.shots.map(s => s.id === updatedShot.id ? updatedShot : s)
      };
    }));
    setEditingShot(updatedShot);
  };

  const handleUpdateShotSettings = (shotId: string, overrides: Partial<Shot>['overrideSettings']) => {
    setEpisodes(prev => prev.map(e => {
      if (e.id !== currentEpisodeId) return e;
      return {
        ...e,
        shots: e.shots.map(s => s.id === shotId ? { ...s, overrideSettings: overrides } : s)
      };
    }));
  };

  const handleUpdateShotData = (shotId: string, updates: Partial<Shot>) => {
    setEpisodes(prev => prev.map(e => {
       if (e.id !== currentEpisodeId) return e;
       return {
         ...e,
         shots: e.shots.map(s => s.id === shotId ? { ...s, ...updates } : s)
       };
    }));
  };

  const handleSelectVariation = (shotId: string, variationUrl: string) => {
    setEpisodes(prev => prev.map(e => {
      if (e.id !== currentEpisodeId) return e;
      return {
        ...e,
        shots: e.shots.map(s => s.id === shotId ? { ...s, imageUrl: variationUrl } : s)
      };
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // Add Script Content
      episodes.forEach((episode, index) => {
        const folderName = `Episode_${index + 1}_${episode.title.replace(/[\s\/\\]/g, '_')}`;
        const folder = zip.folder(folderName);
        if (folder) {
          folder.file("script.txt", episode.scriptContent);
          
          // Metadata JSON
          const metadata = {
            title: episode.title,
            characters: episode.characters,
            shots: episode.shots.map(s => ({
              id: s.id,
              sceneHeader: s.sceneHeader,
              action: s.actionDescription,
              camera: s.cameraAngle,
              prompt: s.visualPrompt,
              settings: s.overrideSettings || "Global"
            }))
          };
          folder.file("metadata.json", JSON.stringify(metadata, null, 2));

          // Images
          const imagesFolder = folder.folder("images");
          if (imagesFolder) {
            episode.shots.forEach((shot, shotIndex) => {
              if (shot.imageUrl && shot.imageUrl.startsWith("data:image")) {
                const base64Data = shot.imageUrl.split(',')[1];
                const extension = shot.imageUrl.substring(shot.imageUrl.indexOf('/') + 1, shot.imageUrl.indexOf(';'));
                imagesFolder.file(`shot_${shotIndex + 1}_${shot.id}.${extension}`, base64Data, { base64: true });
              }
            });
          }
        }
      });

      // Generate Zip
      const content = await zip.generateAsync({ type: "blob" });
      
      // Trigger Download
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Aim_Project_Export_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export failed", error);
      alert("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  // --- DRAG & DROP REORDERING ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    // Only allow drag if the handle was clicked
    const target = e.target as HTMLElement;
    const handle = target.closest('.drag-handle');
    
    if (!handle) {
      e.preventDefault();
      return;
    }

    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
    // Set data to ensure drag works in Firefox/some browsers
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    dragOverItem.current = index;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceIndex = dragItem.current;
    const destIndex = dragOverItem.current;

    if (sourceIndex !== null && destIndex !== null && sourceIndex !== destIndex) {
      const newOrder = [...panelOrder];
      const movedItem = newOrder.splice(sourceIndex, 1)[0];
      newOrder.splice(destIndex, 0, movedItem);
      setPanelOrder(newOrder);
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- RESIZING LOGIC ---
  const handleResizeStart = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const panelId = panelOrder[index];
    const isFlex = panelId === 'main';
    
    const startWidthSelf = panelWidths[panelId];
    const nextPanelId = panelOrder[index + 1];
    const startWidthNext = nextPanelId ? panelWidths[nextPanelId] : 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      
      if (!isFlex) {
        setPanelWidths(prev => ({
          ...prev,
          [panelId]: Math.max(150, Math.min(800, startWidthSelf + delta))
        }));
      } else if (nextPanelId && panelWidths[nextPanelId] !== undefined) {
        setPanelWidths(prev => ({
          ...prev,
          [nextPanelId]: Math.max(150, Math.min(800, startWidthNext - delta))
        }));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startTimelineResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      setTimelineHeight(Math.max(100, Math.min(600, startHeight + delta)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // --- RENDER HELPERS ---
  const renderMainPanel = () => (
    <div className="flex-1 flex flex-col bg-gray-950 min-w-0 relative h-full" onClick={() => setSelectedShotId(null)}>
      {/* Header with Drag Handle, Title, and Main Actions */}
      <div className="h-12 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-3">
          {!isZenMode && (
            <div className="drag-handle cursor-grab text-gray-600 hover:text-gray-300 p-1 rounded hover:bg-gray-800 transition-colors" title="拖拽移动模块">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path></svg>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">当前剧集:</span>
            <span className="text-xs text-gray-300">{currentEpisode.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Active Character Icons */}
           {currentEpisode.characters.length > 0 && (
             <div className="flex -space-x-2 mr-2">
               {currentEpisode.characters.slice(0, 3).map((char, i) => (
                 <div key={char.id} title={char.name} className="w-6 h-6 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-[10px] text-white font-bold cursor-help">
                   {char.name[0]}
                 </div>
               ))}
             </div>
           )}

           {/* Export Button */}
           <button 
             onClick={handleExport} 
             disabled={isExporting}
             className="text-xs flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded border border-gray-700 transition-colors"
           >
              {isExporting ? (
                <span className="animate-pulse">Exporting...</span>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export
                </>
              )}
           </button>

            {/* Zen Mode Toggle */}
            <button 
              onClick={() => setIsZenMode(!isZenMode)}
              className={`p-1.5 rounded transition-colors border ${isZenMode ? 'bg-gray-800 text-blue-400 border-gray-700' : 'text-gray-400 border-transparent hover:bg-gray-800'}`}
              title={isZenMode ? "退出沉浸模式" : "沉浸模式 (Full Screen)"}
            >
              {isZenMode ? (
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l-2-2m0 0l2-2m-2 2h12m0 0l2 2m0-2l-2-2" /></svg>
              ) : (
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              )}
            </button>
        </div>
      </div>

      {/* Storyboard Grid */}
      {!isTimelineFullscreen && (
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {currentEpisode.shots.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p>暂无分镜。请输入剧本并点击生成。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {currentEpisode.shots.map(shot => {
                // Calculate active characters for this shot
                const activeChars = detectCharactersInText(shot.actionDescription + " " + shot.visualPrompt);
                
                return (
                  <div key={shot.id} onClick={(e) => e.stopPropagation()}>
                    <ShotCard 
                      shot={shot}
                      isSelected={shot.id === selectedShotId}
                      aspectRatio={shot.overrideSettings?.aspectRatio || projectSettings.defaultAspectRatio}
                      activeCharacters={activeChars}
                      onSelect={() => setSelectedShotId(shot.id)}
                      onEdit={(s) => setEditingShot(s)}
                      onGenerate={onGenerateSingle}
                      onGenerateBatch={onGenerateBatch}
                      onViewImage={(s) => setViewingShot(s)}
                      onUpdateData={handleUpdateShotData}
                      onSelectVariation={handleSelectVariation}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Timeline Control Bar (Slider Rail + Fullscreen) */}
      <div className="h-9 bg-gray-850 border-t border-gray-800 flex items-center justify-between px-3 shrink-0 select-none z-20 relative shadow-sm">
        {/* Left: Label */}
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest z-10 pointer-events-none">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <span>Timeline</span>
        </div>

        {/* Center: Resizer Grip / Slider Rail */}
        <div 
            className="absolute inset-x-0 inset-y-0 flex items-center justify-center cursor-row-resize group"
            onMouseDown={startTimelineResize}
            title="拖动调整时间线高度"
        >
           {/* Visual "Rail" with Grip Texture */}
           <div className="w-32 h-2 bg-gray-800 rounded-full group-hover:bg-gray-700 transition-all border border-gray-700 flex items-center justify-center gap-0.5">
             <div className="w-0.5 h-1 bg-gray-600 rounded-full"></div>
             <div className="w-0.5 h-1 bg-gray-600 rounded-full"></div>
             <div className="w-0.5 h-1 bg-gray-600 rounded-full"></div>
           </div>
        </div>

        {/* Right: Timeline Fullscreen Toggle */}
        <button 
          onClick={() => setIsTimelineFullscreen(!isTimelineFullscreen)}
          className={`z-10 p-1 rounded hover:bg-gray-700 transition-colors ${isTimelineFullscreen ? 'text-blue-400' : 'text-gray-400'}`}
          title={isTimelineFullscreen ? "收起时间线" : "时间线全屏"}
        >
           {isTimelineFullscreen ? (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           ) : (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
           )}
        </button>
      </div>

      {/* Timeline Content */}
      <div 
        style={{ height: isTimelineFullscreen ? '100%' : timelineHeight }} 
        className={`bg-gray-900 shrink-0 flex flex-col z-10 border-t border-gray-800 transition-all duration-300 ease-in-out ${isTimelineFullscreen ? 'flex-1' : ''}`}
      >
        <div className="flex-1 p-2 flex gap-1 overflow-x-auto items-center scrollbar-thin">
           {currentEpisode.shots.filter(s => s.imageUrl).length === 0 && (
             <div className="w-full text-center text-xs text-gray-600 select-none">Timeline Empty</div>
           )}
           {currentEpisode.shots.filter(s => s.imageUrl).map((s, i) => (
             <div 
               key={s.id} 
               onClick={(e) => { e.stopPropagation(); setSelectedShotId(s.id); }}
               className={`h-full bg-gray-800 rounded border overflow-hidden relative group shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                 s.id === selectedShotId ? 'ring-2 ring-blue-500' : 'border-gray-700'
               }`}
               style={{ aspectRatio: '16/9' }} 
             >
                <img src={s.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute bottom-1 left-1 text-[8px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">{i + 1}</div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );

  const renderPanelContent = (id: PanelId) => {
    switch (id) {
      case 'episode':
        return (
          <EpisodeList 
            episodes={episodes}
            currentEpisodeId={currentEpisodeId}
            onSelectEpisode={setCurrentEpisodeId}
            onAddEpisode={handleAddEpisode}
            onRenameEpisode={handleRenameEpisode}
            onDeleteEpisode={handleDeleteEpisode}
          />
        );
      case 'script':
        return (
          <ScriptPanel 
            script={currentEpisode.scriptContent}
            onScriptChange={handleScriptChange}
            onAnalyze={handleAnalyzeScript}
            isAnalyzing={isAnalyzing}
          />
        );
      case 'main':
        return renderMainPanel();
      case 'settings':
        return (
          <SettingsPanel
            projectSettings={projectSettings}
            selectedShot={selectedShot}
            onUpdateProjectSettings={setProjectSettings}
            onUpdateShotSettings={handleUpdateShotSettings}
            onUpdateShotData={handleUpdateShotData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      {/* Navbar */}
      {!isZenMode && (
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
            </div>
            <span className="font-bold text-lg tracking-tight flex items-center gap-1">
              Aim-<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">超级编导</span>
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Gemini 2.5 在线
            </div>
          </div>
        </header>
      )}

      {/* Global Modals */}
      {viewingShot && viewingShot.imageUrl && (
        <Lightbox 
          imageUrl={viewingShot.imageUrl} 
          altText={viewingShot.visualPrompt} 
          onClose={() => setViewingShot(null)}
        />
      )}
      
      {editingShot && editingShot.imageUrl && (
        <EditorModal 
          shot={editingShot} 
          onClose={() => setEditingShot(null)}
          onUpdateShot={handleUpdateShot}
        />
      )}

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        {panelOrder.map((panelId, index) => {
           const isFlex = panelId === 'main';
           const width = panelWidths[panelId];
           
           // In Zen Mode, only show main panel. 
           if (isZenMode && panelId !== 'main') return null;
           
           if (isZenMode && panelId === 'main') {
              return (
                 <div key={panelId} className="flex-1 flex flex-col min-w-0 h-full">
                    {renderPanelContent(panelId)}
                 </div>
              );
           }

           return (
             <React.Fragment key={panelId}>
               <div 
                 className={`flex flex-col relative transition-all ${isFlex ? 'flex-1 min-w-0' : 'shrink-0'}`}
                 style={{ width: isFlex ? 'auto' : width }}
                 draggable={!isZenMode && panelId !== 'main'} // Main panel not draggable
                 onDragStart={(e) => handleDragStart(e, index)}
                 onDragOver={(e) => handleDragOver(e, index)}
               >
                 {renderPanelContent(panelId)}
                 
                 {/* Resize Handle (Right) */}
                 {!isZenMode && index < panelOrder.length - 1 && (
                   <div 
                     className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 z-50 group transition-colors"
                     onMouseDown={handleResizeStart(index)}
                   >
                     <div className="absolute inset-y-0 right-[-2px] w-4"></div> {/* Hit area */}
                   </div>
                 )}
               </div>
             </React.Fragment>
           );
        })}
      </div>
    </div>
  );
};

export default App;

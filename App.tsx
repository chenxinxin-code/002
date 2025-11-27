
import React, { useState, useRef, useEffect } from 'react';
import ScriptPanel from './components/ScriptPanel';
import ShotCard from './components/ShotCard';
import EditorModal from './components/EditorModal';
import SettingsPanel from './components/SettingsPanel';
import { Shot, Character, ScriptAnalysisResult, ProjectSettings, AspectRatio, ArtStyle } from './types';
import { analyzeScript, generateShotImage } from './services/geminiService';

const App: React.FC = () => {
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  
  // Layout Dimensions State
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [timelineHeight, setTimelineHeight] = useState(160);

  // Project Global Settings
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    defaultAspectRatio: AspectRatio.RATIO_239_1,
    defaultArtStyle: ArtStyle.CINEMATIC_REALISM
  });

  // Resizing Logic
  const startResizing = (direction: 'left' | 'right' | 'timeline') => (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const startX = mouseDownEvent.clientX;
    const startY = mouseDownEvent.clientY;
    const startLeftWidth = leftPanelWidth;
    const startRightWidth = rightPanelWidth;
    const startTimelineHeight = timelineHeight;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      if (direction === 'left') {
        const delta = mouseMoveEvent.clientX - startX;
        setLeftPanelWidth(Math.max(200, Math.min(600, startLeftWidth + delta)));
      } else if (direction === 'right') {
        const delta = startX - mouseMoveEvent.clientX; // Dragging left increases width
        setRightPanelWidth(Math.max(200, Math.min(600, startRightWidth + delta)));
      } else if (direction === 'timeline') {
        const delta = startY - mouseMoveEvent.clientY; // Dragging up increases height
        setTimelineHeight(Math.max(100, Math.min(500, startTimelineHeight + delta)));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      // Remove text selection prevention style if added
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Set cursors and prevent selection while dragging
    document.body.style.cursor = direction === 'timeline' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleAnalyzeScript = async (scriptText: string) => {
    setIsAnalyzing(true);
    try {
      const result: ScriptAnalysisResult = await analyzeScript(scriptText);
      setShots(result.shots);
      setCharacters(result.characters);
    } catch (error) {
      alert("剧本解析失败，请检查 API Key 并重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateShot = async (shot: Shot) => {
    const effectiveAspectRatio = shot.overrideSettings?.aspectRatio || projectSettings.defaultAspectRatio;
    const effectiveArtStyle = shot.overrideSettings?.artStyle || projectSettings.defaultArtStyle;

    setShots(prev => prev.map(s => s.id === shot.id ? { ...s, isGenerating: true } : s));
    
    try {
      const imageUrl = await generateShotImage(shot.visualPrompt, effectiveArtStyle, effectiveAspectRatio);
      setShots(prev => prev.map(s => s.id === shot.id ? { ...s, imageUrl, isGenerating: false } : s));
    } catch (error) {
      console.error(error);
      setShots(prev => prev.map(s => s.id === shot.id ? { ...s, isGenerating: false } : s));
    }
  };

  const handleUpdateShot = (updatedShot: Shot) => {
    setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));
    setEditingShot(updatedShot);
  };

  const handleUpdateShotSettings = (shotId: string, overrides: Partial<Shot>['overrideSettings']) => {
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, overrideSettings: overrides } : s));
  };

  const selectedShot = shots.find(s => s.id === selectedShotId) || null;

  return (
    <div className="flex flex-col h-screen bg-black text-gray-100 font-sans">
      {/* Navbar */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Aim-AI <span className="text-gray-500 font-normal">编导</span></span>
        </div>
        <div className="flex gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Gemini 2.5 在线
          </div>
        </div>
      </header>

      {/* Main Content Area - Resizable Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Script Editor (Resizable) */}
        <div 
          style={{ width: leftPanelWidth }} 
          className="hidden lg:flex flex-col shrink-0 h-full relative"
        >
          <ScriptPanel onAnalyze={handleAnalyzeScript} isAnalyzing={isAnalyzing} />
          
          {/* Right Resize Handle */}
          <div 
            className="absolute top-0 bottom-0 right-0 w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize z-50 transition-colors duration-150"
            onMouseDown={startResizing('left')}
            title="Drag to resize"
          />
        </div>

        {/* Center: Visualizer & Timeline */}
        <div className="flex-1 flex flex-col bg-gray-950 min-w-0 relative" onClick={() => setSelectedShotId(null)}>
          
          {/* Top Section: Toolbar + Grid */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-4 shrink-0">
              <div className="flex gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">项目:</span>
                <span className="text-xs text-gray-300">未命名剧本 01</span>
              </div>
              <div className="flex gap-2">
                 {characters.length > 0 && (
                   <div className="flex -space-x-2">
                     {characters.slice(0, 3).map((char, i) => (
                       <div key={char.id} title={char.name} className="w-6 h-6 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-[10px] text-white font-bold cursor-help">
                         {char.name[0]}
                       </div>
                     ))}
                     {characters.length > 3 && (
                       <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[8px] text-gray-400">
                         +{characters.length - 3}
                       </div>
                     )}
                   </div>
                 )}
              </div>
            </div>

            {/* Storyboard Grid */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {shots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <p>暂无分镜。请输入剧本开始。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                  {shots.map(shot => (
                    <div key={shot.id} onClick={(e) => e.stopPropagation()}>
                      <ShotCard 
                        shot={shot}
                        isSelected={shot.id === selectedShotId}
                        aspectRatio={shot.overrideSettings?.aspectRatio || projectSettings.defaultAspectRatio}
                        onSelect={() => setSelectedShotId(shot.id)}
                        onEdit={(s) => setEditingShot(s)}
                        onGenerate={handleGenerateShot}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Resize Handle */}
          <div 
            className="h-1 bg-gray-800 hover:bg-blue-500 cursor-row-resize z-50 transition-colors duration-150 shrink-0 w-full"
            onMouseDown={startResizing('timeline')}
            title="Drag to resize timeline"
          />

          {/* Timeline (Resizable) */}
          <div 
            style={{ height: timelineHeight }} 
            className="bg-gray-900 shrink-0 flex flex-col z-10"
          >
            <div className="h-8 border-b border-gray-800 flex items-center px-2 bg-gray-850 shrink-0">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Timeline</span>
            </div>
            <div className="flex-1 p-2 flex gap-1 overflow-x-auto items-center scrollbar-thin">
               {shots.filter(s => s.imageUrl).length === 0 && (
                 <div className="w-full text-center text-xs text-gray-600">Timeline Empty</div>
               )}
               {shots.filter(s => s.imageUrl).map((s, i) => (
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

        {/* Right: Settings Panel (Resizable) */}
        <div 
          style={{ width: rightPanelWidth }}
          className="hidden md:flex flex-col shrink-0 h-full relative shadow-xl z-20"
        >
          {/* Left Resize Handle */}
          <div 
            className="absolute top-0 bottom-0 left-0 w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize z-50 transition-colors duration-150"
            onMouseDown={startResizing('right')}
            title="Drag to resize"
          />
          
          <SettingsPanel 
             projectSettings={projectSettings}
             selectedShot={selectedShot}
             onUpdateProjectSettings={setProjectSettings}
             onUpdateShotSettings={handleUpdateShotSettings}
           />
        </div>
      </div>

      {/* Editor Modal */}
      {editingShot && (
        <EditorModal 
          shot={editingShot} 
          onClose={() => setEditingShot(null)}
          onUpdateShot={handleUpdateShot}
        />
      )}
    </div>
  );
};

export default App;

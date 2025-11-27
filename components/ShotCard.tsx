
import React from 'react';
import { Shot, AspectRatio } from '../types';

interface ShotCardProps {
  shot: Shot;
  isSelected: boolean;
  aspectRatio: AspectRatio;
  activeCharacters?: string[];
  onSelect: (shot: Shot) => void;
  onEdit: (shot: Shot) => void;
  onGenerate: (shot: Shot) => void;
  onGenerateBatch: (shot: Shot) => void;
  onViewImage: (shot: Shot) => void;
  onUpdateData: (shotId: string, updates: Partial<Shot>) => void;
  onSelectVariation: (shotId: string, variationUrl: string) => void;
}

const getAspectRatioClass = (ratio: AspectRatio) => {
  switch (ratio) {
    case AspectRatio.RATIO_239_1: return 'aspect-[21/9]';
    case AspectRatio.RATIO_16_9: return 'aspect-video';
    case AspectRatio.RATIO_4_3: return 'aspect-[4/3]';
    case AspectRatio.RATIO_9_16: return 'aspect-[9/16]';
    case AspectRatio.RATIO_1_1: return 'aspect-square';
    default: return 'aspect-video';
  }
};

const ShotCard: React.FC<ShotCardProps> = ({ 
  shot, 
  isSelected, 
  aspectRatio, 
  activeCharacters, 
  onSelect, 
  onEdit, 
  onGenerate, 
  onGenerateBatch,
  onViewImage,
  onUpdateData,
  onSelectVariation
}) => {
  const ratioClass = getAspectRatioClass(aspectRatio);

  return (
    <div 
      onClick={() => onSelect(shot)}
      className={`group bg-gray-800 rounded-xl overflow-hidden border transition-all duration-200 flex flex-col h-full cursor-pointer relative ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-900/20' : 'border-gray-700 hover:border-gray-500 shadow-md'
      }`}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-0 right-0 p-1 z-20">
          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
        </div>
      )}

      {/* Image Area */}
      <div className={`relative ${ratioClass} bg-gray-900 overflow-hidden group/image`}>
        {shot.imageUrl ? (
          <img 
            src={shot.imageUrl} 
            alt={shot.actionDescription} 
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-4 text-center">
            {shot.isGenerating ? (
              <div className="flex flex-col items-center w-full px-8">
                <div className="w-8 h-8 bg-blue-500 rounded-full animate-bounce mb-4 shadow-lg shadow-blue-500/50"></div>
                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-blue-500 transition-all duration-300 ease-out"
                     style={{ width: `${shot.progress || 0}%` }}
                   ></div>
                </div>
                <span className="text-xs font-mono text-blue-400 mt-2">{shot.progress || 0}%</span>
              </div>
            ) : (
              <span className="text-xs uppercase tracking-widest opacity-50">暂无图片</span>
            )}
          </div>
        )}

        {/* Progress Overlay (Visible when regenerating existing image) */}
        {shot.imageUrl && shot.isGenerating && (
           <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8">
              <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_#3b82f6]"
                    style={{ width: `${shot.progress || 0}%` }}
                  ></div>
              </div>
              <span className="text-xs font-mono text-blue-400 animate-pulse">Generating variations... {shot.progress}%</span>
           </div>
        )}

        {/* Overlay Buttons */}
        <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[1px] z-10 gap-2 ${shot.isGenerating ? 'pointer-events-none opacity-0' : ''}`}>
          {!shot.imageUrl ? (
             <div className="flex gap-2">
               <button 
                 onClick={(e) => { e.stopPropagation(); onGenerate(shot); }}
                 className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg border border-blue-400/30"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 生成
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onGenerateBatch(shot); }}
                 className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-500 flex items-center gap-1 transform hover:scale-105 transition-all shadow-lg border border-purple-400/30"
                 title="生成4张变体 (Batch Generate)"
               >
                 <span className="text-[10px]">x4</span>
               </button>
             </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onViewImage(shot); }}
                className="p-2 bg-gray-700/80 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center transition-all hover:scale-110 backdrop-blur-md border border-white/10"
                title="查看大图"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onGenerate(shot); }}
                className="p-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-500 flex items-center justify-center transition-all hover:scale-110 backdrop-blur-md border border-white/10"
                title="单张重绘 (Re-roll)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onGenerateBatch(shot); }}
                className="p-2 bg-purple-600/80 text-white rounded-lg hover:bg-purple-500 flex items-center justify-center transition-all hover:scale-110 backdrop-blur-md border border-white/10"
                title="生成4张变体 (Batch x4)"
              >
                <span className="font-bold text-xs">x4</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(shot); }}
                className="p-2 bg-green-600/80 text-white rounded-lg hover:bg-green-500 flex items-center justify-center transition-all hover:scale-110 col-span-3 backdrop-blur-md border border-white/10"
                title="AI 局部编辑"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                <span className="ml-1 text-[10px] font-bold">AI 编辑</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Variations Dock */}
        {shot.variations && shot.variations.length > 0 && !shot.isGenerating && (
          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/80 backdrop-blur-md translate-y-full group-hover/image:translate-y-0 transition-transform duration-300 z-20 flex gap-1 overflow-x-auto">
             {shot.variations.map((v, i) => (
               <div 
                 key={i} 
                 onClick={(e) => { e.stopPropagation(); onSelectVariation(shot.id, v); }}
                 className={`w-1/4 aspect-square flex-shrink-0 rounded-md overflow-hidden cursor-pointer border-2 ${v === shot.imageUrl ? 'border-blue-500' : 'border-transparent hover:border-gray-400'}`}
               >
                 <img src={v} className="w-full h-full object-cover" />
               </div>
             ))}
          </div>
        )}
        
        {/* Info Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 items-start pointer-events-none">
           <div className="px-2 py-1 bg-black/50 text-white text-[10px] font-bold rounded backdrop-blur-md border border-white/10">
             {shot.cameraAngle}
           </div>
           {shot.overrideSettings && (
             <div className="px-2 py-1 bg-purple-500/80 text-white text-[10px] font-bold rounded backdrop-blur-md border border-white/10">
               ★ Custom
             </div>
           )}
        </div>

        {/* Active Character Badges */}
        {activeCharacters && activeCharacters.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1 z-10 flex-wrap max-w-full px-1 pointer-events-none">
            {activeCharacters.map(char => (
               <div key={char} className="px-1.5 py-0.5 bg-blue-600/90 text-white text-[9px] font-bold rounded flex items-center gap-1 shadow-sm border border-blue-400/30">
                 <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]"></span>
                 {char}
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Editable Content */}
      <div className="p-3 flex flex-col flex-1 gap-1 group/text bg-gray-850">
        <input
          value={shot.sceneHeader}
          onChange={(e) => onUpdateData(shot.id, { sceneHeader: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent border-b border-transparent hover:border-gray-700 rounded-none px-0 py-0.5 text-xs font-bold text-gray-500 uppercase tracking-wider focus:border-blue-500 focus:outline-none focus:text-gray-300 transition-colors"
          placeholder="SCENE HEADER"
        />
        <textarea
          value={shot.actionDescription}
          onChange={(e) => onUpdateData(shot.id, { actionDescription: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent border border-transparent hover:bg-gray-800 rounded px-1 py-0.5 text-sm text-gray-300 leading-relaxed resize-none focus:border-blue-500 focus:outline-none transition-colors flex-1 -ml-1"
          placeholder="Action description..."
        />
      </div>
    </div>
  );
};

export default ShotCard;

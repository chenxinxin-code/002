
import React from 'react';
import { Shot, AspectRatio } from '../types';

interface ShotCardProps {
  shot: Shot;
  isSelected: boolean;
  aspectRatio: AspectRatio;
  onSelect: (shot: Shot) => void;
  onEdit: (shot: Shot) => void;
  onGenerate: (shot: Shot) => void;
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

const ShotCard: React.FC<ShotCardProps> = ({ shot, isSelected, aspectRatio, onSelect, onEdit, onGenerate }) => {
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
      <div className={`relative ${ratioClass} bg-gray-900 overflow-hidden`}>
        {shot.imageUrl ? (
          <img 
            src={shot.imageUrl} 
            alt={shot.actionDescription} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-4 text-center">
            {shot.isGenerating ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full animate-bounce mb-2"></div>
                <span className="text-xs font-mono text-blue-400">渲染中...</span>
              </div>
            ) : (
              <span className="text-xs uppercase tracking-widest opacity-50">暂无图片</span>
            )}
          </div>
        )}

        {/* Overlay Buttons */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm z-10">
          {!shot.imageUrl ? (
             <button 
             onClick={(e) => { e.stopPropagation(); onGenerate(shot); }}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-2 transform hover:scale-105 transition-all"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             生成图片
           </button>
          ) : (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(shot); }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 flex items-center gap-2 transform hover:scale-105 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                AI 编辑
              </button>
               <button 
                onClick={(e) => { e.stopPropagation(); onGenerate(shot); }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-500 flex items-center gap-2 transform hover:scale-105 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                重绘
              </button>
            </>
          )}
        </div>
        
        {/* Info Badges */}
        <div className="absolute top-2 left-2 flex gap-1 z-10">
           <div className="px-2 py-1 bg-black/50 text-white text-[10px] font-bold rounded backdrop-blur-md border border-white/10">
             {shot.cameraAngle}
           </div>
           {shot.overrideSettings && (
             <div className="px-2 py-1 bg-purple-500/80 text-white text-[10px] font-bold rounded backdrop-blur-md border border-white/10" title="Custom Settings Applied">
               ★
             </div>
           )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="text-xs font-bold text-gray-500 mb-1 tracking-wider uppercase truncate">{shot.sceneHeader}</div>
        <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
          {shot.actionDescription}
        </p>
      </div>
    </div>
  );
};

export default ShotCard;

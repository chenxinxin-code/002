import React from 'react';
import { Episode } from '../types';

interface EpisodeListProps {
  episodes: Episode[];
  currentEpisodeId: string;
  onSelectEpisode: (id: string) => void;
  onAddEpisode: () => void;
  onRenameEpisode: (id: string, newName: string) => void;
  onDeleteEpisode: (id: string) => void;
}

const EpisodeList: React.FC<EpisodeListProps> = ({ 
  episodes, 
  currentEpisodeId, 
  onSelectEpisode, 
  onAddEpisode,
  onRenameEpisode,
  onDeleteEpisode
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800 w-full">
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-grab text-gray-600 hover:text-gray-300 p-1 rounded hover:bg-gray-800 transition-colors" title="拖拽移动模块">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path></svg>
          </div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">剧集列表</h2>
        </div>
        <button 
          onClick={onAddEpisode}
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          title="新建剧集"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {episodes.map(episode => (
          <div 
            key={episode.id}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
              episode.id === currentEpisodeId 
                ? 'bg-blue-900/30 text-blue-200 border border-blue-800/50' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
            }`}
            onClick={() => onSelectEpisode(episode.id)}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <svg className={`w-4 h-4 flex-shrink-0 ${episode.id === currentEpisodeId ? 'text-blue-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="truncate">{episode.title}</span>
            </div>
            
            {/* Hover Actions */}
            <div className="hidden group-hover:flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const newName = prompt("重命名剧集:", episode.title);
                  if (newName) onRenameEpisode(episode.id, newName);
                }}
                className="p-1 hover:text-white text-gray-500"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              {episodes.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm("确定删除此剧集吗？")) onDeleteEpisode(episode.id);
                  }}
                  className="p-1 hover:text-red-400 text-gray-500"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EpisodeList;
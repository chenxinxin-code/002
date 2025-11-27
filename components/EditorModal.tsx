import React, { useState } from 'react';
import { Shot } from '../types';
import { editShotImage } from '../services/geminiService';

interface EditorModalProps {
  shot: Shot;
  onClose: () => void;
  onUpdateShot: (updatedShot: Shot) => void;
}

const EditorModal: React.FC<EditorModalProps> = ({ shot, onClose, onUpdateShot }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!prompt.trim() || !shot.imageUrl) return;

    setIsProcessing(true);
    setError(null);

    try {
      const newImageUrl = await editShotImage(shot.imageUrl, prompt);
      onUpdateShot({
        ...shot,
        imageUrl: newImageUrl
      });
      setPrompt(''); // Clear prompt on success
    } catch (err) {
      setError("图片编辑失败，请尝试其他指令。");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!shot.imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-850 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              AI 魔法编辑器
            </h3>
            <p className="text-xs text-gray-400">由 Gemini 2.5 Flash Image 驱动</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Image Canvas Area */}
          <div className="flex-1 bg-black relative flex items-center justify-center p-4">
             <img 
               src={shot.imageUrl} 
               className="max-h-[50vh] md:max-h-[60vh] object-contain rounded-lg shadow-lg border border-gray-800"
               alt="Editing Target"
             />
             {isProcessing && (
               <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                 <div className="text-center">
                   <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="text-purple-300 font-mono text-sm animate-pulse">Gemini 正在重绘...</p>
                 </div>
               </div>
             )}
          </div>

          {/* Controls Area */}
          <div className="w-full md:w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  原始分镜
                </label>
                <p className="text-sm text-gray-300 italic p-3 bg-gray-800 rounded border border-gray-700">
                  "{shot.actionDescription}"
                </p>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 block">
                  修改指令
                </label>
                <textarea
                  className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder-gray-500"
                  placeholder="例如：增加复古滤镜、移除背景中的路人、让画面下雨..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEdit();
                    }
                  }}
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-xs mb-4">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500">建议指令：</p>
                <div className="flex flex-wrap gap-2">
                  {['电影感光照', '赛博朋克风格', '增加镜头光晕', '黑白风格'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setPrompt(s)}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-850">
              <button
                onClick={handleEdit}
                disabled={!prompt.trim() || isProcessing}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                  !prompt.trim() || isProcessing
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-lg'
                }`}
              >
                生成修改
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorModal;
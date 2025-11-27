import React, { useState } from 'react';

interface ScriptPanelProps {
  onAnalyze: (script: string) => void;
  isAnalyzing: boolean;
}

const DEFAULT_SCRIPT = `内景 霓虹面馆 - 夜

窗外雨水冲刷着霓虹灯的倒影。凯（30多岁，颓废，机械手臂）佝偻着背，对着一碗热气腾腾的面条。

他看了一眼手表。全息投影信息闪烁着：“目标即将到达”。

门滑开了。一个模糊的人影走了进来，全身湿透。

凯
(头也不抬)
你迟到了。`;

const ScriptPanel: React.FC<ScriptPanelProps> = ({ onAnalyze, isAnalyzing }) => {
  const [script, setScript] = useState(DEFAULT_SCRIPT);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700 bg-gray-850">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          剧本输入
        </h2>
      </div>
      
      <div className="flex-1 relative">
        <textarea
          className="w-full h-full p-6 bg-gray-900 text-gray-300 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="在此粘贴剧本..."
          spellCheck={false}
        />
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-850">
        <button
          onClick={() => onAnalyze(script)}
          disabled={isAnalyzing}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
            isAnalyzing 
              ? 'bg-blue-900/30 text-blue-400 cursor-wait' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
          }`}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>正在拆解剧本...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <span>生成分镜</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ScriptPanel;
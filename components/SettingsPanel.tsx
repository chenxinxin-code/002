
import React from 'react';
import { ProjectSettings, Shot, AspectRatio, ArtStyle } from '../types';

interface SettingsPanelProps {
  projectSettings: ProjectSettings;
  selectedShot: Shot | null;
  onUpdateProjectSettings: (settings: ProjectSettings) => void;
  onUpdateShotSettings: (shotId: string, settings: Partial<Shot>['overrideSettings']) => void;
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
  { value: ArtStyle.CONCEPT_ART, label: '2.5D 概念图 (Concept Art)' },
  { value: ArtStyle.ANIME, label: '二次元/动画 (Anime)' },
  { value: ArtStyle.SKETCH, label: '黑白线稿 (Storyboard Sketch)' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  projectSettings,
  selectedShot,
  onUpdateProjectSettings,
  onUpdateShotSettings,
}) => {
  const isGlobalMode = !selectedShot;

  // Helpers to handle changes
  const handleGlobalChange = (key: keyof ProjectSettings, value: any) => {
    onUpdateProjectSettings({ ...projectSettings, [key]: value });
  };

  const handleShotChange = (key: 'aspectRatio' | 'artStyle', value: any) => {
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
        artStyle: projectSettings.defaultArtStyle
      });
    } else {
      // Clear overrides to inherit global
      onUpdateShotSettings(selectedShot.id, undefined);
    }
  };

  const shotHasOverrides = !!selectedShot?.overrideSettings;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700 w-full text-sm">
      <div className="p-4 border-b border-gray-700 bg-gray-850">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
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
        <div className={`space-y-6 transition-opacity ${!isGlobalMode && !shotHasOverrides ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          
          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              画面规格 (Resolution)
            </label>
            <select
              value={isGlobalMode ? projectSettings.defaultAspectRatio : (selectedShot?.overrideSettings?.aspectRatio || projectSettings.defaultAspectRatio)}
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
            <p className="text-xs text-gray-500 leading-relaxed">
              修改画幅将影响画面构图。宽画幅适合电影感，竖屏适合短视频。
            </p>
          </div>

          {/* Render Engine / Style */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              渲染风格 (Style Model)
            </label>
            <select
              value={isGlobalMode ? projectSettings.defaultArtStyle : (selectedShot?.overrideSettings?.artStyle || projectSettings.defaultArtStyle)}
              onChange={(e) => isGlobalMode
                ? handleGlobalChange('defaultArtStyle', e.target.value)
                : handleShotChange('artStyle', e.target.value)
              }
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            >
              {ART_STYLES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
             <p className="text-xs text-gray-500 leading-relaxed">
               决定 AI 生成图片的笔触和质感。
            </p>
          </div>

          {/* Placeholders for future features */}
          <div className="space-y-3 pt-4 border-t border-gray-800">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
               视频模型 (Video - Coming Soon)
             </label>
             <select disabled className="w-full bg-gray-800/50 border border-gray-800 rounded p-2 text-gray-500 cursor-not-allowed">
               <option>Stable Video Diffusion (Beta)</option>
               <option>Runway Gen-3 (Pro)</option>
             </select>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-850 border-t border-gray-700 text-xs text-gray-500 text-center">
        {isGlobalMode ? '修改全局设置将影响所有新生成的镜头' : '当前仅修改此镜头的属性'}
      </div>
    </div>
  );
};

export default SettingsPanel;

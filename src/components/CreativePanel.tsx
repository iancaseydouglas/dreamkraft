/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface CreativePanelProps {
  onApplyStyle: (prompt: string) => void;
  isLoading: boolean;
}

const CreativePanel: React.FC<CreativePanelProps> = ({ onApplyStyle, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
    { name: 'Vectorize', prompt: 'Recreate this image in a clean, minimalist vector art style with flat colors and bold outlines.' },
  ];
  
  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };
  
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
      onApplyStyle(activePrompt);
    }
  };

  return (
    <div className="w-full bg-slate-100/50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-slate-800 dark:text-gray-300">Apply a Creative Style</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-slate-200 dark:bg-white/10 border border-transparent text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-white/20 dark:hover:border-white/20 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-gray-800 ring-blue-500' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe a custom style"
        className="flex-grow bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-800 dark:text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
      />
      
      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
          <button
            onClick={handleApply}
            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !activePrompt.trim()}
          >
            Apply Style
          </button>
        </div>
      )}
    </div>
  );
};

export default CreativePanel;
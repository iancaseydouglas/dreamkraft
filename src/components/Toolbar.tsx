/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { MagicWandIcon, CropIcon, SunIcon, PaletteIcon, ReplaceIcon, CompositeIcon, FrameIcon, BatchIcon } from './icons';

export type Tool = 'composite' | 'retouch' | 'replace' | 'creative' | 'adjust' | 'crop' | 'frame' | 'batch';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  isLoading: boolean;
}

const tools: { id: Tool; name: string; icon: React.FC<{className?: string}> }[] = [
    { id: 'composite', name: 'Composite', icon: CompositeIcon },
    { id: 'retouch', name: 'Retouch', icon: MagicWandIcon },
    { id: 'replace', name: 'Replace', icon: ReplaceIcon },
    { id: 'frame', name: 'Frame', icon: FrameIcon },
    { id: 'adjust', name: 'Adjust', icon: SunIcon },
    { id: 'creative', name: 'Creative', icon: PaletteIcon },
    { id: 'crop', name: 'Crop', icon: CropIcon },
    { id: 'batch', name: 'Batch', icon: BatchIcon },
];

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, isLoading }) => {
  return (
    <aside className="w-24 bg-white/70 dark:bg-gray-800/30 border-r border-slate-200 dark:border-gray-700/80 p-2 flex flex-col items-center gap-2 backdrop-blur-sm">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          disabled={isLoading}
          className={`w-20 h-20 flex flex-col items-center justify-center rounded-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTool === tool.id
              ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
          aria-label={tool.name}
          title={tool.name}
        >
          <tool.icon className="w-7 h-7 mb-1" />
          <span className="text-xs font-semibold tracking-tighter">{tool.name}</span>
        </button>
      ))}
    </aside>
  );
};

export default Toolbar;
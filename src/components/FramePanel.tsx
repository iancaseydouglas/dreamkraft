/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface FramePanelProps {
  onApplyFrame: (details: { style: string; topText: string; bottomText: string }) => void;
  onPinFrame: (details: { style: string; topText: string; bottomText: string } | null) => void;
  isLoading: boolean;
  pinnedFrameStyle: { style: string; topText: string; bottomText: string } | null;
}

const FramePanel: React.FC<FramePanelProps> = ({ onApplyFrame, onPinFrame, isLoading, pinnedFrameStyle }) => {
  const [style, setStyle] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (pinnedFrameStyle) {
      const isCurrentStylePinned = 
        pinnedFrameStyle.style === style &&
        pinnedFrameStyle.topText === topText &&
        pinnedFrameStyle.bottomText === bottomText;
      setIsPinned(isCurrentStylePinned);
    } else {
      setIsPinned(false);
    }
  }, [style, topText, bottomText, pinnedFrameStyle]);
  
  const handleApply = () => {
    onApplyFrame({ style, topText, bottomText });
  };
  
  const handlePin = () => {
    if (isPinned) {
        onPinFrame(null); // Unpin
    } else {
        if (!style.trim()) return;
        onPinFrame({ style, topText, bottomText });
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      <h3 className="text-xl font-bold text-slate-800 dark:text-gray-200">Add a Stylized Frame</h3>
      
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Frame Style</span>
            <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g., 'ornate gold leaf frame'"
                className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                disabled={isLoading}
            />
        </label>
        <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Top Text (Optional)</span>
            <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="e.g., 'The Creator'"
                className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                disabled={isLoading}
            />
        </label>
        <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Bottom Text (Optional)</span>
            <textarea
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="e.g., 'A being of immense power...'"
                rows={3}
                className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full resize-none"
                disabled={isLoading}
            />
        </label>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <button
            onClick={handleApply}
            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !style.trim()}
        >
            Generate Frame
        </button>
        <button
            onClick={handlePin}
            className={`w-full font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out text-base border-2 disabled:opacity-50 disabled:cursor-not-allowed ${isPinned ? 'bg-green-500/20 border-green-400 text-green-300 hover:bg-green-500/30' : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-white/20'}`}
            disabled={isLoading || !style.trim()}
        >
            {isPinned ? 'Style Pinned ✓' : 'Pin Frame for Batch Use'}
        </button>
      </div>

    </div>
  );
};

export default FramePanel;
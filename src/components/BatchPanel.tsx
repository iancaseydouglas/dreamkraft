/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface BatchPanelProps {
  onApplyFrame: () => void;
  isLoading: boolean;
  pinnedFrameStyle: { style: string; topText: string; bottomText: string } | null;
  hasBatchFiles: boolean;
}

const BatchPanel: React.FC<BatchPanelProps> = ({ onApplyFrame, isLoading, pinnedFrameStyle, hasBatchFiles }) => {
  return (
    <div className="w-full bg-slate-100/50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-xl font-bold text-center text-slate-800 dark:text-gray-200">Batch Processing</h3>
      
      {pinnedFrameStyle ? (
        <div className="flex flex-col gap-4 items-center">
            <p className="text-center text-slate-600 dark:text-gray-400">Apply your pinned frame to all uploaded images.</p>
            <div className="w-full bg-slate-200 dark:bg-black/20 p-4 rounded-lg border border-slate-300 dark:border-gray-700 text-sm">
                <p className="font-bold text-slate-800 dark:text-gray-300">Pinned Frame:</p>
                <p className="text-slate-600 dark:text-gray-400 break-words"><span className="font-semibold">Style:</span> {pinnedFrameStyle.style}</p>
                {pinnedFrameStyle.topText && <p className="text-slate-600 dark:text-gray-400"><span className="font-semibold">Top Text:</span> {pinnedFrameStyle.topText}</p>}
                {pinnedFrameStyle.bottomText && <p className="text-slate-600 dark:text-gray-400"><span className="font-semibold">Bottom Text:</span> {pinnedFrameStyle.bottomText}</p>}
            </div>
            <button
                onClick={onApplyFrame}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !hasBatchFiles}
            >
                {isLoading ? 'Processing...' : `Apply to ${hasBatchFiles ? 'All Images' : ''}`}
            </button>
        </div>
      ) : (
        <div className="text-center text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-900/50 p-4 rounded-md border border-slate-200 dark:border-gray-700">
          <p>No frame style pinned.</p>
          <p className="text-sm mt-1">Go to the <span className="font-bold text-blue-500 dark:text-blue-400">'Frame'</span> tool to create and pin a style for batch use.</p>
        </div>
      )}
    </div>
  );
};

export default BatchPanel;

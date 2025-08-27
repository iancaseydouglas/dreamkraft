/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateCompositedImage, generateFramedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import CreativePanel from './components/CreativePanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import FramePanel from './components/FramePanel';
import BatchPanel from './components/BatchPanel';
import { UndoIcon, RedoIcon, EyeIcon, CompositeIcon, BatchIcon, CheckIcon, DownloadIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import Toolbar, { type Tool } from './components/Toolbar';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper component for gallery thumbnails
const ImageThumbnail: React.FC<{ file: File; isSelected: boolean; onClick: () => void; isSelectedForDownload: boolean; onSelectToggle: () => void; }> = ({ file, isSelected, onClick, isSelectedForDownload, onSelectToggle }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <div className="relative flex-shrink-0 w-24 h-24">
            <button onClick={onClick} className={`w-full h-full rounded-md overflow-hidden transition-all duration-200 border-2 ${isSelected ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent hover:border-gray-500'}`}>
                {url && <img src={url} alt="History thumbnail" className="w-full h-full object-cover" />}
            </button>
             <button
                onClick={onSelectToggle}
                className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 border-2 z-10 ${isSelectedForDownload ? 'bg-blue-500 border-blue-400' : 'bg-black/50 border-white/50 hover:bg-black/70'}`}
                aria-label="Select for download"
            >
                {isSelectedForDownload && <CheckIcon className="w-4 h-4 text-white" />}
            </button>
        </div>
    );
};

const CompositeThumbnail: React.FC<{ file: File; isSelected: boolean; onClick: () => void; }> = ({ file, isSelected, onClick }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <button onClick={onClick} className={`relative aspect-square w-full rounded-lg overflow-hidden transition-all duration-200 border-4 ${isSelected ? 'border-blue-500 scale-105 shadow-2xl' : 'border-transparent hover:border-gray-400 dark:hover:border-gray-500'}`}>
            {url && <img src={url} alt="Composite source" className="w-full h-full object-cover" />}
            {isSelected && <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center"><div className="text-white font-bold bg-black/50 px-3 py-1 rounded-md">Style Source</div></div>}
        </button>
    );
};

const BatchThumbnail: React.FC<{ file: File; }> = ({ file }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-700">
            {url && <img src={url} alt="Batch source" className="w-full h-full object-cover" />}
        </div>
    );
};


const App: React.FC = () => {
  type Theme = 'light' | 'dark';
  const [theme, setTheme] = useState<Theme>('dark');
  
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [secondaryPrompt, setSecondaryPrompt] = useState<string>(''); // For replace tool
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspots, setEditHotspots] = useState<{ x: number, y: number }[]>([]);
  const [displayHotspots, setDisplayHotspots] = useState<{ x: number, y: number }[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [compositeFiles, setCompositeFiles] = useState<File[]>([]);
  const [styleSourceIndex, setStyleSourceIndex] = useState<number>(0);
  
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [pinnedFrameStyle, setPinnedFrameStyle] = useState<{ style: string; topText: string; bottomText: string; } | null>(null);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [history, historyIndex]);

  const handleStartEditing = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setCompositeFiles([]);
    setStyleSourceIndex(0);
    setBatchFiles([]);
    setEditHotspots([]);
    setDisplayHotspots([]);
    setActiveTool('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setSelectedIndices(new Set());
  }, []);
  
  const handleCompositeFilesSelect = (files: FileList | null) => {
    if (files && files.length > 1) {
        setError(null);
        setCompositeFiles(Array.from(files));
        setStyleSourceIndex(0);
    } else {
        setError("Please select at least two images for compositing.");
    }
  };
  
  const handleBatchFilesSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
        setError(null);
        setBatchFiles(Array.from(files));
        setHistory([]);
        setHistoryIndex(-1);
    } else {
        setError("Please select one or more images for batch processing.");
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!currentImage) return;
    if (!prompt.trim()) { setError('Please enter a description for your edit.'); return; }
    if (editHotspots.length === 0) { setError('Please click on the image to select an area to edit.'); return; }
    setIsLoading(true);
    setError(null);
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspots);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspots([]);
        setDisplayHotspots([]);
        setPrompt(''); // Clear prompt for iterative editing
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspots, addImageToHistory]);

  const handleGenerateComposite = useCallback(async () => {
    if (compositeFiles.length < 2) return;
    setIsLoading(true);
    setError(null);

    const orderedFiles = [...compositeFiles];
    const styleSourceFile = orderedFiles.splice(styleSourceIndex, 1)[0];
    orderedFiles.unshift(styleSourceFile);
    
    try {
        const compositedImageUrl = await generateCompositedImage(orderedFiles);
        const newImageFile = dataURLtoFile(compositedImageUrl, `composited-${Date.now()}.png`);
        
        setHistory([newImageFile]);
        setHistoryIndex(0);
        setCompositeFiles([]);
        setStyleSourceIndex(0);
        setActiveTool('retouch');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during compositing.');
    } finally {
        setIsLoading(false);
    }
  }, [compositeFiles, styleSourceIndex]);
  
  const handleApplyCreativeStyle = useCallback(async (stylePrompt: string) => {
    if (!currentImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const styledImageUrl = await generateFilteredImage(currentImage, stylePrompt);
        const newImageFile = dataURLtoFile(styledImageUrl, `styled-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleReplaceObject = useCallback(async () => {
    if (!currentImage) return;
    if (!prompt.trim() || !secondaryPrompt.trim()) { setError('Please fill out both fields.'); return; }
    setIsLoading(true);
    setError(null);
    try {
        const replacePrompt = `Replace the ${prompt} with a ${secondaryPrompt}.`;
        const replacedImageUrl = await generateAdjustedImage(currentImage, replacePrompt);
        const newImageFile = dataURLtoFile(replacedImageUrl, `replaced-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setPrompt('');
        setSecondaryPrompt('');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, secondaryPrompt, addImageToHistory]);
  
  const handleApplyFrame = useCallback(async ({ style, topText, bottomText }: { style: string; topText: string; bottomText: string; }) => {
    if (!currentImage) return;
    if (!style.trim()) { setError('Please describe the frame style.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const framedImageUrl = await generateFramedImage(currentImage, style, topText, bottomText);
      const newImageFile = dataURLtoFile(framedImageUrl, `framed-${Date.now()}.png`);
      addImageToHistory(newImageFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while adding the frame.');
    } finally {
      setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyFrameToBatch = useCallback(async () => {
    if (!pinnedFrameStyle || batchFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    const results: File[] = [];
    try {
        for (const file of batchFiles) {
            const { style, topText, bottomText } = pinnedFrameStyle;
            const framedImageUrl = await generateFramedImage(file, style, topText, bottomText);
            const newImageFile = dataURLtoFile(framedImageUrl, `framed-batch-${file.name}.png`);
            results.push(newImageFile);
        }
        setHistory(results);
        setHistoryIndex(results.length - 1); // Select the last image
        setBatchFiles([]);
        setActiveTool('retouch'); // Switch back to editor view to see results
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during batch processing. Some images may not have been processed.');
        // Still show partial results if any
        if (results.length > 0) {
            setHistory(results);
            setHistoryIndex(results.length - 1);
        }
    } finally {
        setIsLoading(false);
    }
  }, [batchFiles, pinnedFrameStyle]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) { setError('Please select an area to crop.'); return; }
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Could not process the crop.'); return; }
    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);
  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => { if (canUndo) { setHistoryIndex(i => i - 1); setEditHotspots([]); setDisplayHotspots([]); } }, [canUndo]);
  const handleRedo = useCallback(() => { if (canRedo) { setHistoryIndex(i => i + 1); setEditHotspots([]); setDisplayHotspots([]); } }, [canRedo]);
  const handleReset = useCallback(() => { if (history.length > 0) { setHistoryIndex(0); setError(null); setEditHotspots([]); setDisplayHotspots([]); setSelectedIndices(new Set()); } }, [history]);
  const handleUploadNew = useCallback(() => { setHistory([]); setHistoryIndex(-1); setError(null); setPrompt(''); setEditHotspots([]); setDisplayHotspots([]); setCompositeFiles([]); setStyleSourceIndex(0); setBatchFiles([]); setActiveTool('retouch'); setSelectedIndices(new Set()); }, []);
  const handleDownloadCurrentImage = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleToggleSelection = (index: number) => {
    setSelectedIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

  const handleDownloadZip = useCallback(async (filesToZip: File[], archiveName: string) => {
    if (filesToZip.length === 0) {
        setError("No images selected to download.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        filesToZip.forEach((file, index) => {
            const fileName = file.name.replace(/[^a-z0-9_.\-]/gi, '_');
            zip.file(`${String(index).padStart(3, '0')}_${fileName}`, file);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${archiveName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setSelectedIndices(new Set()); // Clear selection after download
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create zip archive.');
    } finally {
        setIsLoading(false);
    }
  }, []);


  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTool !== 'retouch') return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDisplayHotspots(prev => [...prev, { x: offsetX, y: offsetY }]);
    
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;
    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);
    setEditHotspots(prev => [...prev, { x: originalX, y: originalY }]);
  };

  const handleUndoHotspot = () => {
    setDisplayHotspots(prev => prev.slice(0, -1));
    setEditHotspots(prev => prev.slice(0, -1));
  };
  
  const renderControlPanel = () => {
      switch (activeTool) {
          case 'composite':
              return <div className="flex flex-col items-center gap-4 animate-fade-in">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-gray-200 self-start">Image Compositing</h3>
                  <p className="text-md text-slate-600 dark:text-gray-400">
                      Select an image from the main view to be the <span className="font-bold text-blue-600 dark:text-blue-400">Style Source</span>.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-900/50 p-3 rounded-md border border-slate-200 dark:border-gray-700 w-full text-center">
                      Current Style Source: Image {styleSourceIndex + 1}
                  </p>
                  <button
                      onClick={handleGenerateComposite}
                      className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                      disabled={isLoading || compositeFiles.length < 2}
                  >
                      Generate Composite
                  </button>
                  <button onClick={() => { setCompositeFiles([]); setStyleSourceIndex(0); }} className="text-center bg-transparent border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-200 dark:hover:bg-white/10 w-full mt-4">
                      Start Over
                  </button>
              </div>;
          case 'retouch':
              return <div className="flex flex-col items-center gap-4 animate-fade-in">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-gray-200 self-start">Precise Retouching</h3>
                  <p className="text-md text-slate-600 dark:text-gray-400">{editHotspots.length > 0 ? 'Describe your edit below.' : 'Click one or more areas on the image to edit.'}</p>
                  <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex flex-col items-center gap-2">
                      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={editHotspots.length > 0 ? "e.g., 'change shirt to blue'" : "First click the image"} rows={4} className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 resize-y" disabled={isLoading || editHotspots.length === 0} />
                      <div className="w-full grid grid-cols-2 gap-2">
                        <button type="button" onClick={handleUndoHotspot} className="flex items-center justify-center text-center bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading || editHotspots.length === 0}>
                            Undo Last Point
                        </button>
                        <button type="submit" className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-4 text-base rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none" disabled={isLoading || !prompt.trim() || editHotspots.length === 0}>Generate</button>
                      </div>
                  </form>
              </div>;
          case 'replace':
              return <div className="flex flex-col items-center gap-4 animate-fade-in">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-gray-200 self-start">Replace Object</h3>
                  <p className="text-md text-slate-600 dark:text-gray-400">Describe the object and what to replace it with.</p>
                  <form onSubmit={(e) => { e.preventDefault(); handleReplaceObject(); }} className="w-full flex flex-col items-center gap-2">
                      <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Object to replace" className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full" disabled={isLoading} />
                      <input type="text" value={secondaryPrompt} onChange={(e) => setSecondaryPrompt(e.target.value)} placeholder="Replace with" className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full" disabled={isLoading} />
                      <button type="submit" className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none" disabled={isLoading || !prompt.trim() || !secondaryPrompt.trim()}>Replace</button>
                  </form>
              </div>;
          case 'creative': return <CreativePanel onApplyStyle={handleApplyCreativeStyle} isLoading={isLoading} />;
          case 'adjust': return <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />;
          case 'crop': return <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />;
          case 'frame': return <FramePanel onApplyFrame={handleApplyFrame} onPinFrame={setPinnedFrameStyle} isLoading={isLoading} pinnedFrameStyle={pinnedFrameStyle} />;
          case 'batch': return <BatchPanel onApplyFrame={handleApplyFrameToBatch} isLoading={isLoading} pinnedFrameStyle={pinnedFrameStyle} hasBatchFiles={batchFiles.length > 0} />;
          default: return null;
      }
  };

  const renderContent = () => {
    if (error) {
       return <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto my-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors">Try Again</button>
          </div>;
    }
    
    if (!currentImageUrl && activeTool !== 'composite' && activeTool !== 'batch') {
        return <div className="w-full flex justify-center items-center"><StartScreen onFileSelect={(files) => files && handleStartEditing(files[0])} /></div>;
    }
    
    if (activeTool === 'composite' && compositeFiles.length === 0) {
        return <div className="w-full h-full flex items-center justify-center p-8">
            <div className="text-center max-w-2xl animate-fade-in flex flex-col items-center gap-6">
                <CompositeIcon className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                <h2 className="text-4xl font-bold text-slate-800 dark:text-gray-100">Image Composite Tool</h2>
                <p className="text-lg text-slate-600 dark:text-gray-400">Select two or more images to blend together. One will provide the style, the others the content.</p>
                <label htmlFor="composite-upload" className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-full cursor-pointer group hover:bg-blue-500 transition-colors">
                    Select Images
                </label>
                <input id="composite-upload" type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleCompositeFilesSelect(e.target.files)} />
            </div>
        </div>
    }
    
    if (activeTool === 'batch' && batchFiles.length === 0) {
        return <div className="w-full h-full flex items-center justify-center p-8">
            <div className="text-center max-w-2xl animate-fade-in flex flex-col items-center gap-6">
                <BatchIcon className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                <h2 className="text-4xl font-bold text-slate-800 dark:text-gray-100">Batch Processing Tool</h2>
                <p className="text-lg text-slate-600 dark:text-gray-400">Select multiple images to apply the same effect to all of them at once. Pin a frame in the 'Frame' tool to get started.</p>
                <label htmlFor="batch-upload" className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-full cursor-pointer group hover:bg-blue-500 transition-colors">
                    Select Images for Batch
                </label>
                <input id="batch-upload" type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleBatchFilesSelect(e.target.files)} />
            </div>
        </div>
    }


    const imageDisplay = (
      <div className="relative">
        {originalImageUrl && <img key={originalImageUrl} src={originalImageUrl} alt="Original" className="w-full h-auto object-contain max-h-[70vh] rounded-xl pointer-events-none" />}
        <img ref={imgRef} key={currentImageUrl} src={currentImageUrl} alt="Current" onClick={handleImageClick} className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[70vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTool === 'retouch' ? 'cursor-crosshair' : ''}`} />
      </div>
    );
    
    const cropImageElement = <img ref={imgRef} key={`crop-${currentImageUrl}`} src={currentImageUrl} alt="Crop this image" className="w-full h-auto object-contain max-h-[70vh] rounded-xl" />;

    return (
      <div className="w-full h-full flex animate-fade-in">
        <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} isLoading={isLoading} />
        
        <div className="flex-grow flex flex-col items-center justify-start p-4 md:p-8 gap-4 overflow-y-auto">
            {isLoading && <div className="absolute inset-0 bg-white/70 dark:bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in backdrop-blur-sm"><Spinner /><p className="text-slate-700 dark:text-gray-300 font-semibold">AI is working its magic...</p></div>}
            
            {activeTool === 'composite' && compositeFiles.length > 0 ? (
              <div className="w-full max-w-5xl">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-200 mb-4 px-2">Composite Sources</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {compositeFiles.map((file, index) => (
                          <CompositeThumbnail 
                              key={`${file.name}-${index}`}
                              file={file}
                              isSelected={index === styleSourceIndex}
                              onClick={() => setStyleSourceIndex(index)}
                          />
                      ))}
                  </div>
              </div>
            ) : activeTool === 'batch' && batchFiles.length > 0 ? (
              <div className="w-full max-w-5xl">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-200 mb-4 px-2">Batch Images ({batchFiles.length})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {batchFiles.map((file, index) => (
                          <BatchThumbnail 
                              key={`${file.name}-${index}`}
                              file={file}
                          />
                      ))}
                  </div>
              </div>
            ) : (
                <>
                  <div className="relative w-full max-w-5xl shadow-2xl rounded-xl overflow-hidden bg-slate-200 dark:bg-black/20 flex items-center justify-center">
                      {activeTool === 'crop' ? <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect} className="max-h-[70vh]">{cropImageElement}</ReactCrop> : imageDisplay}
                      {!isLoading && activeTool === 'retouch' && displayHotspots.map((hotspot, index) => (
                        <div key={index} className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${hotspot.x}px`, top: `${hotspot.y}px` }}>
                            {index === displayHotspots.length - 1 && <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>}
                        </div>
                      ))}
                  </div>
                  {history.length > 1 && <div className="w-full max-w-5xl">
                      <h3 className="text-sm font-bold text-slate-500 dark:text-gray-400 mb-2 px-2">History</h3>
                      <div className="flex gap-2 overflow-x-auto p-2 bg-slate-100 dark:bg-black/20 rounded-lg">
                        {history.map((imgFile, index) => <ImageThumbnail key={`${imgFile.lastModified}-${index}`} file={imgFile} isSelected={index === historyIndex} onClick={() => { setHistoryIndex(index); setEditHotspots([]); setDisplayHotspots([]); }} isSelectedForDownload={selectedIndices.has(index)} onSelectToggle={() => handleToggleSelection(index)} />)}
                      </div>
                  </div>}
                </>
            )}
        </div>

        <aside className="w-[380px] flex-shrink-0 bg-white/70 dark:bg-gray-800/30 border-l border-slate-200 dark:border-gray-700/80 p-6 flex flex-col gap-6 backdrop-blur-sm overflow-y-auto">
            {renderControlPanel()}
            
            {currentImage && 
              <div className="mt-auto pt-6 border-t border-slate-200 dark:border-gray-700 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleUndo} disabled={!canUndo || isLoading} className="flex items-center justify-center text-center bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Undo"><UndoIcon className="w-5 h-5 mr-2" />Undo</button>
                  <button onClick={handleRedo} disabled={!canRedo || isLoading} className="flex items-center justify-center text-center bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Redo"><RedoIcon className="w-5 h-5 mr-2" />Redo</button>
                  {canUndo && <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)} disabled={isLoading} className="col-span-2 flex items-center justify-center text-center bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-50" aria-label="Compare"><EyeIcon className="w-5 h-5 mr-2" />Compare with Original</button>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleReset} disabled={!canUndo || isLoading} className="text-center bg-transparent border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
                  <button onClick={handleUploadNew} disabled={isLoading} className="text-center bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-50">Upload New</button>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-gray-700">
                    <h3 className="text-md font-semibold text-slate-800 dark:text-gray-300 flex items-center gap-2"><DownloadIcon className="w-5 h-5" />Downloads</h3>
                    <button onClick={handleDownloadCurrentImage} disabled={isLoading} className="w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">Download Current Image</button>
                    <button 
                        onClick={() => handleDownloadZip(Array.from(selectedIndices).map(i => history[i]), 'dreamcraft_selection')}
                        disabled={isLoading || selectedIndices.size === 0} 
                        className="w-full bg-green-600/80 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:bg-green-600/90 hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Download Selected ({selectedIndices.size}) as .zip
                    </button>
                    <button 
                        onClick={() => handleDownloadZip(history, 'dreamcraft_session_history')}
                        disabled={isLoading || history.length < 2} 
                        className="w-full bg-green-600/80 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:bg-green-600/90 hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Download Full History ({history.length}) as .zip
                    </button>
                </div>
              </div>
            }
        </aside>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden">
        {theme === 'dark' && (
            <div id="star-bg" className="animate-fade-in">
                <div id="stars1"></div>
                <div id="stars2"></div>
                <div id="stars3"></div>
                <div id="shooting-stars">
                    <div className="star"></div>
                    <div className="star"></div>
                    <div className="star"></div>
                    <div className="star"></div>
                </div>
            </div>
        )}
      <Header theme={theme} setTheme={setTheme} />
      <main className="flex-grow w-full max-w-full mx-auto flex">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;

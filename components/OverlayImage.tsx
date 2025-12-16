import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Overlay } from '../types';
import { Sliders, Eye, EyeOff, AlertCircle, BookOpen, X, CheckCircle2, XCircle, Maximize2, Columns, MoveHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface OverlayImageProps {
  imageUrl: string;
  overlays: Overlay[];
  referenceStandards?: { accepted: string[]; rejected: string[] };
}

export const OverlayImage: React.FC<OverlayImageProps> = ({ imageUrl, overlays, referenceStandards }) => {
  const [opacity, setOpacity] = useState(0.8);
  const [showLabels, setShowLabels] = useState(true);
  const [showStandards, setShowStandards] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expandedStandard, setExpandedStandard] = useState<{ src: string, type: 'accepted' | 'rejected' } | null>(null);

  // Alignment State
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [contSize, setContSize] = useState({ w: 0, h: 0 });

  // Split View State
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPos, setSplitPos] = useState(50);

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasStandards = referenceStandards && (referenceStandards.accepted.length > 0 || referenceStandards.rejected.length > 0);

  // Measure container size for alignment
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      setContSize({ w: width, h: height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
    setImageError(false);
  };

  // Calculate the actual rendered dimensions and offset of the image within the container
  // This ensures overlays align perfectly with the visual image, ignoring letterboxing.
  const geometry = useMemo(() => {
    if (!imgSize.w || !contSize.w) return { w: 0, h: 0, x: 0, y: 0 };
    const imgRatio = imgSize.w / imgSize.h;
    const contRatio = contSize.w / contSize.h;

    let w, h, x, y;
    if (contRatio > imgRatio) {
      // Container is wider -> image constrained by height
      h = contSize.h;
      w = h * imgRatio;
      y = 0;
      x = (contSize.w - w) / 2;
    } else {
      // Container is taller -> image constrained by width
      w = contSize.w;
      h = w / imgRatio;
      x = 0;
      y = (contSize.h - h) / 2;
    }
    return { w, h, x, y };
  }, [imgSize, contSize]);

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Reset zoom/pan when image changes or mode toggles
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetZoom();
  }, [imageUrl, isSplitMode]);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(1, prev + delta), 5));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Stop page scroll
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDraggingSlider) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSlider && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const internalX = (e.clientX - rect.left - pan.x) / scale;
      const pct = Math.max(0, Math.min(100, (internalX / rect.width) * 100));
      setSplitPos(pct);
      return;
    }

    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingSlider(false);
  };

  // Helper styles
  const getStyleClasses = (overlay: Overlay) => {
    const baseBorder = "border-[3px] shadow-sm";
    if (overlay.region_type === 'defect') {
      if (overlay.severity === 'critical') {
        return `${baseBorder} border-red-600 bg-red-600/20 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse print:border-red-600 print:bg-transparent print:shadow-none`;
      }
      if (overlay.severity === 'major') {
        return `${baseBorder} border-orange-500 bg-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.4)] print:border-orange-500 print:bg-transparent print:shadow-none`;
      }
      return `${baseBorder} border-yellow-400 bg-yellow-400/20 shadow-[0_0_5px_rgba(250,204,21,0.3)] print:border-yellow-500 print:bg-transparent print:shadow-none`;
    }
    if (overlay.region_type === 'ocr_region') return `border-2 border-dashed border-blue-400 bg-blue-400/10 print:border-blue-600 print:bg-transparent`;
    return `border-2 border-green-500 bg-green-500/10 print:border-green-600 print:bg-transparent`;
  };

  const getLabelColor = (overlay: Overlay) => {
    if (overlay.region_type === 'defect') {
      if (overlay.severity === 'critical') return 'bg-red-600 print:bg-red-600 print:text-white';
      if (overlay.severity === 'major') return 'bg-orange-600 print:bg-orange-600 print:text-white';
      return 'bg-yellow-600 print:bg-yellow-600 print:text-black';
    }
    if (overlay.region_type === 'ocr_region') return 'bg-blue-600 print:bg-blue-600 print:text-white';
    return 'bg-green-600 print:bg-green-600 print:text-white';
  };

  const getLabel = (overlay: Overlay) => {
    const text = overlay.defect_class || overlay.region_label || overlay.region_type;
    return text.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col h-full print:h-auto print:block relative">
      <style>
        {`
          @keyframes popIn {
            0% { opacity: 0; transform: scale(0.9); }
            70% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
          .animate-pop-in {
            animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>

      {/* Main Image Area */}
      <div
        ref={containerRef}
        className="relative w-full flex-grow bg-slate-900 rounded-lg overflow-hidden border border-gray-300 group shadow-inner print:bg-white print:border-0 print:shadow-none print:h-auto print:overflow-visible flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {imageError ? (
          <div className="flex flex-col items-center justify-center text-slate-500 p-8">
            <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-sm font-medium">Image Unavailable</span>
            <span className="text-xs opacity-70 mt-1">Source file could not be loaded</span>
          </div>
        ) : (
          /* Transform Layer - Applies Zoom & Pan to everything inside */
          <div
            className="w-full h-full relative flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%'
            }}
          >
            <img
              src={imageUrl}
              alt="Inspection Subject"
              onLoad={handleImageLoad}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain mx-auto print:object-contain print:h-auto print:max-h-[600px] print:w-auto print:mx-auto pointer-events-none"
            />

            {/* Overlays Layer */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 print:opacity-100"
              style={{
                opacity: isSplitMode ? 1 : opacity,
                clipPath: isSplitMode ? `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` : 'none'
              }}
            >
              {overlays.map((overlay, idx) => {
                // Calculate absolute pixel position based on rendered image geometry
                // This fixes alignment issues caused by letterboxing (object-contain)
                const bbox = overlay.bbox || [0, 0, 0, 0];
                const bx = bbox[0] ?? 0;
                const by = bbox[1] ?? 0;
                const bw = bbox[2] ?? 0;
                const bh = bbox[3] ?? 0;
                const left = geometry.x + (bx * geometry.w);
                const top = geometry.y + (by * geometry.h);
                const width = bw * geometry.w;
                const height = bh * geometry.h;

                return (
                  <div
                    key={idx}
                    className="absolute animate-pop-in transition-all duration-300 hover:z-20"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      animationDelay: `${idx * 100}ms`
                    }}
                  >
                    <div className={`w-full h-full rounded-sm ${getStyleClasses(overlay)}`}>
                      {(showLabels) && (
                        <div
                          className={`absolute bottom-full left-0 mb-1 flex items-center gap-1 text-white text-[10px] px-2 py-1 rounded-md shadow-md backdrop-blur-sm z-10 whitespace-nowrap print:shadow-none print:mb-0 ${getLabelColor(overlay)}`}
                          // Scale inverse to zoom to keep text size constant. 
                          // transform-origin: bottom-left ensures it stays anchored to the top-left corner of the box.
                          style={{ transform: `scale(${1 / scale})`, transformOrigin: 'bottom left' }}
                        >
                          {overlay.severity === 'critical' && <AlertCircle className="w-3 h-3" />}
                          <span className="font-bold uppercase tracking-wide">{getLabel(overlay)}</span>
                          {overlay.severity && <span className="opacity-90 font-light pl-1 border-l border-white/30 ml-1">{overlay.severity}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split View Slider Handle (Inside Transform) */}
            {isSplitMode && (
              <div
                className="absolute top-0 bottom-0 w-1 -ml-0.5 z-20 cursor-ew-resize group"
                style={{ left: `${splitPos}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingSlider(true);
                }}
              >
                {/* Visual Line */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] -translate-x-1/2 pointer-events-none"></div>

                {/* Handle Knob */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-lg border border-gray-100 transform transition-transform group-hover:scale-110 pointer-events-none">
                  <MoveHorizontal className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Labels (Outside Transform - Viewport Fixed) */}
        {!imageError && isSplitMode && (
          <>
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none z-20 backdrop-blur-md border border-white/10 shadow-lg">
              ANALYSIS
            </div>
            <div className="absolute bottom-4 right-4 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none z-20 backdrop-blur-md border border-white/10 shadow-lg">
              ORIGINAL
            </div>
          </>
        )}

        {/* Reference Standards Floating Panel */}
        {showStandards && referenceStandards && (
          <div className="absolute top-4 right-4 w-60 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-gray-200 p-4 z-30 animate-fadeIn flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Standards
              </span>
              <button onClick={() => setShowStandards(false)} className="hover:bg-gray-100 rounded-full p-1 transition"><X className="w-3 h-3 text-gray-400" /></button>
            </div>
            {/* Accepted */}
            {referenceStandards.accepted.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-green-700 flex items-center gap-1.5 mb-2 bg-green-50 px-2 py-1 rounded border border-green-100"><CheckCircle2 className="w-3 h-3" /> ACCEPTABLE</span>
                <div className="grid grid-cols-2 gap-2">
                  {referenceStandards.accepted.map((src, i) => (
                    <div key={i} className="group relative cursor-pointer" onClick={() => setExpandedStandard({ src, type: 'accepted' })}>
                      <img src={src} className="w-full h-20 object-cover rounded border border-green-200 shadow-sm hover:border-green-400 transition" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Rejected */}
            {referenceStandards.rejected.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-red-700 flex items-center gap-1.5 mb-2 bg-red-50 px-2 py-1 rounded border border-red-100"><XCircle className="w-3 h-3" /> REJECT IF</span>
                <div className="grid grid-cols-2 gap-2">
                  {referenceStandards.rejected.map((src, i) => (
                    <div key={i} className="group relative cursor-pointer" onClick={() => setExpandedStandard({ src, type: 'rejected' })}>
                      <img src={src} className="w-full h-20 object-cover rounded border border-red-200 shadow-sm hover:border-red-400 transition" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Standard Modal */}
      {expandedStandard && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center p-8 animate-fadeIn">
          <button
            onClick={() => setExpandedStandard(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div className={`text-white text-lg font-bold mb-4 flex items-center gap-2 px-4 py-2 rounded-full ${expandedStandard.type === 'accepted' ? 'bg-green-600' : 'bg-red-600'}`}>
            {expandedStandard.type === 'accepted' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {expandedStandard.type === 'accepted' ? 'ACCEPTABLE STANDARD' : 'REJECTION STANDARD'}
          </div>
          <img
            src={expandedStandard.src}
            className="max-w-full max-h-[80%] object-contain rounded-lg shadow-2xl border-4 border-white/10"
            alt="Expanded Reference"
          />
          <p className="text-white/60 text-sm mt-4 text-center max-w-md">
            Compare this reference image with the inspection capture.
            {expandedStandard.type === 'accepted' ? ' Inspect for matching features.' : ' Inspect for similar defects.'}
          </p>
        </div>
      )}

      {/* Controls Toolbar - Hidden in Print */}
      <div className="mt-3 flex flex-wrap items-center justify-between px-3 py-2 gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm print:hidden">

        {/* Opacity Control */}
        <div className={`flex items-center gap-3 flex-grow max-w-[200px] transition-opacity ${isSplitMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <Sliders className="w-4 h-4 text-gray-500" />
          <div className="flex-grow flex flex-col justify-center">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span className="font-semibold uppercase text-gray-400">Overlay Intensity</span>
              <span className="font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-l border-r border-gray-200 px-3">
          <button onClick={() => handleZoom(-0.5)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => handleZoom(0.5)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={resetZoom} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 ml-1" title="Reset View">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSplitMode(!isSplitMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${isSplitMode ? 'bg-slate-800 text-white shadow-slate-300' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            title="Comparison Wipe Slider"
          >
            <Columns className="w-3 h-3" />
            {isSplitMode ? 'EXIT SPLIT' : 'SPLIT VIEW'}
          </button>

          {hasStandards && (
            <button
              onClick={() => setShowStandards(!showStandards)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${showStandards ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              <BookOpen className="w-3 h-3" />
              {showStandards ? 'HIDE REFS' : 'COMPARE'}
            </button>
          )}

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${showLabels ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {showLabels ? 'LABELS' : 'LABELS'}
          </button>
        </div>
      </div>
    </div>
  );
};
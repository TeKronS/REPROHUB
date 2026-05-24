"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface MuralCanvasProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
  overlap: number;
  marginV: number;
  marginH: number;
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  showGuides: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

const PAPER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'Carta': { width: 215.9, height: 279.4 },
  'A4': { width: 210, height: 297 },
  'A3': { width: 297, height: 420 },
  'Oficio (Legal 35.5cm)': { width: 215.9, height: 355.6 },
  'Folio (33cm)': { width: 215.9, height: 330.2 },
  'Oficio (34cm)': { width: 216, height: 340 },
  'Extra Oficio (38cm)': { width: 216, height: 380 }
};

export function MuralCanvas({ 
  imageUrl, 
  rows, 
  cols, 
  overlap, 
  marginV, 
  marginH,
  paperSize,
  orientation,
  showGuides,
  imageWidth = 1,
  imageHeight = 1
}: MuralCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const paperBase = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS['Carta'];
  const paper = orientation === 'portrait' 
    ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
    : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

  const dimensions = useMemo(() => {
    const printableW = paper.width - (marginH * 20);
    const printableH = paper.height - (marginV * 20);
    const overlapMm = overlap * 10;
    
    const effectiveW = printableW - overlapMm;
    const effectiveH = printableH - overlapMm;
    
    const totalGridW = (cols * effectiveW) + overlapMm;
    const totalGridH = (rows * effectiveH) + overlapMm;
    
    const imgAspect = imageWidth / imageHeight;
    const gridAspect = totalGridW / totalGridH;
    
    let drawW, drawH;
    if (imgAspect > gridAspect) {
      drawW = totalGridW;
      drawH = totalGridW / imgAspect;
    } else {
      drawH = totalGridH;
      drawW = totalGridH * imgAspect;
    }

    return {
      totalW: totalGridW,
      totalH: totalGridH,
      drawW,
      drawH,
      printableW,
      printableH
    };
  }, [paper, rows, cols, overlap, marginV, marginH, imageWidth, imageHeight]);

  useEffect(() => {
    if (!containerRef.current || !imageUrl) return;
    
    const updateZoomToFit = () => {
      const container = containerRef.current;
      if (!container) return;

      const padding = 80; 
      const availableW = container.clientWidth - padding;
      const availableH = container.clientHeight - padding;
      
      const contentW = dimensions.totalW;
      const contentH = dimensions.totalH;
      
      const scaleW = availableW / contentW;
      const scaleH = availableH / contentH;
      const fitScale = Math.min(scaleW, scaleH);
      
      setZoom(Math.min(fitScale * 0.95, 3.0));
      setOffset({ x: 0, y: 0 });
    };

    const timer = setTimeout(updateZoomToFit, 100);
    return () => clearTimeout(timer);
  }, [dimensions.totalW, dimensions.totalH, imageUrl, paperSize, orientation]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const delta = e.deltaY;
      setZoom(prev => Math.min(Math.max(0.05, prev - delta * 0.001), 10));
    };
    
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  if (!imageUrl) return null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex-1 h-full bg-[#f0f2f5] overflow-hidden select-none border border-border/40 rounded-2xl shadow-inner flex items-center justify-center",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div 
        className="relative origin-center pointer-events-auto"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <div 
          className="relative bg-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.3)] border border-border/50 overflow-hidden flex items-center justify-center"
          style={{ 
            width: `${dimensions.totalW}px`, 
            height: `${dimensions.totalH}px`
          }}
        >
          <div className="relative" style={{ width: `${dimensions.drawW}px`, height: `${dimensions.drawH}px` }}>
            <img 
              src={imageUrl} 
              alt="Mural" 
              className="w-full h-full object-cover block" 
              draggable={false}
            />
          </div>
          
          <div className="absolute inset-0 grid pointer-events-none" 
               style={{ 
                 gridTemplateRows: `repeat(${rows}, 1fr)`,
                 gridTemplateColumns: `repeat(${cols}, 1fr)` 
               }}>
            {Array.from({ length: rows * cols }).map((_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              return (
                <div key={i} className={cn(
                  "relative", 
                  showGuides ? "border-[2px] border-primary/40" : "border-0"
                )}>
                  {showGuides && (
                    <>
                      <div className="absolute inset-0 border-black/5" 
                           style={{ 
                             borderTopWidth: `${marginV * 10}px`,
                             borderBottomWidth: `${marginV * 10}px`,
                             borderLeftWidth: `${marginH * 10}px`,
                             borderRightWidth: `${marginH * 10}px`
                           }} />
                           
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-md border border-primary/20 shadow-sm z-20">
                        <span className="text-[11px] font-black font-mono text-primary leading-none tracking-tighter">{r+1}-{c+1}</span>
                      </div>
                      
                      {c < cols - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 bg-accent/10 border-r-2 border-dashed border-accent/30" 
                             style={{ width: `${overlap * 10}px` }}>
                          <div className="absolute top-2 right-2 text-[8px] font-black text-accent uppercase tracking-wider bg-white/80 px-1 rounded shadow-sm">Solape</div>
                        </div>
                      )}
                      {r < rows - 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-accent/10 border-b-2 border-dashed border-accent/30" 
                             style={{ height: `${overlap * 10}px` }} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-border shadow-xl animate-fade-in z-50">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Control de Vista</span>
          <span className="text-[10px] font-bold text-foreground">Scroll: Zoom • Click + Arrastrar: Mover</span>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Zoom Actual</span>
          <span className="text-[10px] font-bold text-primary">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
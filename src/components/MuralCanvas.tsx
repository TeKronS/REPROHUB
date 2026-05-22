
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface MuralCanvasProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
  overlap: number;
  margins: number;
  paperSize: string;
  showGuides: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

const PAPER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'Letter': { width: 215.9, height: 279.4 },
  'A4': { width: 210, height: 297 },
  'A3': { width: 297, height: 420 },
  'Legal': { width: 215.9, height: 355.6 }
};

export function MuralCanvas({ 
  imageUrl, 
  rows, 
  cols, 
  overlap, 
  margins, 
  paperSize, 
  showGuides,
  imageWidth = 1,
  imageHeight = 1
}: MuralCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(prev => Math.min(Math.max(0.1, prev - e.deltaY * 0.001), 5));
      }
    };
    const current = containerRef.current;
    current?.addEventListener("wheel", handleWheel, { passive: false });
    return () => current?.removeEventListener("wheel", handleWheel);
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

  const paper = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS['Letter'];
  const printableW = paper.width - (margins * 20);
  const printableH = paper.height - (margins * 20);
  const overlapMm = overlap * 10;
  
  const effectiveW = printableW - overlapMm;
  const effectiveH = printableH - overlapMm;
  
  const totalGridW = (cols * effectiveW) + overlapMm;
  const totalGridH = (rows * effectiveH) + overlapMm;
  
  // Aspect ratio synchronization
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

  // Scaling for preview (base 1mm = 2px)
  const baseScale = 2;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex-1 bg-[#f0f2f5] overflow-hidden flex items-center justify-center select-none border border-border/40 rounded-2xl shadow-inner",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div 
        className="relative will-change-transform"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
        }}
      >
        {/* Total Canvas representing the sheets area */}
        <div 
          className="relative bg-white shadow-2xl border border-border/50 overflow-hidden flex items-center justify-center"
          style={{ 
            width: `${totalGridW * baseScale}px`, 
            height: `${totalGridH * baseScale}px` 
          }}
        >
          {/* Real Image placement */}
          <div className="relative" style={{ width: `${drawW * baseScale}px`, height: `${drawH * baseScale}px` }}>
            <img 
              src={imageUrl} 
              alt="Mural" 
              className="w-full h-full object-cover block shadow-sm" 
              draggable={false}
            />
          </div>
          
          {/* Grid Overlay showing the physical paper sheets */}
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
                  showGuides ? "border-[1px] border-primary/40" : "border-0"
                )}>
                  {showGuides && (
                    <>
                      {/* Printable Area guides (Margins) */}
                      <div className="absolute inset-0 border-black/5" 
                           style={{ borderWidth: `${margins * baseScale * 10}px` }} />
                           
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded border border-primary/20 shadow-sm">
                        <span className="text-[10px] font-black font-mono text-primary leading-none">{r+1}-{c+1}</span>
                      </div>
                      
                      {/* Overlap Shading */}
                      {c < cols - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 bg-accent/10 border-r border-dashed border-accent/30" 
                             style={{ width: `${overlap * baseScale * 10}px` }}>
                          <div className="absolute -top-3 right-0 text-[7px] font-bold text-accent uppercase">Solape</div>
                        </div>
                      )}
                      {r < rows - 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-accent/10 border-b border-dashed border-accent/30" 
                             style={{ height: `${overlap * baseScale * 10}px` }} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-border shadow-lg animate-fade-in">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Interacción</span>
          <span className="text-[10px] font-bold text-foreground">CTRL + Scroll: Zoom • Arrastrar: Mover</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Escala Vista</span>
          <span className="text-[10px] font-bold text-primary">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

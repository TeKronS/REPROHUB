
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MuralCanvasProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
  overlap: number;
  margins: number;
  paperSize: string;
  showGuides: boolean;
}

export function MuralCanvas({ 
  imageUrl, 
  rows, 
  cols, 
  overlap, 
  margins, 
  paperSize, 
  showGuides 
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
        setZoom(prev => Math.min(Math.max(0.2, prev - e.deltaY * 0.001), 4));
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

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex-1 bg-[#f0f2f5] overflow-hidden flex items-center justify-center select-none",
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
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <div className="relative shadow-xl bg-white border border-border rounded-sm overflow-hidden">
          <img 
            src={imageUrl} 
            alt="Mural" 
            className="max-h-[70vh] w-auto block" 
            draggable={false}
          />
          
          <div className="absolute inset-0 grid pointer-events-none" 
               style={{ 
                 gridTemplateRows: `repeat(${rows}, 1fr)`,
                 gridTemplateColumns: `repeat(${cols}, 1fr)` 
               }}>
            {Array.from({ length: rows * cols }).map((_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              return (
                <div key={i} className={cn("relative", showGuides ? "border-[1.5px] border-primary/60" : "border-0")}>
                  {showGuides && (
                    <>
                      <div className="absolute top-2 left-2 bg-white/90 px-1.5 py-0.5 rounded border border-primary/20 shadow-sm">
                        <span className="text-[10px] font-black font-mono text-primary">{r+1}-{c+1}</span>
                      </div>
                      
                      {/* Overlap Visualization */}
                      {c < cols - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 bg-accent/15 border-r border-dashed border-accent/30" 
                             style={{ width: `${overlap * 10}px`, maxWidth: '25%' }} />
                      )}
                      {r < rows - 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-accent/15 border-b border-dashed border-accent/30" 
                             style={{ height: `${overlap * 10}px`, maxHeight: '25%' }} />
                      )}
                      
                      {/* Margins Visualization */}
                      <div className="absolute inset-0 border-black/5" style={{ borderWidth: `${margins * 4}px` }} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border shadow-sm text-[9px] font-black text-muted-foreground uppercase tracking-widest">
        CTRL + Scroll: Zoom ({Math.round(zoom * 100)}%) | Arrastrar para mover
      </div>
    </div>
  );
}

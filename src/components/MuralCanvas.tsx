
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

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex-1 bg-[#f9fafb] overflow-hidden flex items-center justify-center select-none border border-border/40 rounded-2xl",
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
        <div className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] bg-white border border-border/80 rounded-sm overflow-hidden p-0">
          <img 
            src={imageUrl} 
            alt="Mural" 
            className="max-h-[85vh] w-auto block" 
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
                <div key={i} className={cn(
                  "relative transition-colors duration-300", 
                  showGuides ? "border-[2px] border-primary/50" : "border-0"
                )}>
                  {showGuides && (
                    <>
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md border border-primary/30 shadow-md">
                        <span className="text-[12px] font-black font-mono text-primary leading-none">{r+1}-{c+1}</span>
                      </div>
                      
                      {/* Overlap Visualization (Right) */}
                      {c < cols - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 bg-accent/20 border-r border-dashed border-accent/40" 
                             style={{ width: `${overlap * 12}px`, maxWidth: '30%' }}>
                          <div className="absolute -top-4 right-0 text-[8px] font-bold text-accent uppercase">Solape</div>
                        </div>
                      )}
                      {/* Overlap Visualization (Bottom) */}
                      {r < rows - 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-accent/20 border-b border-dashed border-accent/40" 
                             style={{ height: `${overlap * 12}px`, maxHeight: '30%' }} />
                      )}
                      
                      {/* Margins Visualization (Internal Safe Area) */}
                      <div className="absolute inset-0 border-black/10" 
                           style={{ borderWidth: `${margins * 6}px` }} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-border shadow-lg animate-fade-in">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Navegación</span>
          <span className="text-[10px] font-bold text-foreground">CTRL + Scroll: Zoom • Click + Arrastrar: Mover</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Zoom</span>
          <span className="text-[10px] font-bold text-primary">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

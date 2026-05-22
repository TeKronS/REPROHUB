
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MuralCanvasProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
  overlap: number;
  showGuides: boolean;
}

export function MuralCanvas({ imageUrl, rows, cols, overlap, showGuides }: MuralCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(prev => Math.min(Math.max(0.1, prev - e.deltaY * 0.001), 3));
      }
    };
    const current = containerRef.current;
    current?.addEventListener("wheel", handleWheel, { passive: false });
    return () => current?.removeEventListener("wheel", handleWheel);
  }, []);

  if (!imageUrl) return null;

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 bg-muted/30 overflow-hidden flex items-center justify-center p-12"
    >
      <div 
        className="relative shadow-2xl transition-transform duration-200 ease-out bg-white"
        style={{ transform: `scale(${zoom})` }}
      >
        <img 
          src={imageUrl} 
          alt="Mural asset" 
          className="max-h-[80vh] w-auto block select-none" 
        />
        
        {/* Grid Overlay - Enhanced visibility */}
        <div className="absolute inset-0 grid pointer-events-none" 
             style={{ 
               gridTemplateRows: `repeat(${rows}, 1fr)`,
               gridTemplateColumns: `repeat(${cols}, 1fr)` 
             }}>
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "relative",
                showGuides ? "border-2 border-primary/80" : "border-0"
              )}
            >
              {showGuides && (
                <>
                  <span className="absolute top-1 left-1 text-[11px] font-black font-mono text-white bg-primary px-2 py-0.5 rounded shadow-md z-10">
                    {Math.floor(i / cols) + 1}-{ (i % cols) + 1}
                  </span>
                  {/* Overlap visualization - More prominent */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-[95%] h-[95%] border-2 border-accent border-dashed" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold font-mono border border-border shadow-xl text-primary">
        ZOOM: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

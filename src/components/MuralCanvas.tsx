
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
        
        {/* Grid Overlay */}
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
                showGuides ? "border border-primary/60 border-[1.5px]" : "border-0"
              )}
            >
              {showGuides && (
                <>
                  <span className="absolute top-1 left-1 text-[10px] font-bold font-mono text-primary bg-white/90 px-1.5 py-0.5 rounded shadow-sm z-10">
                    {Math.floor(i / cols) + 1}-{ (i % cols) + 1}
                  </span>
                  {/* Overlap visualization dots/lines - More visible in light mode */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-[90%] h-[90%] border border-accent border-dashed border-2" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold font-mono border border-border shadow-xl text-primary">
        ZOOM: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

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
      className="relative flex-1 bg-[#f5f5f5] overflow-hidden flex items-center justify-center p-12"
    >
      <div 
        className="relative shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out bg-white"
        style={{ transform: `scale(${zoom})` }}
      >
        <img 
          src={imageUrl} 
          alt="Mural asset" 
          className="max-h-[75vh] w-auto block select-none border-8 border-white" 
        />
        
        {/* Grid Overlay */}
        <div className="absolute inset-[8px] grid pointer-events-none" 
             style={{ 
               gridTemplateRows: `repeat(${rows}, 1fr)`,
               gridTemplateColumns: `repeat(${cols}, 1fr)` 
             }}>
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "relative group",
                showGuides ? "border border-primary/40" : "border-0"
              )}
            >
              {showGuides && (
                <>
                  <span className="absolute top-1 left-1 text-[9px] font-black font-mono text-white bg-primary/80 px-1.5 py-0.5 rounded backdrop-blur-sm z-10">
                    {Math.floor(i / cols) + 1}-{ (i % cols) + 1}
                  </span>
                  
                  {/* Overlap Visualizers - Stronger & Clearer */}
                  {/* Right Overlap */}
                  {(i % cols) < cols - 1 && (
                    <div className="absolute right-0 top-0 bottom-0 w-[15%] border-r border-accent/60 border-dashed bg-accent/5" />
                  )}
                  {/* Bottom Overlap */}
                  {Math.floor(i / cols) < rows - 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[15%] border-b border-accent/60 border-dashed bg-accent/5" />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Control Hints */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-border shadow-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Solapamiento Visible
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-6 right-6 bg-primary px-5 py-2 rounded-full text-[10px] font-black font-mono shadow-2xl text-white tracking-widest border border-white/20">
        ZOOM: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

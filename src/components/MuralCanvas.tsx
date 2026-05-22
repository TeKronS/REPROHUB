
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MuralCanvasProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
  overlap: number; // cm
  margins: number; // cm
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!imageUrl) return null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex-1 bg-[#f0f2f5] overflow-hidden flex items-center justify-center p-8 select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="relative flex items-center justify-center will-change-transform"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {/* Simulación del área total del mural sobre la pared */}
        <div className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] bg-white border border-white">
          <img 
            src={imageUrl} 
            alt="Mural asset" 
            className="max-h-[75vh] w-auto block pointer-events-none" 
            draggable={false}
          />
          
          {/* Grid Overlay Dinámico con líneas más visibles */}
          <div className="absolute inset-0 grid pointer-events-none" 
               style={{ 
                 gridTemplateRows: `repeat(${rows}, 1fr)`,
                 gridTemplateColumns: `repeat(${cols}, 1fr)` 
               }}>
            {Array.from({ length: rows * cols }).map((_, i) => {
              const rowIdx = Math.floor(i / cols);
              const colIdx = i % cols;
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "relative",
                    showGuides ? "border border-primary/60 ring-1 ring-primary/10" : "border-0"
                  )}
                >
                  {showGuides && (
                    <>
                      {/* Identificador de panel */}
                      <div className="absolute top-2 left-2 z-30">
                        <span className="text-[10px] font-black font-mono text-primary bg-white/95 px-2 py-0.5 rounded-md shadow-sm border border-primary/30 backdrop-blur-sm">
                          {rowIdx + 1}-{colIdx + 1}
                        </span>
                      </div>
                      
                      {/* Visualización de Márgenes (Blanco opaco para simular papel sobrante) */}
                      <div 
                        className="absolute inset-0 border-white/80 pointer-events-none z-10"
                        style={{ borderWidth: `${margins * 4}px` }}
                      />

                      {/* Visualización de Solapamiento (Overlap) */}
                      {/* Derecha */}
                      {colIdx < cols - 1 && (
                        <div 
                          className="absolute right-0 top-0 bottom-0 bg-accent/30 border-r border-dashed border-accent/60 z-20 overflow-hidden"
                          style={{ width: `${overlap * 10}px`, maxWidth: '30%' }}
                        >
                          <div className="h-full w-full flex items-center justify-center">
                             <div className="rotate-90 text-[7px] font-black text-accent tracking-widest whitespace-nowrap opacity-90">SOLAPE</div>
                          </div>
                        </div>
                      )}
                      {/* Abajo */}
                      {rowIdx < rows - 1 && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-accent/30 border-b border-dashed border-accent/60 z-20 overflow-hidden"
                          style={{ height: `${overlap * 10}px`, maxHeight: '30%' }}
                        >
                           <div className="h-full w-full flex items-center justify-center">
                             <div className="text-[7px] font-black text-accent tracking-widest opacity-90 uppercase">Solapamiento inferior</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating UI Context */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/50 shadow-xl flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Papel</span>
            <span className="text-xs font-black text-primary">{paperSize}</span>
          </div>
          <div className="h-6 w-px bg-primary/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Paneles</span>
            <span className="text-xs font-black text-primary">{rows}x{cols} ({rows * cols})</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 bg-white/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/50 shadow-xl text-[10px] font-black font-mono text-primary/70">
        Nivel de Zoom: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

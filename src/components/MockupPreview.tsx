
"use client";

import { memo } from "react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

interface MockupPreviewProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
}

export const MockupPreview = memo(function MockupPreview({ imageUrl, rows, cols }: MockupPreviewProps) {
  const room = PlaceHolderImages.find(img => img.id === 'modern-living-room');

  return (
    <div className="relative w-full h-full bg-[#111] rounded-2xl overflow-hidden shadow-2xl group flex items-center justify-center">
      {/* Background Room with stronger overlay for focus */}
      <img 
        src={room?.imageUrl} 
        alt="Room context" 
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        data-ai-hint="modern minimalist room"
      />
      
      {/* Mural Placement Simulation */}
      {imageUrl && (
        <div className="relative z-10 w-[70%] max-w-4xl aspect-video flex items-center justify-center">
          <div className="relative w-full h-full perspective-2000 rotate-y-[-8] rotate-x-[2] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] transition-transform duration-700">
            <div className="relative w-full h-full border-[15px] border-white shadow-inner bg-white overflow-hidden rounded-sm">
               <img 
                src={imageUrl} 
                alt="Mural on wall" 
                className="w-full h-full object-cover" 
              />
              {/* Visible Grid in simulation */}
              <div className="absolute inset-0 grid opacity-30 mix-blend-multiply" 
                  style={{ 
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${cols}, 1fr)` 
                  }}>
                {Array.from({ length: rows * cols }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-black/20" />
                ))}
              </div>
            </div>
            {/* Ambient Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
          </div>
          {/* Floor Shadow */}
          <div className="absolute -bottom-20 left-[10%] w-[80%] h-20 bg-black/40 blur-3xl rounded-full" />
        </div>
      )}

      <div className="absolute bottom-8 left-8 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-white text-lg font-headline font-black tracking-tight drop-shadow-lg uppercase">Simulación Realista</span>
        </div>
        <span className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase drop-shadow-sm">Renderizado en tiempo real</span>
      </div>

      <div className="absolute top-8 right-8 flex flex-col items-end gap-1">
        <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">Configuración Actual</span>
        <span className="text-white/80 text-xs font-mono font-bold">{rows} FILAS x {cols} COLUMNAS</span>
      </div>
    </div>
  );
});

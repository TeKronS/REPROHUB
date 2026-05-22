
"use client";

import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";

interface MockupPreviewProps {
  imageUrl: string | null;
  rows: number;
  cols: number;
}

export function MockupPreview({ imageUrl, rows, cols }: MockupPreviewProps) {
  const room = PlaceHolderImages.find(img => img.id === 'modern-living-room');

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl group">
      {/* Background Room */}
      <img 
        src={room?.imageUrl} 
        alt="Room context" 
        className="w-full h-full object-cover opacity-80"
        data-ai-hint="modern living room"
      />
      
      {/* Mural Placement Simulation */}
      {imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center p-20 pointer-events-none">
          <div className="relative w-[60%] aspect-video perspective-1000 rotate-y-[-5] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]">
            <div className="relative w-full h-full border-[12px] border-white shadow-inner bg-white overflow-hidden">
               <img 
                src={imageUrl} 
                alt="Mural on wall" 
                className="w-full h-full object-cover" 
              />
              {/* Grid hint in preview */}
              <div className="absolute inset-0 grid opacity-20" 
                  style={{ 
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${cols}, 1fr)` 
                  }}>
                {Array.from({ length: rows * cols }).map((_, i) => (
                  <div key={i} className="border border-white/50" />
                ))}
              </div>
            </div>
            {/* Ambient Shadow beneath */}
            <div className="absolute -bottom-10 left-0 w-full h-10 bg-black/20 blur-xl rounded-full" />
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-6 flex flex-col gap-1">
        <span className="text-white text-lg font-headline font-bold drop-shadow-md">Simulation Mode</span>
        <span className="text-white/60 text-xs drop-shadow-sm">Real-world scale 1:20 approximate</span>
      </div>
    </div>
  );
}

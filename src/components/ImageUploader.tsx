
"use client";

import { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageUpload: (file: File, url: string) => void;
  language: 'en' | 'es';
  t: any;
}

export function ImageUploader({ onImageUpload, language, t }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      onImageUpload(file, url);
    }
  }, [onImageUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageUpload(file, url);
    }
  }, [onImageUpload]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-full min-h-[300px] md:min-h-[400px] border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer group",
        isDragging ? "border-accent bg-accent/5" : "border-border hover:border-primary/50 hover:bg-primary/5",
        "bg-card/50 backdrop-blur-sm"
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center space-y-4 text-center p-8 pointer-events-none">
        <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
          <Upload className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-headline font-semibold">{t.upload}</h3>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            {t.dragDrop}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="font-bold">
            {t.upload}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG or WebP. Max 50MB para impresiones de alta resolución.
        </p>
      </div>
    </div>
  );
}

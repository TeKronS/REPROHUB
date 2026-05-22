
"use client";

import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageUpload: (file: File, url: string) => void;
  language: 'en' | 'es';
  t: any;
}

export function ImageUploader({ onImageUpload, language, t }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-full min-h-[400px] border-2 border-dashed rounded-xl transition-all duration-300",
        isDragging ? "border-accent bg-accent/5" : "border-border hover:border-primary/50",
        "bg-card/50 backdrop-blur-sm"
      )}
    >
      <div className="flex flex-col items-center space-y-4 text-center p-8">
        <div className="p-4 bg-primary/10 rounded-full">
          <Upload className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-headline font-semibold">{t.upload}</h3>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            {t.dragDrop}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" className="relative cursor-pointer">
            <label>
              {t.upload}
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*"
                onChange={handleFileInput}
              />
            </label>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG or WebP. Max 50MB for high resolution prints.
        </p>
      </div>
    </div>
  );
}

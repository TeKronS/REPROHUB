"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  Maximize, 
  Download, 
  Loader2, 
  Settings2,
  RefreshCcw,
  Link as LinkIcon,
  Link2Off,
  Scale,
  Ruler,
  Zap,
  ImageIcon,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import logo from "@/app/icono.png";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

export default function ImageResizer() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<{ url: string; width: number; height: number; name: string } | null>(null);
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [dpi, setDpi] = useState<number>(300);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [lockAspect, setLockAspect] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Error", description: "El archivo debe ser una imagen." });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage({ 
        url, 
        width: img.width, 
        height: img.height, 
        name: file.name 
      });

      const pixelsPerCm = 300 / 2.54;
      setTargetWidth(Math.round(img.width / pixelsPerCm * 10) / 10);
      setTargetHeight(Math.round(img.height / pixelsPerCm * 10) / 10);
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleWidthChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setTargetWidth(num);
    if (lockAspect && image && num > 0) {
      const aspect = image.width / image.height;
      setTargetHeight(Math.round((num / aspect) * 100) / 100);
    }
  };

  const handleHeightChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setTargetHeight(num);
    if (lockAspect && image && num > 0) {
      const aspect = image.width / image.height;
      setTargetWidth(Math.round((num * aspect) * 100) / 100);
    }
  };

  const startResizing = async () => {
    if (!image) return;
    setIsResizing(true);

    try {
      const factor = unit === 'cm' ? 2.54 : 1;
      const finalPixelW = Math.round((targetWidth / factor) * dpi);
      const finalPixelH = Math.round((targetHeight / factor) * dpi);

      const canvas = document.createElement('canvas');
      canvas.width = finalPixelW;
      canvas.height = finalPixelH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      const img = new window.Image();
      img.src = image.url;
      await new Promise((resolve) => img.onload = resolve);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, finalPixelW, finalPixelH);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Resized-${targetWidth}${unit}-${dpi}dpi-${image.name}`;
      link.click();

      toast({ title: "Imagen lista", description: "Tu imagen redimensionada se ha descargado." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Ocurrió un error al redimensionar." });
    } finally {
      setIsResizing(false);
    }
  };

  if (!mounted) return null;

  const finalPixelsW = image ? Math.round(((unit === 'cm' ? targetWidth / 2.54 : targetWidth)) * dpi) : 0;
  const finalPixelsH = image ? Math.round(((unit === 'cm' ? targetHeight / 2.54 : targetHeight)) * dpi) : 0;
  const megapixels = Math.round((finalPixelsW * finalPixelsH) / 1000000 * 10) / 10;

  const renderSettingsContent = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-emerald-500" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t.gridSettings}</h2>
      </div>

      <div className="space-y-3">
        <div className="space-y-0.5">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.units}</Label>
          <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
            <SelectTrigger className="h-8 font-bold border-2 rounded-lg text-xs bg-card">
              <span className="truncate">{unit === 'cm' ? t.unitsCm : t.unitsIn}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm" className="font-bold text-xs">{t.unitsCm}</SelectItem>
              <SelectItem value="in" className="font-bold text-xs">{t.unitsIn}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 relative">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.width}</Label>
            <div className="relative">
              <Input 
                type="number" 
                value={targetWidth} 
                onChange={(e) => handleWidthChange(e.target.value)}
                className="h-9 font-black text-sm rounded-lg border-2 pl-3 pr-10 text-emerald-600 focus-visible:ring-emerald-500 bg-card"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground uppercase">{unit}</span>
            </div>
          </div>

          <div className="flex justify-center -my-3.5 z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-7 w-7 rounded-full bg-card border-2 transition-all shadow-md active:scale-95",
                lockAspect ? "text-emerald-500 border-emerald-500 scale-110" : "text-muted-foreground border-border"
              )}
              onClick={() => setLockAspect(!lockAspect)}
              title={t.keepAspectRatio}
            >
              {lockAspect ? <LinkIcon className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
            </Button>
          </div>

          <div className="space-y-0.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.height}</Label>
            <div className="relative">
              <Input 
                type="number" 
                value={targetHeight} 
                onChange={(e) => handleHeightChange(e.target.value)}
                className="h-9 font-black text-sm rounded-lg border-2 pl-3 pr-10 text-emerald-600 focus-visible:ring-emerald-500 bg-card"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground uppercase">{unit}</span>
            </div>
          </div>
        </div>

        <Separator className="my-1 opacity-50" />

        <div className="space-y-0.5">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.targetDpi}</Label>
          <Select value={dpi.toString()} onValueChange={(v) => setDpi(parseInt(v))}>
            <SelectTrigger className="h-8 font-bold border-2 rounded-lg text-xs bg-card">
              <span className="truncate">{dpi} DPI</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="72" className="font-bold text-xs">72 DPI ({t.low})</SelectItem>
              <SelectItem value="150" className="font-bold text-xs">150 DPI ({t.medium})</SelectItem>
              <SelectItem value="300" className="font-bold text-xs">300 DPI ({t.high})</SelectItem>
              <SelectItem value="600" className="font-bold text-xs">600 DPI (Ultra)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-2.5 mt-2 rounded-xl bg-emerald-500/5 border border-dashed border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">{t.localProcessing}</span>
          </div>
          <p className="text-[9px] font-medium text-muted-foreground leading-tight">
            {t.privacyNote}
          </p>
        </div>
      </div>
    </div>
  );

  const downloadButton = (
    <Button 
      className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 text-xs gap-3 transition-all active:scale-95"
      onClick={startResizing}
      disabled={!image || isResizing}
    >
      {isResizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isResizing ? t.resizing : t.downloadImage}
    </Button>
  );

  return (
    <div className="flex flex-col h-screen bg-background font-body overflow-hidden transition-colors duration-300">
      <header className="h-16 shrink-0 border-b border-border bg-background flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground px-2">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden sm:inline text-xs">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative rounded-lg overflow-hidden border bg-white dark:bg-slate-200">
              <Image src={logo} alt="Logo" fill className="object-contain" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-emerald-600 uppercase">
              {t.resizerTitle}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="hidden lg:flex items-center gap-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 font-bold px-3 py-1">
            <Cpu className="h-3 w-3" /> {t.localProcessing}
          </Badge>
          <ThemeToggle />
          <LanguageSelector language={lang} setLanguage={setLang} />
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-12 bg-muted/30 flex flex-col items-center relative">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "w-full max-w-xl aspect-square md:aspect-video bg-card border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all group shadow-xl",
                isDragging ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]" : "border-border hover:border-emerald-300"
              )}
            >
              <div className="p-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-full group-hover:scale-110 transition-transform">
                <ImageIcon className="h-20 w-20 text-emerald-500" />
              </div>
              <h3 className="mt-8 text-2xl font-headline font-black text-foreground uppercase tracking-tight">{t.resizerTitle}</h3>
              <p className="mt-2 text-muted-foreground font-medium">{t.dragDrop}</p>
              <div className="mt-6 flex items-center gap-2 text-emerald-600/60 font-black text-[10px] uppercase tracking-[0.2em]">
                <ShieldCheck className="h-4 w-4" /> {t.privacyNote}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8 animate-fade-in pb-32 md:pb-0">
              <div className="relative group rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-card bg-card">
                <img 
                  src={image.url} 
                  alt="Preview" 
                  className="w-full h-auto max-h-[60vh] object-contain" 
                />
                <div className="absolute top-6 left-6 flex gap-2">
                  <Badge className="bg-emerald-500 text-white border-none font-black shadow-lg px-4 py-1.5 text-xs">
                    {image.width} x {image.height} PX
                  </Badge>
                </div>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute top-6 right-6 rounded-2xl shadow-xl"
                  onClick={() => setImage(null)}
                >
                  <RefreshCcw className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-lg shadow-emerald-500/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.originalSize}</span>
                  </div>
                  <p className="text-xl font-black text-foreground">
                    {Math.round(image.width / (dpi/2.54) * 10) / 10} x {Math.round(image.height / (dpi/2.54) * 10) / 10} CM
                  </p>
                </div>
                <div className="bg-emerald-500 p-6 rounded-[2rem] border border-emerald-400 shadow-lg shadow-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-100" />
                    <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">{t.newSize}</span>
                  </div>
                  <p className="text-xl font-black text-white">
                    {finalPixelsW} x {finalPixelsH} PX
                  </p>
                </div>
                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-lg shadow-emerald-500/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Densidad</span>
                  </div>
                  <p className="text-xl font-black text-foreground">
                    {megapixels} MP <span className="text-[10px] text-muted-foreground">EST.</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="hidden md:flex w-72 bg-card border-l border-border flex-col shrink-0 shadow-2xl z-20">
          <div className="flex-1 overflow-y-auto p-5 pb-2">
            {renderSettingsContent()}
          </div>
          {image && (
            <div className="p-5 pt-2 border-t bg-muted/50">
              {downloadButton}
            </div>
          )}
        </aside>

        {image && (
          <div className="md:hidden fixed bottom-6 left-6 right-6 z-[100] flex gap-3 pointer-events-auto">
            <div className="flex-1">
              {downloadButton}
            </div>
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  size="icon" 
                  className="h-11 w-11 shrink-0 rounded-full shadow-2xl bg-slate-800 text-white hover:bg-slate-900 transition-all active:scale-95 border-4 border-card"
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] sm:w-[350px] p-5 bg-card backdrop-blur-xl shadow-2xl overflow-y-auto">
                <SheetHeader className="sr-only">
                  <SheetTitle>Configuración</SheetTitle>
                  <SheetDescription>Ajustes de redimensionado de imagen</SheetDescription>
                </SheetHeader>
                {renderSettingsContent()}
              </SheetContent>
            </Sheet>
          </div>
        )}
      </main>
    </div>
  );
}

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
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import logo from "@/app/icono.png";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      // Default to 1:1 scale at 300 DPI or just some reasonable default cm
      const pixelsPerCm = 300 / 2.54;
      setTargetWidth(Math.round(img.width / pixelsPerCm * 10) / 10);
      setTargetHeight(Math.round(img.height / pixelsPerCm * 10) / 10);
    };
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
      // Calculate final pixel dimensions
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

      // Higher quality downscaling
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-body overflow-hidden">
      <header className="h-16 shrink-0 border-b border-border bg-white flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary px-2">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden sm:inline text-xs">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative rounded-lg overflow-hidden border">
              <Image src={logo} alt="Logo" fill className="object-contain" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-emerald-600 uppercase">RESIZER PRO</h1>
          </div>
        </div>
        <LanguageSelector language={lang} setLanguage={setLang} />
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-12 bg-slate-100/50 flex flex-col items-center">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl aspect-square md:aspect-video bg-white border-4 border-dashed border-emerald-100 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 transition-all group shadow-xl shadow-emerald-500/5"
            >
              <div className="p-10 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform">
                <ImageIcon className="h-20 w-20 text-emerald-500" />
              </div>
              <h3 className="mt-8 text-2xl font-headline font-black text-slate-800 uppercase tracking-tight">{t.resizerTitle}</h3>
              <p className="mt-2 text-slate-500 font-medium">{t.dragDrop}</p>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8 animate-fade-in">
              <div className="relative group rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-white">
                <img 
                  src={image.url} 
                  alt="Preview" 
                  className="w-full h-auto max-h-[60vh] object-contain" 
                />
                <div className="absolute top-6 left-6 flex gap-2">
                  <Badge className="bg-emerald-500 text-white border-none font-black shadow-lg">
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
                <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-lg shadow-emerald-500/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.originalSize}</span>
                  </div>
                  <p className="text-xl font-black text-slate-800">
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
                <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-lg shadow-emerald-500/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Densidad</span>
                  </div>
                  <p className="text-xl font-black text-slate-800">
                    {megapixels} MP <span className="text-[10px] text-slate-400">EST.</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="w-full md:w-80 bg-white border-l border-border p-6 overflow-y-auto shrink-0 shadow-2xl z-20">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t.gridSettings}</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.units}</Label>
                <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
                  <SelectTrigger className="h-10 font-bold border-2 rounded-xl">
                    <span className="truncate">{unit === 'cm' ? t.unitsCm : t.unitsIn}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm" className="font-bold">{t.unitsCm}</SelectItem>
                    <SelectItem value="in" className="font-bold">{t.unitsIn}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 relative">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.width}</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={targetWidth} 
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="h-12 font-black text-lg rounded-xl border-2 pl-4 pr-12 text-emerald-600 focus-visible:ring-emerald-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">{unit}</span>
                  </div>
                </div>

                <div className="flex justify-center -my-2 z-10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 rounded-full bg-slate-50 border-2 transition-all",
                      lockAspect ? "text-emerald-500 border-emerald-500 scale-110" : "text-slate-300 border-slate-200"
                    )}
                    onClick={() => setLockAspect(!lockAspect)}
                  >
                    {lockAspect ? <LinkIcon className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.height}</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={targetHeight} 
                      onChange={(e) => handleHeightChange(e.target.value)}
                      className="h-12 font-black text-lg rounded-xl border-2 pl-4 pr-12 text-emerald-600 focus-visible:ring-emerald-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">{unit}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.targetDpi}</Label>
                <Select value={dpi.toString()} onValueChange={(v) => setDpi(parseInt(v))}>
                  <SelectTrigger className="h-10 font-bold border-2 rounded-xl">
                    <span className="truncate">{dpi} DPI</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="72" className="font-bold">72 DPI ({t.low})</SelectItem>
                    <SelectItem value="150" className="font-bold">150 DPI ({t.medium})</SelectItem>
                    <SelectItem value="300" className="font-bold">300 DPI ({t.high})</SelectItem>
                    <SelectItem value="600" className="font-bold">600 DPI (Ultra)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] font-bold text-slate-400 leading-tight">
                  Un mayor DPI aumenta el detalle pero también el tamaño del archivo final.
                </p>
              </div>

              <div className="pt-6">
                <Button 
                  className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-emerald-500/20 text-lg gap-3 transition-all active:scale-95"
                  onClick={startResizing}
                  disabled={!image || isResizing}
                >
                  {isResizing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
                  {isResizing ? t.resizing : t.downloadImage}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

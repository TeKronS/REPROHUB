"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  FileText, 
  Plus, 
  Trash2, 
  FileDown, 
  Loader2, 
  Settings2,
  Image as ImageIcon,
  MoveUp,
  MoveDown,
  X,
  PlusCircle,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import logo from "@/app/icono.png";
import { cn } from "@/lib/utils";

const PAPER_DIMENSIONS: Record<string, { width: number; height: number; format: string }> = {
  'Carta': { width: 215.9, height: 279.4, format: 'letter' },
  'A4': { width: 210, height: 297, format: 'a4' },
  'A3': { width: 297, height: 420, format: 'a3' },
  'Oficio': { width: 215.9, height: 355.6, format: 'legal' },
};

interface ImageData {
  id: string;
  url: string;
  file: File;
  name: string;
}

export default function ImageToPdfConverter() {
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageData[]>([]);
  const [paperSize, setPaperSize] = useState('Carta');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState(1);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const paper = useMemo(() => PAPER_DIMENSIONS[paperSize], [paperSize]);
  const aspectRatio = useMemo(() => {
    return orientation === 'portrait' 
      ? paper.width / paper.height 
      : paper.height / paper.width;
  }, [paper, orientation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageData[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file,
      name: file.name
    }));

    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;
    setImages(newImages);
  };

  const exportPdf = async () => {
    if (images.length === 0) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: orientation === 'portrait' ? 'p' : 'l',
        unit: 'mm',
        format: paper.format as any
      });

      const pageWidth = orientation === 'portrait' ? paper.width : paper.height;
      const pageHeight = orientation === 'portrait' ? paper.height : paper.width;
      const marginMm = margin * 10;
      const usableWidth = pageWidth - (marginMm * 2);
      const usableHeight = pageHeight - (marginMm * 2);

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();

        const img = images[i];
        const htmlImg = new window.Image();
        htmlImg.src = img.url;
        await new Promise((resolve) => (htmlImg.onload = resolve));

        const imgWidth = htmlImg.width;
        const imgHeight = htmlImg.height;
        const imgRatio = imgWidth / imgHeight;
        const pageRatio = usableWidth / usableHeight;

        let drawW, drawH, x, y;

        if (fitMode === 'fit') {
          if (imgRatio > pageRatio) {
            drawW = usableWidth;
            drawH = usableWidth / imgRatio;
          } else {
            drawH = usableHeight;
            drawW = usableHeight * imgRatio;
          }
          x = marginMm + (usableWidth - drawW) / 2;
          y = marginMm + (usableHeight - drawH) / 2;
        } else {
          if (imgRatio > pageRatio) {
            drawH = usableHeight;
            drawW = usableHeight * imgRatio;
          } else {
            drawW = usableWidth;
            drawH = usableWidth / imgRatio;
          }
          x = marginMm + (usableWidth - drawW) / 2;
          y = marginMm + (usableHeight - drawH) / 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = htmlImg.width;
        canvas.height = htmlImg.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(htmlImg, 0, 0);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH);
      }

      pdf.save(`MultiPrintTools-ImageToPdf-${Date.now()}.pdf`);
      toast({ title: "PDF Generado", description: "El documento se ha descargado con éxito." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  const renderSettingsContent = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Configuración</h2>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.paperSize}</Label>
          <Select value={paperSize} onValueChange={setPaperSize}>
            <SelectTrigger className="font-bold border-2 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PAPER_DIMENSIONS).map(size => (
                <SelectItem key={size} value={size} className="font-bold">{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.orientation}</Label>
          <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
            <SelectTrigger className="font-bold border-2 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait" className="font-bold">{t.portrait}</SelectItem>
              <SelectItem value="landscape" className="font-bold">{t.landscape}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.imageFit}</Label>
          <Select value={fitMode} onValueChange={(v: any) => setFitMode(v)}>
            <SelectTrigger className="font-bold border-2 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit" className="font-bold">{t.fit}</SelectItem>
              <SelectItem value="fill" className="font-bold">{t.fill}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.margins}</Label>
            <span className="text-xs font-black text-primary">{margin} cm</span>
          </div>
          <div className="flex items-center gap-2 py-1">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => setMargin(Math.max(0, margin - 0.5))}>
              <X className="h-3 w-3 rotate-45" />
            </Button>
            <div className="flex-1 h-1 bg-slate-100 rounded-full relative overflow-hidden">
              <div 
                className="absolute h-full bg-primary rounded-full transition-all" 
                style={{ width: `${(margin / 5) * 100}%` }}
              />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => setMargin(Math.min(5, margin + 0.5))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-2" />

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen</span>
          <span className="text-xs font-black text-primary">#{images.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hojas Totales</span>
          <span className="text-xs font-black text-slate-700">{images.length}</span>
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <Button 
          className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black gap-2 rounded-xl shadow-lg transition-transform active:scale-95"
          onClick={exportPdf}
          disabled={images.length === 0 || isExporting}
        >
          {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {isExporting ? t.generating : t.export}
        </Button>
        <Button 
          variant="ghost" 
          className="w-full text-slate-400 hover:text-destructive transition-colors font-bold text-[10px]"
          onClick={() => setImages([])}
          disabled={images.length === 0}
        >
          {t.clearAll}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-body">
      <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden sm:inline">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative rounded-lg overflow-hidden border">
              <Image src={logo} alt="Logo" fill className="object-contain" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary">
              IMAGEN A PDF
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button 
            className="hidden sm:flex bg-primary hover:bg-primary/90 text-white font-black gap-2 rounded-xl shadow-md"
            onClick={exportPdf}
            disabled={images.length === 0 || isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExporting ? t.generating : t.export}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column - Pages Thumbnails */}
        <aside className="hidden md:flex w-[80px] bg-white border-r border-border flex-col items-center py-4 gap-3 overflow-y-auto shrink-0 shadow-inner z-10">
          {images.map((img, idx) => (
            <div 
              key={img.id} 
              className="relative w-14 aspect-[3/4] border-2 border-slate-200 rounded-md overflow-hidden bg-slate-50 shadow-sm transition-all hover:border-primary/50 group cursor-pointer"
              title={img.name}
              onClick={() => {
                document.getElementById(`page-${img.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-0 left-0 bg-primary/90 backdrop-blur-sm text-[8px] font-black text-white px-1 py-0.5 rounded-br-md shadow-sm">
                {idx + 1}
              </div>
            </div>
          ))}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center hover:bg-slate-50 hover:border-primary/50 transition-colors text-slate-400"
          >
            <Plus className="h-4 w-4" />
          </button>
        </aside>

        {/* Workspace - Center: Vertical Page List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 scroll-smooth">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
            {images.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center min-h-[400px] w-full border-4 border-dashed rounded-3xl border-primary/20 hover:border-primary/40 hover:bg-white transition-all cursor-pointer group"
              >
                <div className="p-6 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                  <Plus className="h-12 w-12 text-primary" />
                </div>
                <h3 className="mt-6 text-2xl font-headline font-black text-slate-800">{t.imgToPdfTitle}</h3>
                <p className="mt-2 text-slate-500 font-medium">{t.dragDrop}</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </div>
            ) : (
              images.map((img, idx) => (
                <div 
                  key={img.id} 
                  id={`page-${img.id}`}
                  className="relative group w-full max-w-[500px]"
                >
                  <div className="absolute -left-12 top-0 h-full flex flex-col gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="h-8 w-8 rounded-lg shadow-lg" 
                      onClick={() => removeImage(img.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-8 w-8 rounded-lg shadow-lg" 
                      onClick={() => moveImage(idx, 'up')} 
                      disabled={idx === 0}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-8 w-8 rounded-lg shadow-lg" 
                      onClick={() => moveImage(idx, 'down')} 
                      disabled={idx === images.length - 1}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {idx + 1}</span>
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{img.name}</span>
                  </div>

                  <div 
                    className="relative w-full bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden border border-slate-200"
                    style={{ aspectRatio: `${aspectRatio}` }}
                  >
                    <div 
                      className="absolute inset-0 bg-white" 
                      style={{ padding: `${margin}cm` }}
                    >
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        className={cn(
                          "w-full h-full",
                          fitMode === 'fit' ? 'object-contain' : 'object-cover'
                        )} 
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {images.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full max-w-[500px] h-20 border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-white text-primary/60 font-black gap-2 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusCircle className="h-5 w-5" />
                {t.addImages}
                <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Settings - Desktop Right */}
        <aside className="hidden lg:block w-80 bg-white border-l border-border shadow-xl p-6 overflow-y-auto z-20">
          {renderSettingsContent()}
        </aside>

        {/* Mobile Settings Toggle and Drawer */}
        <div className="lg:hidden fixed bottom-6 right-6 z-[100] pointer-events-auto">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Button 
              size="icon" 
              className="h-14 w-14 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 border-4 border-white"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
            >
              <Settings2 className="h-6 w-6" />
            </Button>
            <SheetContent side="right" className="w-[85%] sm:w-[400px] p-6 bg-white/95 backdrop-blur-xl shadow-2xl overflow-y-auto">
              <SheetHeader className="sr-only">
                <SheetTitle>Configuración</SheetTitle>
                <SheetDescription>Ajustes de exportación a PDF</SheetDescription>
              </SheetHeader>
              {renderSettingsContent()}
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
}

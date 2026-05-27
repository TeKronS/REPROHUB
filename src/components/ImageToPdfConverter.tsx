"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  FileDown, 
  Loader2, 
  Settings2,
  X,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Monitor,
  ImageIcon
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
  SheetDescription
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  'Oficio (Legal 35.5cm)': { width: 215.9, height: 355.6, format: 'legal' },
  'Folio (33cm)': { width: 215.9, height: 330.2, format: 'folio' },
  'Oficio (34cm)': { width: 216, height: 340, format: 'oficio' },
  'Extra Oficio (38cm)': { width: 216, height: 380, format: 'extra-oficio' }
};

interface ImageData {
  id: string;
  url: string;
  file: File;
  name: string;
  quantity: number;
  orientation?: 'portrait' | 'landscape';
}

export default function ImageToPdfConverter() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageData[]>([]);
  const [paperSize, setPaperSize] = useState('Carta');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState(1);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [imagesPerPage, setImagesPerPage] = useState('1');
  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const paper = useMemo(() => PAPER_DIMENSIONS[paperSize], [paperSize]);

  const expandedImagesList = useMemo(() => {
    const list: ImageData[] = [];
    images.forEach(img => {
      for (let i = 0; i < img.quantity; i++) {
        list.push({ ...img, id: `${img.id}-copy-${i}` });
      }
    });
    return list;
  }, [images]);

  const processFiles = (files: FileList | File[]) => {
    const newImages: ImageData[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        url: URL.createObjectURL(file),
        file,
        name: file.name,
        quantity: 1,
        orientation: orientation 
      }));

    if (newImages.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Por favor selecciona archivos de imagen válidos." });
      return;
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, quantity: Math.max(1, qty) } : img));
  };

  const updateImageOrientation = (id: string, orient: 'portrait' | 'landscape') => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, orientation: orient } : img));
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
    if (expandedImagesList.length === 0) return;
    setIsExporting(true);

    try {
      const nPerPage = parseInt(imagesPerPage);
      const initialOrient = (nPerPage === 1 && expandedImagesList[0].orientation) 
        ? expandedImagesList[0].orientation 
        : orientation;

      const pdf = new jsPDF({
        orientation: initialOrient === 'portrait' ? 'p' : 'l',
        unit: 'mm',
        format: paper.format as any
      });

      for (let i = 0; i < expandedImagesList.length; i += nPerPage) {
        const pageImages = expandedImagesList.slice(i, i + nPerPage);
        let currentPageOrient = orientation;
        if (nPerPage === 1) {
          currentPageOrient = pageImages[0].orientation || orientation;
        }

        if (i > 0) {
          pdf.addPage(paper.format as any, currentPageOrient === 'portrait' ? 'p' : 'l');
        }

        const pageWidth = currentPageOrient === 'portrait' ? paper.width : paper.height;
        const pageHeight = currentPageOrient === 'portrait' ? paper.height : paper.width;
        const marginMm = margin * 10;
        const usableWidth = pageWidth - (marginMm * 2);
        const usableHeight = pageHeight - (marginMm * 2);

        let gridRows = 1;
        let gridCols = 1;
        
        if (nPerPage === 2) {
          if (currentPageOrient === 'portrait') { gridRows = 2; gridCols = 1; }
          else { gridRows = 1; gridCols = 2; }
        } else if (nPerPage === 4) {
          gridRows = 2; gridCols = 2;
        } else if (nPerPage === 6) {
          if (currentPageOrient === 'portrait') { gridRows = 3; gridCols = 2; }
          else { gridRows = 2; gridCols = 3; }
        } else if (nPerPage === 8) {
          if (currentPageOrient === 'portrait') { gridRows = 4; gridCols = 2; }
          else { gridRows = 2; gridCols = 4; }
        }

        const cellWidth = usableWidth / gridCols;
        const cellHeight = usableHeight / gridRows;

        for (let j = 0; j < pageImages.length; j++) {
          const imgData = pageImages[j];
          const htmlImg = new window.Image();
          htmlImg.src = imgData.url;
          await new Promise((resolve) => (htmlImg.onload = resolve));

          const rowIdx = Math.floor(j / gridCols);
          const colIdx = j % gridCols;

          const imgRatio = htmlImg.width / htmlImg.height;
          const cellRatio = cellWidth / cellHeight;

          let drawW, drawH, x, y;

          if (fitMode === 'fit') {
            if (imgRatio > cellRatio) {
              drawW = cellWidth;
              drawH = cellWidth / imgRatio;
            } else {
              drawH = cellHeight;
              drawW = cellHeight * imgRatio;
            }
          } else {
            if (imgRatio > cellRatio) {
              drawH = cellHeight;
              drawW = cellHeight * imgRatio;
            } else {
              drawW = cellWidth;
              drawH = cellWidth / imgRatio;
            }
          }

          x = marginMm + (colIdx * cellWidth) + (cellWidth - drawW) / 2;
          y = marginMm + (rowIdx * cellHeight) + (cellHeight - drawH) / 2;

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
      }

      pdf.save(`MultiPrintTools-ImageToPdf-${Date.now()}.pdf`);
      toast({ title: "PDF Generado", description: "El documento se ha descargado con éxito." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) return null;

  const renderSettingsContent = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Settings2 className="h-4 w-4 text-primary" />
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Configuración</h2>
      </div>

      <div className="space-y-1.5">
        <div className="space-y-0.5">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.paperSize}</Label>
          <Select value={paperSize} onValueChange={setPaperSize}>
            <SelectTrigger className="font-bold border-2 h-8 text-xs">
              <span className="truncate">{paperSize}</span>
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PAPER_DIMENSIONS).map(size => (
                <SelectItem key={size} value={size} className="font-bold text-xs">{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.orientation} Global</Label>
          <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
            <SelectTrigger className="font-bold border-2 h-8 text-xs">
              <span className="truncate">{orientation === 'portrait' ? t.portrait : t.landscape}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait" className="font-bold text-xs">{t.portrait}</SelectItem>
              <SelectItem value="landscape" className="font-bold text-xs">{t.landscape}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.imagesPerPage}</Label>
          <Select value={imagesPerPage} onValueChange={setImagesPerPage}>
            <SelectTrigger className="font-bold border-2 h-8 text-xs">
              <span className="truncate">{imagesPerPage}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="font-bold text-xs">1</SelectItem>
              <SelectItem value="2" className="font-bold text-xs">2</SelectItem>
              <SelectItem value="4" className="font-bold text-xs">4</SelectItem>
              <SelectItem value="6" className="font-bold text-xs">6</SelectItem>
              <SelectItem value="8" className="font-bold text-xs">8</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.imageFit}</Label>
          <Select value={fitMode} onValueChange={(v: any) => setFitMode(v)}>
            <SelectTrigger className="font-bold border-2 h-8 text-xs">
              <span className="truncate">{fitMode === 'fit' ? t.fit : t.fill}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit" className="font-bold text-xs">{t.fit}</SelectItem>
              <SelectItem value="fill" className="font-bold text-xs">{t.fill}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.margins}</Label>
            <span className="text-[10px] font-black text-primary">{margin} cm</span>
          </div>
          <div className="flex items-center gap-2 py-0.5">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg shrink-0" onClick={() => setMargin(Math.max(0, margin - 0.5))}>
              <X className="h-3 w-3 rotate-45" />
            </Button>
            <div className="flex-1 h-1 bg-slate-100 rounded-full relative overflow-hidden">
              <div 
                className="absolute h-full bg-primary rounded-full transition-all" 
                style={{ width: `${(margin / 5) * 100}%` }}
              />
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg shrink-0" onClick={() => setMargin(Math.min(5, margin + 0.5))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-1 opacity-50" />

      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumen</span>
          <span className="text-[10px] font-black text-primary">#{expandedImagesList.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hojas Totales</span>
          <span className="text-[10px] font-black text-slate-700">{Math.ceil(expandedImagesList.length / parseInt(imagesPerPage))}</span>
        </div>
      </div>

      <div className="pt-2 space-y-4">
        <Button 
          variant="ghost" 
          className="w-full text-slate-400 hover:text-destructive transition-colors font-bold text-[9px] uppercase tracking-widest"
          onClick={() => setImages([])}
          disabled={images.length === 0}
        >
          {t.clearAll}
        </Button>
        <div className="h-32 sm:h-0" />
      </div>
    </div>
  );

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
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary uppercase">
              IMAGEN A PDF
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button 
            className="hidden sm:flex bg-primary hover:bg-primary/90 text-white font-black gap-2 rounded-xl shadow-md h-9 px-5 text-xs"
            onClick={exportPdf}
            disabled={expandedImagesList.length === 0 || isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExporting ? t.generating : t.export}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <aside className="hidden md:flex w-[80px] bg-white border-r border-border flex-col items-center py-4 gap-3 overflow-y-auto shrink-0 shadow-inner z-10 scrollbar-hide">
          {expandedImagesList.map((img, idx) => (
            <div 
              key={img.id} 
              className="relative w-12 aspect-[3/4] border border-slate-200 rounded-sm overflow-hidden bg-slate-50 shadow-sm transition-all hover:border-primary/50 group cursor-pointer shrink-0"
              onClick={() => {
                document.getElementById(`page-${img.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-0 left-0 bg-primary/90 backdrop-blur-sm text-[8px] font-black text-white px-1 min-w-[14px] text-center rounded-br-[2px] shadow-sm">
                {idx + 1}
              </div>
            </div>
          ))}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 border border-dashed border-slate-300 rounded-sm flex items-center justify-center hover:bg-slate-50 hover:border-primary/50 transition-colors text-slate-400 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </aside>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full">
            {images.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[150px] w-full">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center justify-center min-h-[300px] h-full w-full border-4 border-dashed rounded-[3rem] transition-all cursor-pointer group bg-white shadow-xl",
                    isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-primary/20 hover:border-primary/40 hover:bg-white"
                  )}
                >
                  <div className="p-8 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="mt-8 text-2xl font-headline font-black text-slate-800 uppercase tracking-tight">{t.imgToPdfTitle}</h3>
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
              </div>
            ) : (
              <div className="flex flex-wrap gap-8 items-start justify-center pb-32">
                {images.map((img, idx) => {
                  const currentImgOrient = img.orientation || orientation;
                  const currentAspectRatio = currentImgOrient === 'portrait' 
                    ? paper.width / paper.height 
                    : paper.height / paper.width;

                  return (
                    <div 
                      key={img.id} 
                      id={`page-${img.id}`}
                      className="relative group w-full max-w-[200px] animate-fade-in"
                    >
                      <div className="absolute -top-3 -right-3 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-7 w-7 rounded-lg shadow-lg" 
                          onClick={() => removeImage(img.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex flex-col gap-1">
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-7 w-7 rounded-lg shadow-lg" 
                            onClick={() => moveImage(idx, 'up')} 
                            disabled={idx === 0}
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-7 w-7 rounded-lg shadow-lg" 
                            onClick={() => moveImage(idx, 'down')} 
                            disabled={idx === images.length - 1}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original {idx + 1}</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">{img.name}</span>
                      </div>

                      <div 
                        className="relative w-full bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-sm overflow-hidden border border-slate-200"
                        style={{ aspectRatio: `${currentAspectRatio}` }}
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
                      
                      <div className="mt-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">{t.orientation}</Label>
                            <span className="text-[9px] font-black text-primary uppercase">{currentImgOrient === 'portrait' ? t.portrait : t.landscape}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <Button 
                              variant={currentImgOrient === 'portrait' ? 'default' : 'outline'} 
                              size="sm" 
                              className="h-7 px-0 rounded-lg"
                              onClick={() => updateImageOrientation(img.id, 'portrait')}
                            >
                              <Smartphone className="h-3 w-3 mr-1" />
                              <span className="text-[8px] font-black uppercase">{t.portrait}</span>
                            </Button>
                            <Button 
                              variant={currentImgOrient === 'landscape' ? 'default' : 'outline'} 
                              size="sm" 
                              className="h-7 px-0 rounded-lg"
                              onClick={() => updateImageOrientation(img.id, 'landscape')}
                            >
                              <Monitor className="h-3 w-3 mr-1" />
                              <span className="text-[8px] font-black uppercase">{t.landscape}</span>
                            </Button>
                          </div>
                        </div>

                        <Separator className="opacity-50" />

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">{t.quantity}</Label>
                            <span className="text-[10px] font-black text-primary">{img.quantity} {t.copies}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 rounded-lg"
                              onClick={() => updateQuantity(img.id, img.quantity - 1)}
                            >
                              <X className="h-3 w-3 rotate-45" />
                            </Button>
                            <Input 
                              type="number" 
                              value={img.quantity}
                              onChange={(e) => updateQuantity(img.id, parseInt(e.target.value) || 1)}
                              className="h-7 text-center font-black text-xs p-0 border-none bg-slate-50"
                            />
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 rounded-lg"
                              onClick={() => updateQuantity(img.id, img.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Button 
                  variant="outline" 
                  className="w-full max-w-[200px] aspect-square border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-white text-primary/60 font-black gap-2 rounded-xl transition-all flex flex-col justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusCircle className="h-6 w-6" />
                  <span className="uppercase tracking-widest text-[10px]">{t.addImages}</span>
                  <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:block w-72 bg-white border-l border-border shadow-xl p-5 overflow-y-auto shrink-0 z-20">
          {renderSettingsContent()}
        </aside>

        {expandedImagesList.length > 0 && (
          <div className="lg:hidden fixed bottom-6 left-6 md:left-[104px] right-24 z-[100] pointer-events-auto animate-in slide-in-from-bottom-10 duration-500">
            <Button 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black gap-3 rounded-2xl shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-widest border-4 border-white/10"
              onClick={exportPdf}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
              {isExporting ? t.generating : t.export}
            </Button>
          </div>
        )}

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
            <SheetContent side="right" className="w-[85%] sm:w-[350px] p-5 bg-white/95 backdrop-blur-xl shadow-2xl overflow-y-auto">
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

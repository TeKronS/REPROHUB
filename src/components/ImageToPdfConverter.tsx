
"use client";

import { useState, useCallback, useRef } from "react";
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
  X
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
  const [paperSize, setPaperSize] = useState('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState(0);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const [isExporting, setIsExporting] = useState(false);

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
      const paper = PAPER_DIMENSIONS[paperSize];
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
          // Fill mode
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
          // Fill with white to prevent black background on transparent images
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

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50">
          <div className="max-w-4xl mx-auto space-y-6">
            {images.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center min-h-[400px] border-4 border-dashed rounded-3xl border-primary/20 hover:border-primary/40 hover:bg-white transition-all cursor-pointer group"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {images.map((img, idx) => (
                  <Card key={img.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-lg border-2 border-white bg-white hover:border-primary/50 transition-all">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg" onClick={() => removeImage(img.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-white text-[10px] font-bold truncate bg-black/20 px-2 py-1 rounded backdrop-blur-sm">{img.name}</span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={() => moveImage(idx, 'up')} disabled={idx === 0}>
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={() => moveImage(idx, 'down')} disabled={idx === images.length - 1}>
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <span className="ml-auto text-white font-black text-xl">#{idx + 1}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center hover:bg-primary/5 hover:border-primary transition-all group"
                >
                  <Plus className="h-8 w-8 text-primary/50 group-hover:text-primary" />
                  <span className="mt-2 text-xs font-black text-primary/50 group-hover:text-primary uppercase tracking-widest">{t.addImages}</span>
                  <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Settings */}
        <aside className="w-full lg:w-80 bg-white border-l border-border shadow-xl p-6 overflow-y-auto z-10">
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Configuración</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.paperSize}</Label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger className="font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAPER_DIMENSIONS).map(size => (
                      <SelectItem key={size} value={size} className="font-bold">{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.orientation}</Label>
                <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
                  <SelectTrigger className="font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait" className="font-bold">{t.portrait}</SelectItem>
                    <SelectItem value="landscape" className="font-bold">{t.landscape}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.imageFit}</Label>
                <Select value={fitMode} onValueChange={(v: any) => setFitMode(v)}>
                  <SelectTrigger className="font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit" className="font-bold">{t.fit}</SelectItem>
                    <SelectItem value="fill" className="font-bold">{t.fill}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t.margins}</Label>
                  <span className="text-xs font-black text-primary">{margin} cm</span>
                </div>
                <div className="flex items-center gap-4 py-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMargin(Math.max(0, margin - 0.5))}>
                    <X className="h-3 w-3 rotate-45" />
                  </Button>
                  <div className="flex-1 h-1 bg-slate-100 rounded-full relative">
                    <div 
                      className="absolute h-full bg-primary rounded-full" 
                      style={{ width: `${(margin / 5) * 100}%` }}
                    />
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMargin(Math.min(5, margin + 0.5))}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen</span>
                <span className="text-xs font-black text-primary">#{images.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hojas Totales</span>
                <span className="text-xs font-black text-slate-700">{images.length}</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black gap-2 rounded-xl shadow-lg transition-transform active:scale-95"
                onClick={exportPdf}
                disabled={images.length === 0 || isExporting}
              >
                {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
                {isExporting ? t.generating : t.export}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-slate-400 hover:text-destructive font-bold text-xs"
                onClick={() => setImages([])}
                disabled={images.length === 0}
              >
                {t.clearAll}
              </Button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

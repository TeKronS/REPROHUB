
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { ImageUploader } from "./ImageUploader";
import { MuralCanvas } from "./MuralCanvas";
import { MockupPreview } from "./MockupPreview";
import { 
  Settings2, 
  Layout, 
  FileDown, 
  Eye, 
  Scissors,
  Layers,
  Loader2,
  Maximize,
  Link2,
  Image as ImageIcon,
  Ruler,
  Maximize2,
  ChevronLeft,
  Smartphone,
  RefreshCcw,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger as SelectTriggerUI, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import logo from "@/app/icono.png";

const PAPER_DIMENSIONS: Record<string, { width: number; height: number; format: string }> = {
  'Carta': { width: 215.9, height: 279.4, format: 'letter' },
  'A4': { width: 210, height: 297, format: 'a4' },
  'A3': { width: 297, height: 420, format: 'a3' },
  'Oficio (Legal 35.5cm)': { width: 215.9, height: 35.56 * 10, format: 'legal' },
  'Folio (33cm)': { width: 215.9, height: 33.02 * 10, format: 'folio' },
  'Oficio (34cm)': { width: 216, height: 340, format: 'oficio' },
  'Extra Oficio (38cm)': { width: 216, height: 380, format: 'extra-oficio' }
};

export default function MuralisEditor() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const [image, setImage] = useState<{ url: string; file: File; width: number; height: number } | null>(null);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [overlap, setOverlap] = useState(1.5); 
  const [marginV, setMarginV] = useState(1); 
  const [marginH, setMarginH] = useState(1); 
  const [paperSize, setPaperSize] = useState('Carta');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showGuides, setShowGuides] = useState(true);
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = translations[lang];

  const calculateAutoGrid = useCallback((imgW: number, imgH: number, targetRows?: number, targetCols?: number) => {
    const paperBase = PAPER_DIMENSIONS[paperSize];
    const paper = orientation === 'portrait' 
      ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
      : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

    const printableW = paper.width - (marginH * 20);
    const printableH = paper.height - (marginV * 20);
    const overlapMm = overlap * 10;
    const imgAspect = imgW / imgH;
    const effectiveSheetW = printableW - overlapMm;
    const effectiveSheetH = printableH - overlapMm;

    if (targetRows !== undefined) {
      const totalH_mm = targetRows * effectiveSheetH + overlapMm;
      const totalW_mm = totalH_mm * imgAspect;
      const calculatedCols = Math.max(1, Math.round((totalW_mm - overlapMm) / effectiveSheetW));
      setRows(targetRows);
      setCols(calculatedCols);
    } else if (targetCols !== undefined) {
      const totalW_mm = targetCols * effectiveSheetW + overlapMm;
      const totalH_mm = totalW_mm / imgAspect;
      const calculatedRows = Math.max(1, Math.round((totalH_mm - overlapMm) / effectiveSheetH));
      setCols(targetCols);
      setRows(calculatedRows);
    } else {
      const initialCols = 3;
      const totalW_mm = initialCols * effectiveSheetW + overlapMm;
      const totalH_mm = totalW_mm / imgAspect;
      const initialRows = Math.max(1, Math.round((totalH_mm - overlapMm) / effectiveSheetH));
      setCols(initialCols);
      setRows(initialRows);
    }
  }, [paperSize, marginV, marginH, overlap, orientation]);

  const physicalInfo = useMemo(() => {
    if (!image) return null;
    const paperBase = PAPER_DIMENSIONS[paperSize];
    const paper = orientation === 'portrait' 
      ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
      : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

    const printableW = paper.width - (marginH * 20);
    const printableH = paper.height - (marginV * 20);
    const overlapMm = overlap * 10;
    const effectiveW = printableW - overlapMm;
    const effectiveH = printableH - overlapMm;

    const totalGridW = (cols * effectiveW) + overlapMm;
    const totalGridH = (rows * effectiveH) + overlapMm;

    const imgAspect = image.width / image.height;
    const gridAspect = totalGridW / totalGridH;

    let finalW_mm, finalH_mm;
    if (imgAspect > gridAspect) {
      finalW_mm = totalGridW;
      finalH_mm = totalGridW / imgAspect;
    } else {
      finalH_mm = totalGridH;
      finalW_mm = totalGridH * imgAspect;
    }

    return {
      totalW: (totalGridW / 10).toFixed(1),
      totalH: (totalGridH / 10).toFixed(1),
      imgW: (finalW_mm / 10).toFixed(1),
      imgH: (finalH_mm / 10).toFixed(1),
      blankW: ((totalGridW - finalW_mm) / 10).toFixed(1),
      blankH: ((totalGridH - finalH_mm) / 10).toFixed(1),
      printableW: (printableW / 10).toFixed(1),
      printableH: (printableH / 10).toFixed(1)
    };
  }, [image, rows, cols, overlap, marginV, marginH, paperSize, orientation]);

  const handleImageUpload = (file: File, url: string) => {
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage({ file, url, width: img.width, height: img.height });
      calculateAutoGrid(img.width, img.height);
    };
  };

  const handleExport = async () => {
    if (!image) return;
    setIsExporting(true);
    try {
      const img = new window.Image();
      img.src = image.url;
      await new Promise((resolve) => img.onload = resolve);

      const paperBase = PAPER_DIMENSIONS[paperSize];
      const paper = orientation === 'portrait' 
        ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
        : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

      const pdf = new jsPDF({
        orientation: orientation === 'portrait' ? 'p' : 'l',
        unit: 'mm',
        format: paperBase.format as any
      });

      const printableW = paper.width - (marginH * 20);
      const printableH = paper.height - (marginV * 20);
      const overlapMm = overlap * 10;
      const effectiveSheetW = printableW - overlapMm;
      const effectiveSheetH = printableH - overlapMm;

      const totalGridW = (cols * effectiveSheetW) + overlapMm;
      const totalGridH = (rows * effectiveSheetH) + overlapMm;

      const scale = Math.min(totalGridW / img.width, totalGridH / img.height);
      const finalW_mm = img.width * scale;
      const finalH_mm = img.height * scale;
      const offsetX_mm = (totalGridW - finalW_mm) / 2;
      const offsetY_mm = (totalGridH - finalH_mm) / 2;

      const pxPerMm = img.width / finalW_mm;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas fail");

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r > 0 || c > 0) pdf.addPage();
          
          const sheetLeft_mm = c * effectiveSheetW;
          const sheetTop_mm = r * effectiveSheetH;
          
          const drawInSheetX_mm = Math.max(0, offsetX_mm - sheetLeft_mm);
          const drawInSheetY_mm = Math.max(0, offsetY_mm - sheetTop_mm);
          
          const visibleW_mm = Math.min(effectiveSheetW + overlapMm - drawInSheetX_mm, finalW_mm - Math.max(0, sheetLeft_mm - offsetX_mm));
          const visibleH_mm = Math.min(effectiveSheetH + overlapMm - drawInSheetY_mm, finalH_mm - Math.max(0, sheetTop_mm - offsetY_mm));

          const sx = Math.max(0, (sheetLeft_mm - offsetX_mm) * pxPerMm);
          const sy = Math.max(0, (sheetTop_mm - offsetY_mm) * pxPerMm);
          const sw = visibleW_mm * pxPerMm;
          const sh = visibleH_mm * pxPerMm;

          if (sw > 0 && sh > 0) {
            canvas.width = Math.max(1, sw);
            canvas.height = Math.max(1, sh);
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (marginH * 10) + drawInSheetX_mm, (marginV * 10) + drawInSheetY_mm, visibleW_mm, visibleH_mm);
          }

          pdf.setDrawColor(220);
          pdf.setLineDashPattern([2, 2], 0);
          if (c < cols - 1) {
            const gx = (marginH * 10) + (printableW - overlapMm);
            pdf.line(gx, marginV * 10, gx, marginV * 10 + printableH);
          }
          if (r < rows - 1) {
            const gy = (marginV * 10) + (printableH - overlapMm);
            pdf.line(marginH * 10, gy, marginH * 10 + printableW, gy);
          }
          pdf.setFontSize(7);
          pdf.setTextColor(180);
          pdf.text(`REPROHUB | MURALIS | PANEL ${r+1}-${c+1} | ${paperSize} (${orientation === 'portrait' ? 'P' : 'L'})`, marginH * 10, paper.height - (marginV * 5));
        }
      }
      pdf.save(`muralis-grid-${Date.now()}.pdf`);
      toast({ title: t.export, description: "PDF generado con éxito." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  const renderSettings = () => (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white px-2 py-1 rounded-md shadow-sm border border-border/20">
          <Settings2 className="h-3 w-3" /> {t.gridSettings}
        </h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-2">
            <Link2 className="h-3 w-3 text-primary" />
            <Label className="text-[10px] font-black uppercase cursor-pointer" htmlFor="lock-aspect">Proporción Bloqueada</Label>
          </div>
          <Switch id="lock-aspect" checked={lockAspect} onCheckedChange={setLockAspect} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{t.rows}</Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{rows}</span>
          </div>
          <Slider value={[rows]} onValueChange={(v) => lockAspect && image ? calculateAutoGrid(image.width, image.height, v[0]) : setRows(v[0])} min={1} max={15} step={1} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{t.columns}</Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{cols}</span>
          </div>
          <Slider value={[cols]} onValueChange={(v) => lockAspect && image ? calculateAutoGrid(image.width, image.height, undefined, v[0]) : setCols(v[0])} min={1} max={15} step={1} />
        </div>

        <Separator className="bg-white/40" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-2 inline-block">{t.paperSize}</Label>
            <Select value={paperSize} onValueChange={(v) => setPaperSize(v)}>
              <SelectTriggerUI className="h-10 rounded-lg text-xs font-bold bg-white shadow-sm border border-border/10"><SelectValue /></SelectTriggerUI>
              <SelectContent>
                {Object.keys(PAPER_DIMENSIONS).map(key => <SelectItem key={key} value={key} className="text-xs font-bold">{key}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-2 inline-block">{t.orientation}</Label>
            <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
              <SelectTriggerUI className="h-10 rounded-lg text-xs font-bold bg-white shadow-sm border border-border/10"><SelectValue /></SelectTriggerUI>
              <SelectContent>
                <SelectItem value="portrait" className="text-xs font-bold">{t.portrait}</SelectItem>
                <SelectItem value="landscape" className="text-xs font-bold">{t.landscape}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Scissors className="h-3 w-3" /> {t.overlap}
            </Label>
            <span className="text-xs font-black text-accent bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{overlap} cm</span>
          </div>
          <Slider value={[overlap]} onValueChange={(v) => setOverlap(v[0])} min={0} max={10} step={0.1} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Maximize className="h-3 w-3" /> {t.marginsVertical}
            </Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{marginV} cm</span>
          </div>
          <Slider value={[marginV]} onValueChange={(v) => setMarginV(v[0])} min={0} max={5} step={0.5} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Maximize className="h-3 w-3" /> {t.marginsHorizontal}
            </Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{marginH} cm</span>
          </div>
          <Slider value={[marginH]} onValueChange={(v) => setMarginH(v[0])} min={0} max={5} step={0.5} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10" htmlFor="guides">{t.guides}</Label>
          <Switch id="guides" checked={showGuides} onCheckedChange={setShowGuides} className="bg-white/50" />
        </div>
      </div>

      {physicalInfo && (
        <div className="p-4 bg-white/90 rounded-xl border border-white/40 shadow-xl space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Ruler className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.finalMeasures}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[8px] font-bold text-muted-foreground uppercase block">{lang === 'es' ? 'Imagen' : 'Image'}</span>
              <span className="text-sm font-black text-primary">{physicalInfo.imgW} x {physicalInfo.imgH} cm</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-muted-foreground uppercase block">{t.panelArea}</span>
              <span className="text-sm font-black text-foreground">{physicalInfo.printableW} x {physicalInfo.printableH} cm</span>
            </div>
          </div>
          <Separator className="opacity-20" />
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">{t.blankSpace}</span>
            <span className={cn("text-xs font-black", Number(physicalInfo.blankW) > 0 || Number(physicalInfo.blankH) > 0 ? "text-accent" : "text-muted-foreground")}>
              +{physicalInfo.blankW}w / +{physicalInfo.blankH}h cm
            </span>
          </div>
          <div className="pt-1">
             <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-1">{t.totalArea} (Papel)</span>
             <span className="text-[11px] font-bold text-muted-foreground">{physicalInfo.totalW} x {physicalInfo.totalH} cm</span>
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-svh w-full font-body bg-white text-foreground overflow-hidden">
      <header className="h-14 md:h-16 border-b border-border bg-white flex items-center justify-between px-4 md:px-6 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary px-2">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden sm:inline">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-6 h-6 md:w-8 md:h-8 relative overflow-hidden rounded-lg shadow-sm bg-white border border-border/10">
              <Image 
                src={logo} 
                alt="ReproHub Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <h1 className="text-lg md:text-xl font-headline font-black tracking-tighter text-primary">
              MURALIS<span className="text-accent">.</span>
            </h1>
          </div>
          <Separator orientation="vertical" className="h-8 hidden md:block" />
          <div className="hidden md:flex bg-muted/50 p-1 rounded-xl">
            <Button 
              variant={view === 'editor' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setView('editor')} 
              className={cn(
                "gap-2 font-bold h-8 rounded-lg text-xs transition-all",
                view === 'editor' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white"
              )}
            >
              <Layout className="h-3.5 w-3.5" /> {t.editor}
            </Button>
            <Button 
              variant={view === 'preview' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setView('preview')} 
              className={cn(
                "gap-2 font-bold h-8 rounded-lg text-xs transition-all",
                view === 'preview' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white"
              )}
            >
              <Eye className="h-3.5 w-3.5" /> {t.preview}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button className="hidden sm:flex bg-primary hover:bg-primary/90 text-white font-black gap-2 h-10 px-6 rounded-xl shadow-md transition-all active:scale-95 text-xs" onClick={handleExport} disabled={!image || isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExporting ? "..." : t.export}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <section className={cn(
          "flex-1 relative bg-[#f8f9fa] flex flex-col items-center",
          !image ? "overflow-y-auto justify-start py-8" : "overflow-hidden justify-center"
        )}>
          {!image ? (
            <div className="max-w-lg w-full px-6 md:p-8 animate-fade-in text-center flex flex-col gap-6 md:gap-8 my-auto">
              <div className="order-1">
                <ImageUploader onImageUpload={handleImageUpload} language={lang} t={t} />
              </div>
              <div className="order-2 space-y-2">
                <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tighter">Preparar nuevo mural</h2>
                <p className="text-muted-foreground font-medium text-sm md:text-base">Sube una imagen de alta resolución para generar tu cuadrícula.</p>
              </div>
            </div>
          ) : (
            <>
              {physicalInfo && (
                <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-5xl px-4 md:px-8">
                  <div className="bg-white/80 backdrop-blur-xl border border-primary/20 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] px-4 md:px-6 py-2 md:py-3 rounded-2xl flex items-center justify-between pointer-events-auto animate-fade-in">
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="flex flex-col">
                        <span className="text-[6px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t.finalMeasures}</span>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Maximize2 className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-primary" />
                          <span className="text-xs md:text-base font-black text-foreground">{physicalInfo.imgW} x {physicalInfo.imgH} cm</span>
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-6 md:h-8 opacity-50" />
                      <div className="flex flex-col">
                        <span className="text-[6px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Paneles</span>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Layers className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-accent" />
                          <span className="text-xs md:text-base font-black text-foreground">{rows * cols} <span className="hidden sm:inline">{lang === 'es' ? 'HOJAS' : 'SHEETS'}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t.paperSize}</span>
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{paperSize} {orientation === 'portrait' ? '(V)' : '(H)'}</span>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setImage(null)}
                        className="h-8 md:h-10 text-[10px] md:text-xs font-black uppercase gap-2 rounded-xl border border-border/50 shadow-sm"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">{lang === 'es' ? 'Cambiar Imagen' : 'Change Image'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full h-full p-4 md:p-8 flex flex-col pt-20 md:pt-24 overflow-y-auto">
                <div className="flex-1 min-h-[400px]">
                  {view === 'editor' ? (
                    <MuralCanvas 
                      imageUrl={image.url} 
                      rows={rows} 
                      cols={cols} 
                      overlap={overlap} 
                      marginV={marginV} 
                      marginH={marginH}
                      paperSize={paperSize} 
                      orientation={orientation}
                      showGuides={showGuides} 
                      imageWidth={image.width} 
                      imageHeight={image.height} 
                    />
                  ) : (
                    <MockupPreview imageUrl={image.url} rows={rows} cols={cols} />
                  )}
                </div>

                <div className="sm:hidden mt-6 pb-24">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black gap-3 h-14 rounded-2xl shadow-xl active:scale-[0.98] transition-all text-sm uppercase tracking-wider" 
                    onClick={handleExport} 
                    disabled={isExporting}
                  >
                    {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
                    {isExporting ? "Exportando..." : t.export}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="hidden lg:block w-80 border-l border-border bg-white overflow-y-auto shadow-xl z-10">
          {renderSettings()}
        </aside>
      </main>

      {image && (
        <>
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen} modal={false}>
            <SheetTrigger asChild>
              <div className="lg:hidden fixed bottom-6 right-6 z-[100] pointer-events-auto">
                <Button 
                  size="icon" 
                  className="h-14 w-14 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 border-4 border-white"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Settings2 className="h-6 w-6" />}
                </Button>
              </div>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] sm:w-[400px] p-0 bg-white shadow-2xl overflow-hidden flex flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>{t.gridSettings}</SheetTitle>
                <SheetDescription>Panel de ajustes para la cuadrícula del mural</SheetDescription>
              </SheetHeader>

              {/* Botón de Exportar PDF de Ancho Completo */}
              <div className="p-6 bg-primary/5 border-b border-border/50">
                <Button 
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black gap-3 rounded-2xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest"
                  onClick={handleExport}
                  disabled={!image || isExporting}
                >
                  {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
                  {isExporting ? "..." : t.export}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Selector de modo (Editor/Previsualización) en móvil */}
                <div className="px-6 pt-6 pb-2 md:hidden">
                  <div className="flex bg-muted/50 p-1.5 rounded-2xl shadow-inner w-full border border-border/30">
                    <Button 
                      onClick={() => setView('editor')} 
                      className={cn(
                        "gap-2 font-bold h-11 rounded-xl text-xs flex-1 transition-all",
                        view === 'editor' ? "bg-white text-primary shadow-md border-transparent" : "bg-transparent text-muted-foreground hover:bg-white/50"
                      )}
                      variant={view === 'editor' ? 'default' : 'ghost'}
                    >
                      {t.editor}
                    </Button>
                    <Button 
                      onClick={() => setView('preview')} 
                      className={cn(
                        "gap-2 font-bold h-11 rounded-xl text-xs flex-1 transition-all",
                        view === 'preview' ? "bg-white text-primary shadow-md border-transparent" : "bg-transparent text-muted-foreground hover:bg-white/50"
                      )}
                      variant={view === 'preview' ? 'default' : 'ghost'}
                    >
                      {t.preview}
                    </Button>
                  </div>
                </div>

                {renderSettings()}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

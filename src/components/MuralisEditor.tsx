
"use client";

import { useState, useEffect, useCallback, useMemo, useDeferredValue } from "react";
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
  ImageIcon,
  Ruler,
  Maximize2,
  ChevronLeft,
  RefreshCcw
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
  
  // Estado real (en vivo)
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [overlap, setOverlap] = useState(1.5); 
  const [marginV, setMarginV] = useState(1); 
  const [marginH, setMarginH] = useState(1); 
  const [paperSize, setPaperSize] = useState('Carta');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [lockAspect, setLockAspect] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

  // Estado de borrador para móvil (drafts)
  const [draftRows, setDraftRows] = useState(2);
  const [draftCols, setDraftCols] = useState(2);
  const [draftOverlap, setDraftOverlap] = useState(1.5);
  const [draftMarginV, setDraftMarginV] = useState(1);
  const [draftMarginH, setDraftMarginH] = useState(1);
  const [draftPaperSize, setDraftPaperSize] = useState('Carta');
  const [draftOrientation, setDraftOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [draftLockAspect, setDraftLockAspect] = useState(true);
  const [draftShowGuides, setDraftShowGuides] = useState(true);

  // Valores diferidos para renderizado suave
  const deferredRows = useDeferredValue(rows);
  const deferredCols = useDeferredValue(cols);
  const deferredOverlap = useDeferredValue(overlap);
  const deferredMarginV = useDeferredValue(marginV);
  const deferredMarginH = useDeferredValue(marginH);

  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = translations[lang];

  const calculateAutoGrid = useCallback((
    imgW: number, 
    imgH: number, 
    setR: (v: number) => void,
    setC: (v: number) => void,
    pSize: string,
    orient: 'portrait' | 'landscape',
    mH: number,
    mV: number,
    ov: number,
    targetRows?: number, 
    targetCols?: number
  ) => {
    const paperBase = PAPER_DIMENSIONS[pSize];
    const paper = orient === 'portrait' 
      ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
      : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

    const printableW = paper.width - (mH * 20);
    const printableH = paper.height - (mV * 20);
    const overlapMm = ov * 10;
    const imgAspect = imgW / imgH;
    const effectiveSheetW = printableW - overlapMm;
    const effectiveSheetH = printableH - overlapMm;

    if (targetRows !== undefined) {
      const totalH_mm = targetRows * effectiveSheetH + overlapMm;
      const totalW_mm = totalH_mm * imgAspect;
      const calculatedCols = Math.max(1, Math.round((totalW_mm - overlapMm) / effectiveSheetW));
      setR(targetRows);
      setC(calculatedCols);
    } else if (targetCols !== undefined) {
      const totalW_mm = targetCols * effectiveSheetW + overlapMm;
      const totalH_mm = totalW_mm / imgAspect;
      const calculatedRows = Math.max(1, Math.round((totalH_mm - overlapMm) / effectiveSheetH));
      setC(targetCols);
      setR(calculatedRows);
    } else {
      const initialCols = 3;
      const totalW_mm = initialCols * effectiveSheetW + overlapMm;
      const totalH_mm = totalW_mm / imgAspect;
      const initialRows = Math.max(1, Math.round((totalH_mm - overlapMm) / effectiveSheetH));
      setC(initialCols);
      setR(initialRows);
    }
  }, []);

  const handleMenuOpenChange = (open: boolean) => {
    if (open) {
      // Sincronizar borradores al abrir
      setDraftRows(rows);
      setDraftCols(cols);
      setDraftOverlap(overlap);
      setDraftMarginV(marginV);
      setDraftMarginH(marginH);
      setDraftPaperSize(paperSize);
      setDraftOrientation(orientation);
      setDraftLockAspect(lockAspect);
      setDraftShowGuides(showGuides);
    } else {
      // Aplicar borradores al cerrar
      setRows(draftRows);
      setCols(draftCols);
      setOverlap(draftOverlap);
      setMarginV(draftMarginV);
      setMarginH(draftMarginH);
      setPaperSize(draftPaperSize);
      setOrientation(draftOrientation);
      setLockAspect(draftLockAspect);
      setShowGuides(draftShowGuides);
    }
    setIsMenuOpen(open);
  };

  const handleImageUpload = (file: File, url: string) => {
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage({ file, url, width: img.width, height: img.height });
      calculateAutoGrid(img.width, img.height, setRows, setCols, paperSize, orientation, marginH, marginV, overlap);
    };
  };

  const handleExport = async () => {
    if (!image) return;
    setIsExporting(true);
    try {
      const img = new window.Image();
      img.src = image.url;
      await new Promise((resolve) => img.onload = resolve);

      // Usar los valores actuales para exportar
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

  const getMeasures = (r: number, c: number, ov: number, mV: number, mH: number, pS: string, orient: 'portrait' | 'landscape') => {
    if (!image) return null;
    const paperBase = PAPER_DIMENSIONS[pS];
    const paper = orient === 'portrait' 
      ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
      : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

    const printableW = paper.width - (mH * 20);
    const printableH = paper.height - (mV * 20);
    const overlapMm = ov * 10;
    const effectiveW = printableW - overlapMm;
    const effectiveH = printableH - overlapMm;

    const totalGridW = (c * effectiveW) + overlapMm;
    const totalGridH = (r * effectiveH) + overlapMm;

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
      imgW: (finalW_mm / 10).toFixed(1),
      imgH: (finalH_mm / 10).toFixed(1),
      printableW: (printableW / 10).toFixed(1),
      printableH: (printableH / 10).toFixed(1),
      blankW: ((totalGridW - finalW_mm) / 10).toFixed(1),
      blankH: ((totalGridH - finalH_mm) / 10).toFixed(1),
    };
  };

  const physicalInfo = useMemo(() => getMeasures(rows, cols, overlap, marginV, marginH, paperSize, orientation), [image, rows, cols, overlap, marginV, marginH, paperSize, orientation]);
  const draftInfo = useMemo(() => getMeasures(draftRows, draftCols, draftOverlap, draftMarginV, draftMarginH, draftPaperSize, draftOrientation), [image, draftRows, draftCols, draftOverlap, draftMarginV, draftMarginH, draftPaperSize, draftOrientation]);

  const renderSettings = (
    currentRows: number, 
    setCurrentRows: (v: number) => void,
    currentCols: number,
    setCurrentCols: (v: number) => void,
    currentOverlap: number,
    setCurrentOverlap: (v: number) => void,
    currentMarginV: number,
    setCurrentMarginV: (v: number) => void,
    currentMarginH: number,
    setCurrentMarginH: (v: number) => void,
    currentPaperSize: string,
    setCurrentPaperSize: (v: string) => void,
    currentOrientation: 'portrait' | 'landscape',
    setCurrentOrientation: (v: 'portrait' | 'landscape') => void,
    currentLockAspect: boolean,
    setCurrentLockAspect: (v: boolean) => void,
    currentShowGuides: boolean,
    setCurrentShowGuides: (v: boolean) => void,
    info: any,
    isMobile?: boolean
  ) => (
    <div className={cn("space-y-4", isMobile ? "p-4 pt-1" : "p-4")}>
      {!isMobile && (
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white px-2 py-1 rounded-md shadow-sm border border-border/20">
            <Settings2 className="h-3 w-3" /> {t.gridSettings}
          </h2>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-2">
            <Link2 className="h-3 w-3 text-primary" />
            <Label className="text-[10px] font-black uppercase cursor-pointer" htmlFor={isMobile ? "draft-lock-aspect" : "lock-aspect"}>Proporción Bloqueada</Label>
          </div>
          <Switch id={isMobile ? "draft-lock-aspect" : "lock-aspect"} checked={currentLockAspect} onCheckedChange={setCurrentLockAspect} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{t.rows}</Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentRows}</span>
          </div>
          <Slider value={[currentRows]} onValueChange={(v) => currentLockAspect && image ? calculateAutoGrid(image.width, image.height, setCurrentRows, setCurrentCols, currentPaperSize, currentOrientation, currentMarginH, currentMarginV, currentOverlap, v[0]) : setCurrentRows(v[0])} min={1} max={15} step={1} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{t.columns}</Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentCols}</span>
          </div>
          <Slider value={[currentCols]} onValueChange={(v) => currentLockAspect && image ? calculateAutoGrid(image.width, image.height, setCurrentRows, setCurrentCols, currentPaperSize, currentOrientation, currentMarginH, currentMarginV, currentOverlap, undefined, v[0]) : setCurrentCols(v[0])} min={1} max={15} step={1} />
        </div>

        <Separator className="bg-white/40" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-0.5 inline-block">{t.paperSize}</Label>
            <Select value={currentPaperSize} onValueChange={(v) => setCurrentPaperSize(v)}>
              <SelectTriggerUI className="h-8 rounded-lg text-xs font-bold bg-white shadow-sm border border-border/10"><SelectValue /></SelectTriggerUI>
              <SelectContent>
                {Object.keys(PAPER_DIMENSIONS).map(key => <SelectItem key={key} value={key} className="text-xs font-bold">{key}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-0.5 inline-block">{t.orientation}</Label>
            <Select value={currentOrientation} onValueChange={(v: any) => setCurrentOrientation(v)}>
              <SelectTriggerUI className="h-8 rounded-lg text-xs font-bold bg-white shadow-sm border border-border/10"><SelectValue /></SelectTriggerUI>
              <SelectContent>
                <SelectItem value="portrait" className="text-xs font-bold">{t.portrait}</SelectItem>
                <SelectItem value="landscape" className="text-xs font-bold">{t.landscape}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Scissors className="h-3 w-3" /> {t.overlap}
            </Label>
            <span className="text-xs font-black text-accent bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentOverlap} cm</span>
          </div>
          <Slider value={[currentOverlap]} onValueChange={(v) => setCurrentOverlap(v[0])} min={0} max={10} step={0.1} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Maximize className="h-3 w-3" /> {t.marginsVertical}
            </Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentMarginV} cm</span>
          </div>
          <Slider value={[currentMarginV]} onValueChange={(v) => setCurrentMarginV(v[0])} min={0} max={5} step={0.5} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Maximize className="h-3 w-3" /> {t.marginsHorizontal}
            </Label>
            <span className="text-xs font-black text-primary bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentMarginH} cm</span>
          </div>
          <Slider value={[currentMarginH]} onValueChange={(v) => setCurrentMarginH(v[0])} min={0} max={5} step={0.5} />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10" htmlFor={isMobile ? "draft-guides" : "guides"}>{t.guides}</Label>
          <Switch id={isMobile ? "draft-guides" : "guides"} checked={currentShowGuides} onCheckedChange={setCurrentShowGuides} className="bg-white/50" />
        </div>
      </div>

      {info && (
        <div className="p-3 bg-white/90 rounded-xl border border-white/40 shadow-xl space-y-2">
          <div className="flex items-center gap-2 mb-0.5">
            <Ruler className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.finalMeasures}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[8px] font-bold text-muted-foreground uppercase block">{lang === 'es' ? 'Imagen' : 'Image'}</span>
              <span className="text-xs font-black text-primary">{info.imgW} x {info.imgH} cm</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-muted-foreground uppercase block">{t.panelArea}</span>
              <span className="text-xs font-black text-foreground">{info.printableW} x {info.printableH} cm</span>
            </div>
          </div>
          <Separator className="opacity-20" />
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">{t.blankSpace}</span>
            <span className={cn("text-[10px] font-black", Number(info.blankW) > 0 || Number(info.blankH) > 0 ? "text-accent" : "text-muted-foreground")}>
              +{info.blankW}w / +{info.blankH}h cm
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-svh w-full font-body bg-white text-foreground overflow-hidden">
      <header className="h-14 lg:h-16 border-b border-border bg-white flex items-center justify-between px-4 lg:px-6 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-2 lg:gap-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary px-2">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden lg:inline">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-6 h-6 lg:w-8 lg:h-8 relative overflow-hidden rounded-lg shadow-sm bg-white border border-border/10">
              <Image 
                src={logo} 
                alt="ReproHub Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <h1 className="text-lg lg:text-xl font-headline font-black tracking-tighter text-primary">
              MURALIS<span className="text-accent">.</span>
            </h1>
          </div>
          <Separator orientation="vertical" className="h-8 hidden lg:block" />
          <div className="hidden lg:flex bg-muted/50 p-1 rounded-xl">
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
        <div className="flex items-center gap-2 lg:gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button className="hidden lg:flex bg-primary hover:bg-primary/90 text-white font-black gap-2 h-10 px-6 rounded-xl shadow-md transition-all active:scale-95 text-xs" onClick={handleExport} disabled={!image || isExporting}>
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
            <div className="max-w-lg w-full px-6 lg:p-8 animate-fade-in text-center flex flex-col gap-6 lg:gap-8 my-auto">
              <div className="order-1">
                <ImageUploader onImageUpload={handleImageUpload} language={lang} t={t} />
              </div>
              <div className="order-2 space-y-2">
                <h2 className="text-2xl lg:text-3xl font-headline font-black tracking-tighter">Preparar nuevo mural</h2>
                <p className="text-muted-foreground font-medium text-sm lg:text-base">Sube una imagen de alta resolución para generar tu cuadrícula.</p>
              </div>
            </div>
          ) : (
            <>
              {physicalInfo && (
                <div className="absolute top-4 lg:top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-5xl px-4 lg:px-8">
                  <div className="bg-white/80 backdrop-blur-xl border border-primary/20 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] px-4 lg:px-6 py-2 lg:py-3 rounded-2xl flex items-center justify-between pointer-events-auto animate-fade-in">
                    <div className="flex items-center gap-3 lg:gap-6">
                      <div className="flex flex-col">
                        <span className="text-[6px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t.finalMeasures}</span>
                        <div className="flex items-center gap-1.5 lg:gap-2">
                          <Maximize2 className="h-2.5 w-2.5 lg:h-3.5 lg:w-3.5 text-primary" />
                          <span className="text-xs lg:text-base font-black text-foreground">{physicalInfo.imgW} x {physicalInfo.imgH} cm</span>
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-6 lg:h-8 opacity-50" />
                      <div className="flex flex-col">
                        <span className="text-[6px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Paneles</span>
                        <div className="flex items-center gap-1.5 lg:gap-2">
                          <Layers className="h-2.5 w-2.5 lg:h-3.5 lg:w-3.5 text-accent" />
                          <span className="text-xs lg:text-base font-black text-foreground">{rows * cols} <span className="hidden sm:inline">{lang === 'es' ? 'HOJAS' : 'SHEETS'}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-4">
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t.paperSize}</span>
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{paperSize} {orientation === 'portrait' ? '(V)' : '(H)'}</span>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setImage(null)}
                        className="h-8 lg:h-10 text-[10px] lg:text-xs font-black uppercase gap-2 rounded-xl border border-border/50 shadow-sm"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">{lang === 'es' ? 'Cambiar Imagen' : 'Change Image'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full h-full p-4 lg:p-8 flex flex-col pt-20 lg:pt-24 overflow-y-auto">
                <div className="flex-1 min-h-[400px]">
                  {view === 'editor' ? (
                    <MuralCanvas 
                      imageUrl={image.url} 
                      rows={deferredRows} 
                      cols={deferredCols} 
                      overlap={deferredOverlap} 
                      marginV={deferredMarginV} 
                      marginH={deferredMarginH}
                      paperSize={paperSize} 
                      orientation={orientation}
                      showGuides={showGuides} 
                      imageWidth={image.width} 
                      imageHeight={image.height} 
                    />
                  ) : (
                    <MockupPreview imageUrl={image.url} rows={deferredRows} cols={deferredCols} />
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="hidden lg:block w-80 border-l border-border bg-white overflow-y-auto shadow-xl z-10">
          {renderSettings(
            rows, setRows, 
            cols, setCols, 
            overlap, setOverlap, 
            marginV, setMarginV, 
            marginH, setMarginH,
            paperSize, setPaperSize,
            orientation, setOrientation,
            lockAspect, setLockAspect,
            showGuides, setShowGuides,
            physicalInfo
          )}
        </aside>
      </main>

      {image && (
        <Sheet open={isMenuOpen} onOpenChange={handleMenuOpenChange} modal={false}>
          <SheetTrigger asChild>
            <div className="lg:hidden fixed bottom-6 right-6 z-[100] pointer-events-auto">
              <Button 
                size="icon" 
                className="h-14 w-14 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 border-4 border-white"
              >
                <Settings2 className="h-6 w-6" />
              </Button>
            </div>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] sm:w-[400px] p-0 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col border-l border-border/20">
            <SheetHeader className="sr-only">
              <SheetTitle>{t.gridSettings}</SheetTitle>
              <SheetDescription>Panel de ajustes para la cuadrícula del mural</SheetDescription>
            </SheetHeader>

            <div className="p-3 bg-primary/5 flex flex-col gap-3">
              <Button 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black gap-3 rounded-xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
                onClick={handleExport}
                disabled={!image || isExporting}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {isExporting ? "..." : t.export}
              </Button>

              <div className="flex bg-muted/40 p-1 rounded-xl shadow-inner w-full border border-border/20">
                <Button 
                  onClick={() => setView('editor')} 
                  className={cn(
                    "gap-2 font-bold h-8 rounded-lg text-[10px] flex-1 transition-all",
                    view === 'editor' ? "bg-white text-primary shadow-sm border border-primary/10" : "bg-transparent text-muted-foreground hover:bg-white/50"
                  )}
                  variant={view === 'editor' ? 'default' : 'ghost'}
                >
                  {t.editor}
                </Button>
                <Button 
                  onClick={() => setView('preview')} 
                  className={cn(
                    "gap-2 font-bold h-8 rounded-lg text-[10px] flex-1 transition-all",
                    view === 'preview' ? "bg-white text-primary shadow-sm border border-primary/10" : "bg-transparent text-muted-foreground hover:bg-white/50"
                  )}
                  variant={view === 'preview' ? 'default' : 'ghost'}
                >
                  {t.preview}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {renderSettings(
                draftRows, setDraftRows, 
                draftCols, setDraftCols, 
                draftOverlap, setDraftOverlap, 
                draftMarginV, setDraftMarginV, 
                draftMarginH, setDraftMarginH,
                draftPaperSize, setDraftPaperSize,
                draftOrientation, setDraftOrientation,
                draftLockAspect, setDraftLockAspect,
                draftShowGuides, setDraftShowGuides,
                draftInfo,
                true
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

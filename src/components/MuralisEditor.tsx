"use client";

import { useState, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import Image from "next/image";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { ImageUploader } from "./ImageUploader";
import { MuralCanvas } from "./MuralCanvas";
import { ThemeToggle } from "./ThemeToggle";
import { 
  Settings2, 
  Layout, 
  FileDown, 
  Scissors,
  Layers,
  Loader2,
  Maximize,
  RefreshCcw,
  Plus,
  Minus,
  ChevronLeft,
  Maximize2,
  Ruler,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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
  SheetDescription
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
  'Oficio (Legal 35.5cm)': { width: 215.9, height: 355.6, format: 'legal' },
  'Folio (33cm)': { width: 215.9, height: 330.2, format: 'folio' },
  'Oficio (34cm)': { width: 216, height: 340, format: 'oficio' },
  'Extra Oficio (38cm)': { width: 216, height: 380, format: 'extra-oficio' }
};

const MAX_GRID_DIM = 24; 

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

  const [targetWidth, setTargetWidth] = useState<string>('0');
  const [targetHeight, setTargetHeight] = useState<string>('0');

  const [draftRows, setDraftRows] = useState(2);
  const [draftCols, setDraftCols] = useState(2);
  const [draftOverlap, setDraftOverlap] = useState(1.5);
  const [draftMarginV, setDraftMarginV] = useState(1);
  const [draftMarginH, setDraftMarginH] = useState(1);
  const [draftPaperSize, setDraftPaperSize] = useState('Carta');
  const [draftOrientation, setDraftOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [draftShowGuides, setDraftShowGuides] = useState(true);
  const [draftTargetWidth, setDraftTargetWidth] = useState<string>('0');
  const [draftTargetHeight, setDraftTargetHeight] = useState<string>('0');

  const deferredRows = useDeferredValue(rows);
  const deferredCols = useDeferredValue(cols);
  const deferredOverlap = useDeferredValue(overlap);
  const deferredMarginV = useDeferredValue(marginV);
  const deferredMarginH = useDeferredValue(marginH);

  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = translations[lang];

  const calculateOptimizedGrid = (
    w_cm: number, 
    h_cm: number, 
    pSize: string, 
    ov_cm: number, 
    mV_cm: number, 
    mH_cm: number
  ) => {
    const paperBase = PAPER_DIMENSIONS[pSize];
    const targetW_mm = w_cm * 10;
    const targetH_mm = h_cm * 10;
    const overlap_mm = ov_cm * 10;
    const marginV_mm = mV_cm * 10;
    const marginH_mm = mH_cm * 10;

    const calcForOrientation = (orient: 'portrait' | 'landscape') => {
      const paper = orient === 'portrait' 
        ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
        : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

      const printableW = paper.width - (marginH_mm * 2);
      const printableH = paper.height - (marginV_mm * 2);
      const effectiveW = printableW - overlap_mm;
      const effectiveH = printableH - overlap_mm;

      const c = Math.ceil((targetW_mm - overlap_mm) / effectiveW);
      const r = Math.ceil((targetH_mm - overlap_mm) / effectiveH);
      
      return { 
        rows: Math.max(1, r), 
        cols: Math.max(1, c), 
        total: Math.max(1, r) * Math.max(1, c),
        orientation: orient
      };
    };

    const pResults = calcForOrientation('portrait');
    const lResults = calcForOrientation('landscape');

    return pResults.total <= lResults.total ? pResults : lResults;
  };

  const handleRowsGridChange = (newRows: number, isDraft: boolean) => {
    if (!image) return;
    const pS = isDraft ? draftPaperSize : paperSize;
    const orient = isDraft ? draftOrientation : orientation;
    const ov = isDraft ? draftOverlap : overlap;
    const mV = isDraft ? draftMarginV : marginV;
    const mH = isDraft ? draftMarginH : marginH;
    
    const paperBase = PAPER_DIMENSIONS[pS];
    const paper = orient === 'portrait' 
      ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
      : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

    const printableH = paper.height - (mV * 20);
    const overlapMm = ov * 10;
    const effectiveH = printableH - overlapMm;
    
    const newH_mm = (newRows * effectiveH) + overlapMm;
    const aspect = image.width / image.height;
    const newW_mm = newH_mm * aspect;

    const printableW = paper.width - (mH * 20);
    const overlapMmX = ov * 10;
    const effectiveW = printableW - overlapMmX;
    const neededCols = Math.ceil((newW_mm - overlapMmX) / effectiveW);

    const setR = isDraft ? setDraftRows : setRows;
    const setC = isDraft ? setDraftCols : setCols;
    const setW = isDraft ? setDraftTargetWidth : setTargetWidth;
    const setH = isDraft ? setDraftTargetHeight : setTargetHeight;

    setR(newRows);
    setC(Math.max(1, neededCols));
    setW((newW_mm / 10).toFixed(1));
    setH((newH_mm / 10).toFixed(1));
  };

  const handleColsGridChange = (newCols: number, isDraft: boolean) => {
    if (!image) return;
    const pS = isDraft ? draftPaperSize : paperSize;
    const orient = isDraft ? draftOrientation : orientation;
    const ov = isDraft ? draftOverlap : overlap;
    const mV = isDraft ? draftMarginV : marginV;
    const mH = isDraft ? draftMarginH : marginH;

    const paperBase = PAPER_DIMENSIONS[pS];
    const paper = orient === 'portrait' 
      ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
      : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

    const printableW = paper.width - (mH * 20);
    const overlapMm = ov * 10;
    const effectiveW = printableW - overlapMm;
    
    const newW_mm = (newCols * effectiveW) + overlapMm;
    const aspect = image.width / image.height;
    const newH_mm = newW_mm / aspect;

    const printableH = paper.height - (mV * 20);
    const overlapMmY = ov * 10;
    const effectiveH = printableH - overlapMmY;
    const neededRows = Math.ceil((newH_mm - overlapMmY) / effectiveH);

    const setR = isDraft ? setDraftRows : setRows;
    const setC = isDraft ? setDraftCols : setCols;
    const setW = isDraft ? setDraftTargetWidth : setTargetWidth;
    const setH = isDraft ? setDraftTargetHeight : setTargetHeight;

    setC(newCols);
    setR(Math.max(1, neededRows));
    setW((newW_mm / 10).toFixed(1));
    setH((newH_mm / 10).toFixed(1));
  };

  const handleWidthChange = (val: string, isDraft: boolean) => {
    if (!image) return;
    const num = Math.max(0, parseFloat(val));
    if (isNaN(num)) {
      if (isDraft) setDraftTargetWidth(val);
      else setTargetWidth(val);
      return;
    }

    const aspect = image.width / image.height;
    const newHeight = num / aspect;

    const setW = isDraft ? setDraftTargetWidth : setTargetWidth;
    const setH = isDraft ? setDraftTargetHeight : setTargetHeight;
    const setR = isDraft ? setDraftRows : setRows;
    const setC = isDraft ? setDraftCols : setCols;
    const setO = isDraft ? setDraftOrientation : setOrientation;

    setW(num.toString());
    setH(newHeight.toFixed(1));

    if (num > 0) {
      const opt = calculateOptimizedGrid(
        num, 
        newHeight, 
        isDraft ? draftPaperSize : paperSize, 
        isDraft ? draftOverlap : overlap, 
        isDraft ? draftMarginV : marginV, 
        isDraft ? draftMarginH : marginH
      );
      setR(opt.rows);
      setC(opt.cols);
      setO(opt.orientation);
    }
  };

  const handleHeightChange = (val: string, isDraft: boolean) => {
    if (!image) return;
    const num = Math.max(0, parseFloat(val));
    if (isNaN(num)) {
      if (isDraft) setDraftTargetHeight(val);
      else setTargetHeight(val);
      return;
    }

    const aspect = image.width / image.height;
    const newWidth = num * aspect;

    const setW = isDraft ? setDraftTargetWidth : setTargetWidth;
    const setH = isDraft ? setDraftTargetHeight : setTargetHeight;
    const setR = isDraft ? setDraftRows : setRows;
    const setC = isDraft ? setDraftCols : setCols;
    const setO = isDraft ? setDraftOrientation : setOrientation;

    setH(num.toString());
    setW(newWidth.toFixed(1));

    if (num > 0) {
      const opt = calculateOptimizedGrid(
        newWidth, 
        num, 
        isDraft ? draftPaperSize : paperSize, 
        isDraft ? draftOverlap : overlap, 
        isDraft ? draftMarginV : marginV, 
        isDraft ? draftMarginH : marginH
      );
      setW(newWidth.toFixed(1));
      setR(opt.rows);
      setC(opt.cols);
      setO(opt.orientation);
    }
  };

  const handleImageUpload = (file: File, url: string) => {
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage({ file, url, width: img.width, height: img.height });
      
      const paperBase = PAPER_DIMENSIONS[paperSize];
      const overlapMm = overlap * 10;
      const marginVMm = marginV * 10;
      const marginHMm = marginH * 10;
      const aspect = img.width / img.height;

      const calcSize = (orient: 'portrait' | 'landscape') => {
        const p = orient === 'portrait' 
          ? { w: Math.min(paperBase.width, paperBase.height), h: Math.max(paperBase.width, paperBase.height) }
          : { w: Math.max(paperBase.width, paperBase.height), h: Math.min(paperBase.width, paperBase.height) };
        
        const printableW = p.w - (marginHMm * 2);
        const printableH = p.h - (marginVMm * 2);
        const effectiveW = printableW - overlapMm;
        const effectiveH = printableH - overlapMm;

        const targetGridW = (2 * effectiveW) + overlapMm;
        const targetGridH = (2 * effectiveH) + overlapMm;

        let finalW, finalH;
        if (targetGridW / targetGridH > aspect) {
          finalH = targetGridH;
          finalW = finalH * aspect;
        } else {
          finalW = targetGridW;
          finalH = finalW / aspect;
        }
        return { w: finalW, h: finalH, area: finalW * finalH, orient };
      };

      const port = calcSize('portrait');
      const land = calcSize('landscape');
      const best = port.area >= land.area ? port : land;

      setRows(2);
      setCols(2);
      setOrientation(best.orient);
      setTargetWidth((best.w / 10).toFixed(1));
      setTargetHeight((best.h / 10).toFixed(1));
    };
  };

  const handleMenuOpenChange = (open: boolean) => {
    if (open) {
      setDraftRows(rows);
      setDraftCols(cols);
      setDraftOverlap(overlap);
      setDraftMarginV(marginV);
      setDraftMarginH(marginH);
      setDraftPaperSize(paperSize);
      setDraftOrientation(orientation);
      setDraftShowGuides(showGuides);
      setDraftTargetWidth(targetWidth);
      setDraftTargetHeight(targetHeight);
    } else {
      setRows(draftRows);
      setCols(draftCols);
      setOverlap(draftOverlap);
      setMarginV(draftMarginV);
      setMarginH(draftMarginH);
      setPaperSize(draftPaperSize);
      setOrientation(draftOrientation);
      setShowGuides(draftShowGuides);
      setTargetWidth(draftTargetWidth);
      setTargetHeight(draftTargetHeight);
    }
    setIsMenuOpen(open);
  };

  const handleExport = async () => {
    if (!image) return;
    setIsExporting(true);
    try {
      const img = new window.Image();
      img.src = image.url;
      await new Promise((resolve) => img.onload = resolve);

      const activeRows = isMenuOpen ? draftRows : rows;
      const activeCols = isMenuOpen ? draftCols : cols;
      const activeOverlap = isMenuOpen ? draftOverlap : overlap;
      const activeMarginV = isMenuOpen ? draftMarginV : marginV;
      const activeMarginH = isMenuOpen ? draftMarginH : marginH;
      const activePaperSize = isMenuOpen ? draftPaperSize : paperSize;
      const activeOrientation = isMenuOpen ? draftOrientation : orientation;
      const activeTargetW = parseFloat(isMenuOpen ? draftTargetWidth : targetWidth);
      const activeTargetH = parseFloat(isMenuOpen ? draftTargetHeight : targetHeight);

      const paperBase = PAPER_DIMENSIONS[activePaperSize];
      const paper = activeOrientation === 'portrait' 
        ? { width: Math.min(paperBase.width, paperBase.height), height: Math.max(paperBase.width, paperBase.height) }
        : { width: Math.max(paperBase.width, paperBase.height), height: Math.min(paperBase.width, paperBase.height) };

      const pdf = new jsPDF({
        orientation: activeOrientation === 'portrait' ? 'p' : 'l',
        unit: 'mm',
        format: paperBase.format as any
      });

      const printableW = paper.width - (activeMarginH * 20);
      const printableH = paper.height - (activeMarginV * 20);
      const overlapMm = activeOverlap * 10;
      const effectiveSheetW = printableW - overlapMm;
      const effectiveSheetH = printableH - overlapMm;

      const totalGridW = (activeCols * effectiveSheetW) + overlapMm;
      const totalGridH = (activeRows * effectiveSheetH) + overlapMm;

      const finalW_mm = activeTargetW * 10;
      const finalH_mm = activeTargetH * 10;
      const offsetX_mm = (totalGridW - finalW_mm) / 2;
      const offsetY_mm = (totalGridH - finalH_mm) / 2;

      const pxPerMm = img.width / finalW_mm;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas fail");

      for (let r = 0; r < activeRows; r++) {
        for (let c = 0; c < activeCols; c++) {
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
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (activeMarginH * 10) + drawInSheetX_mm, (activeMarginV * 10) + drawInSheetY_mm, visibleW_mm, visibleH_mm);
          }

          pdf.setDrawColor(220);
          pdf.setLineDashPattern([2, 2], 0);
          if (c < activeCols - 1) {
            const gx = (activeMarginH * 10) + (printableW - overlapMm);
            pdf.line(gx, activeMarginV * 10, gx, activeMarginV * 10 + printableH);
          }
          if (r < activeRows - 1) {
            const gy = (activeMarginV * 10) + (printableH - overlapMm);
            pdf.line(activeMarginH * 10, gy, activeMarginH * 10 + printableW, gy);
          }
          pdf.setFontSize(7);
          pdf.setTextColor(180);
          pdf.text(`MULTIPRINTTOOLS | ${t.muralisTitle.toUpperCase()} | PANEL ${r+1}-${c+1} | ${activePaperSize} (${activeOrientation === 'portrait' ? 'P' : 'L'})`, activeMarginH * 10, paper.height - (activeMarginV * 5));
        }
      }
      pdf.save(`mural-grid-${Date.now()}.pdf`);
      toast({ title: t.export, description: "PDF generado con éxito." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  const getMeasures = (r: number, c: number, ov: number, mV: number, mH: number, pS: string, orient: 'portrait' | 'landscape', tW: string, tH: string) => {
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

    const finalW_mm = parseFloat(tW) * 10;
    const finalH_mm = parseFloat(tH) * 10;

    return {
      imgW: (finalW_mm / 10).toFixed(1),
      imgH: (finalH_mm / 10).toFixed(1),
      printableW: (printableW / 10).toFixed(1),
      printableH: (printableH / 10).toFixed(1),
      blankW: Math.max(0, (totalGridW - finalW_mm) / 10).toFixed(1),
      blankH: Math.max(0, (totalGridH - finalH_mm) / 10).toFixed(1),
    };
  };

  const physicalInfo = useMemo(() => getMeasures(rows, cols, overlap, marginV, marginH, paperSize, orientation, targetWidth, targetHeight), [image, rows, cols, overlap, marginV, marginH, paperSize, orientation, targetWidth, targetHeight]);
  const draftInfo = useMemo(() => getMeasures(draftRows, draftCols, draftOverlap, draftMarginV, draftMarginH, draftPaperSize, draftOrientation, draftTargetWidth, draftTargetHeight), [image, draftRows, draftCols, draftOverlap, draftMarginV, draftMarginH, draftPaperSize, draftOrientation, draftTargetWidth, draftTargetHeight]);

  const renderSettings = (
    currentRows: number, 
    currentCols: number,
    currentOverlap: number,
    currentMarginV: number,
    currentMarginH: number,
    currentPaperSize: string,
    currentOrientation: 'portrait' | 'landscape',
    currentShowGuides: boolean,
    curWidth: string,
    curHeight: string,
    info: any,
    isMobile?: boolean
  ) => (
    <div className={cn("space-y-4", isMobile ? "p-4 pt-1" : "p-4")}>
      {!isMobile && (
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-card px-2 py-1 rounded-md shadow-sm border border-border/20">
            <Settings2 className="h-3 v-3" /> {t.gridSettings}
          </h2>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-card p-4 rounded-xl border border-primary/10 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Maximize2 className="h-3.5 w-3.5 text-primary" />
            <Label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{t.finalMeasures}</Label>
            <div className="ml-auto flex items-center gap-1 bg-accent/10 px-1.5 py-0.5 rounded">
              <Zap className="h-2.5 w-2.5 text-accent" />
              <span className="text-[8px] font-black text-accent uppercase">{lang === 'es' ? 'Auto-Optimización' : 'Auto-Optimization'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[8px] font-bold text-muted-foreground uppercase">{t.width}</Label>
              <Input 
                type="number" 
                value={curWidth} 
                onChange={(e) => handleWidthChange(e.target.value, !!isMobile)}
                min="0.1"
                step="0.1"
                className="h-9 font-black text-sm text-primary bg-primary/5 border-primary/20"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-bold text-muted-foreground uppercase">{t.height}</Label>
              <Input 
                type="number" 
                value={curHeight} 
                onChange={(e) => handleHeightChange(e.target.value, !!isMobile)}
                min="0.1"
                step="0.1"
                className="h-9 font-black text-sm text-primary bg-primary/5 border-primary/20"
              />
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground font-medium leading-tight">
            {t.optimizationNote}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{t.rows}</Label>
            <span className="text-xs font-black text-primary bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentRows}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => handleRowsGridChange(Math.max(1, currentRows - 1), !!isMobile)}>
              <Minus className="h-3 w-3" />
            </Button>
            <Slider 
              value={[currentRows]} 
              onValueChange={(v) => handleRowsGridChange(v[0], !!isMobile)} 
              min={1} 
              max={MAX_GRID_DIM} 
              step={1} 
              className="flex-1" 
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => handleRowsGridChange(Math.min(MAX_GRID_DIM, currentRows + 1), !!isMobile)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{t.columns}</Label>
            <span className="text-xs font-black text-primary bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentCols}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => handleColsGridChange(Math.max(1, currentCols - 1), !!isMobile)}>
              <Minus className="h-3 w-3" />
            </Button>
            <Slider 
              value={[currentCols]} 
              onValueChange={(v) => handleColsGridChange(v[0], !!isMobile)} 
              min={1} 
              max={MAX_GRID_DIM} 
              step={1} 
              className="flex-1" 
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => handleColsGridChange(Math.min(MAX_GRID_DIM, currentCols + 1), !!isMobile)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Separator className="bg-border/40" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-0.5 inline-block">{t.paperSize}</Label>
            <Select value={currentPaperSize} onValueChange={(v) => {
              if (isMobile) setDraftPaperSize(v); else setPaperSize(v);
              const curWVal = isMobile ? draftTargetWidth : targetWidth;
              const curHVal = isMobile ? draftTargetHeight : targetHeight;
              const opt = calculateOptimizedGrid(parseFloat(curWVal), parseFloat(curHVal), v, currentOverlap, isMobile ? draftMarginV : marginV, isMobile ? draftMarginH : marginH);
              if (isMobile) {
                setDraftRows(opt.rows); setDraftCols(opt.cols); setDraftOrientation(opt.orientation);
              } else {
                setRows(opt.rows); setCols(opt.cols); setOrientation(opt.orientation);
              }
            }}>
              <SelectTriggerUI className="h-8 rounded-lg text-xs font-bold bg-card shadow-sm border border-border/10"><SelectValue /></SelectTriggerUI>
              <SelectContent>
                {Object.keys(PAPER_DIMENSIONS).map(key => <SelectItem key={key} value={key} className="text-xs font-bold">{key}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-0.5 inline-block">{t.orientation}</Label>
            <Select value={currentOrientation} onValueChange={(v: any) => {
              if (isMobile) setDraftOrientation(v); else setOrientation(v);
              const curWVal = isMobile ? draftTargetWidth : targetWidth;
              const curHVal = isMobile ? draftTargetHeight : targetHeight;
              const opt = calculateOptimizedGrid(parseFloat(curWVal), parseFloat(curHVal), currentPaperSize, currentOverlap, isMobile ? draftMarginV : marginV, isMobile ? draftMarginH : marginH);
              if (isMobile) {
                setDraftRows(opt.rows); setDraftCols(opt.cols);
              } else {
                setRows(opt.rows); setCols(opt.cols);
              }
            }}>
              <SelectTriggerUI className="h-8 rounded-lg text-xs font-bold bg-card shadow-sm border border-border/10"><SelectValue /></SelectTriggerUI>
              <SelectContent>
                <SelectItem value="portrait" className="text-xs font-bold">{t.portrait}</SelectItem>
                <SelectItem value="landscape" className="text-xs font-bold">{t.landscape}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Scissors className="h-3 w-3" /> {t.overlap}
            </Label>
            <span className="text-xs font-black text-accent bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentOverlap} cm</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-accent/10 hover:text-accent" onClick={() => {
              const newVal = Math.max(0, parseFloat((currentOverlap - 0.1).toFixed(1)));
              if (isMobile) setDraftOverlap(newVal); else setOverlap(newVal);
            }}>
              <Minus className="h-3 w-3" />
            </Button>
            <Slider 
              value={[currentOverlap]} 
              onValueChange={(v) => { if (isMobile) setDraftOverlap(v[0]); else setOverlap(v[0]); }} 
              min={0} max={10} step={0.1} className="flex-1" 
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-accent/10 hover:text-accent" onClick={() => {
              const newVal = Math.min(10, parseFloat((currentOverlap + 0.1).toFixed(1)));
              if (isMobile) setDraftOverlap(newVal); else setOverlap(newVal);
            }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Maximize className="h-3 w-3" /> {t.marginsVertical}
            </Label>
            <span className="text-xs font-black text-primary bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentMarginV} cm</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => {
              const newVal = Math.max(0, currentMarginV - 0.5);
              if (isMobile) setDraftMarginV(newVal); else setMarginV(newVal);
            }}>
              <Minus className="h-3 w-3" />
            </Button>
            <Slider 
              value={[currentMarginV]} 
              onValueChange={(v) => { if (isMobile) setDraftMarginV(v[0]); else setMarginV(v[0]); }} 
              min={0} max={5} step={0.5} className="flex-1" 
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => {
              const newVal = Math.min(5, currentMarginV + 0.5);
              if (isMobile) setDraftMarginV(newVal); else setMarginV(newVal);
            }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">
              <Maximize className="h-3 w-3" /> {t.marginsHorizontal}
            </Label>
            <span className="text-xs font-black text-primary bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10">{currentMarginH} cm</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => {
              const newVal = Math.max(0, currentMarginH - 0.5);
              if (isMobile) setDraftMarginH(newVal); else setMarginH(newVal);
            }}>
              <Minus className="h-3 w-3" />
            </Button>
            <Slider 
              value={[currentMarginH]} 
              onValueChange={(v) => { if (isMobile) setDraftMarginH(v[0]); else setMarginH(v[0]); }} 
              min={0} max={5} step={0.5} className="flex-1" 
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary" onClick={() => {
              const newVal = Math.min(5, currentMarginH + 0.5);
              if (isMobile) setDraftMarginH(newVal); else setMarginH(newVal);
            }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer bg-card px-2 py-0.5 rounded-md shadow-sm border border-border/10" htmlFor={isMobile ? "draft-guides" : "guides"}>{t.guides}</Label>
          <Switch id={isMobile ? "draft-guides" : "guides"} checked={currentShowGuides} onCheckedChange={isMobile ? setDraftShowGuides : setShowGuides} className="bg-muted" />
        </div>
      </div>

      {info && (
        <div className="p-3 bg-card/90 rounded-xl border border-border shadow-xl space-y-2">
          <div className="flex items-center gap-2 mb-0.5">
            <Ruler className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{lang === 'es' ? 'Resumen Técnico' : 'Technical Summary'}</span>
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
    <div className="flex flex-col min-h-svh w-full font-body bg-background text-foreground overflow-x-hidden">
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="flex items-center gap-2 lg:gap-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground px-2">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden lg:inline">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-6 h-6 lg:w-8 lg:h-8 relative overflow-hidden rounded-lg shadow-sm bg-white border border-border/10">
              <Image 
                src={logo} 
                alt="Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <h1 className="text-lg lg:text-xl font-headline font-black tracking-tighter text-primary uppercase">
              {t.muralisTitle}<span className="text-accent">.</span>
            </h1>
          </div>
          <Separator orientation="vertical" className="h-8 hidden lg:block" />
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <ThemeToggle />
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button className="hidden lg:flex bg-primary hover:bg-primary/90 text-white font-black gap-2 h-10 px-6 rounded-xl shadow-md transition-all active:scale-95 text-xs" onClick={handleExport} disabled={!image || isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExporting ? "..." : t.export}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <section className={cn(
          "flex-1 relative bg-muted/30 flex flex-col items-center overflow-y-auto lg:overflow-hidden",
          !image ? "justify-start py-8" : "justify-start"
        )}>
          {!image ? (
            <div className="max-w-lg w-full px-6 lg:p-8 animate-fade-in text-center flex flex-col gap-6 lg:gap-8 my-auto">
              <div className="order-1">
                <ImageUploader onImageUpload={handleImageUpload} language={lang} t={t} />
              </div>
              <div className="order-2 space-y-2">
                <h2 className="text-2xl lg:text-3xl font-headline font-black tracking-tighter">{lang === 'es' ? 'Preparar nuevo mural' : 'Prepare new mural'}</h2>
                <p className="text-muted-foreground font-medium text-sm lg:text-base">{lang === 'es' ? 'Sube una imagen de alta resolución para generar tu cuadrícula.' : 'Upload a high-resolution image to generate your grid.'}</p>
              </div>
            </div>
          ) : (
            <>
              {physicalInfo && (
                <div className="absolute top-4 lg:top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-5xl px-4 lg:px-8">
                  <div className="bg-background/80 backdrop-blur-xl border border-primary/20 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] px-4 lg:px-6 py-2 lg:py-3 rounded-2xl flex items-center justify-between pointer-events-auto animate-fade-in">
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
              
              <div className="w-full h-[calc(100svh-3.5rem)] p-4 lg:p-8 flex flex-col pt-16 lg:pt-24 overflow-hidden">
                <div className="flex-1 min-h-0">
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
                    imageWidth={parseFloat(targetWidth)} 
                    imageHeight={parseFloat(targetHeight)} 
                  />
                </div>
                
                <div className="lg:hidden mt-4 pb-4 w-full max-w-xl mx-auto shrink-0">
                  <Button 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black gap-3 rounded-2xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest"
                    onClick={handleExport}
                    disabled={!image || isExporting}
                  >
                    {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {isExporting ? "Generando PDF..." : t.export}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="hidden lg:block w-80 border-l border-border bg-background overflow-y-auto shadow-xl z-10">
          {renderSettings(
            rows, 
            cols, 
            overlap, 
            marginV, 
            marginH,
            paperSize, 
            orientation,
            showGuides,
            targetWidth, targetHeight,
            physicalInfo
          )}
        </aside>
      </main>

      {image && (
        <div className="lg:hidden fixed bottom-6 right-6 z-[100] pointer-events-auto">
          <Sheet open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
            <Button 
              size="icon" 
              className="h-14 w-14 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 border-4 border-white"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuOpenChange(!isMenuOpen);
              }}
            >
              <Settings2 className="h-6 w-6" />
            </Button>
            <SheetContent side="right" className="w-[85%] sm:w-[400px] p-0 bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
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
              </div>

              <div className="flex-1 overflow-y-auto">
                {renderSettings(
                  draftRows, 
                  draftCols, 
                  draftOverlap, 
                  draftMarginV, 
                  draftMarginH,
                  draftPaperSize, 
                  draftOrientation,
                  draftShowGuides,
                  draftTargetWidth, draftTargetHeight,
                  draftInfo,
                  true
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PAPER_DIMENSIONS: Record<string, { width: number; height: number; format: string }> = {
  'Carta': { width: 215.9, height: 279.4, format: 'letter' },
  'A4': { width: 210, height: 297, format: 'a4' },
  'A3': { width: 297, height: 420, format: 'a3' },
  'Oficio (Legal 35.5cm)': { width: 215.9, height: 35.6, format: 'legal' },
  'Folio (33cm)': { width: 215.9, height: 330.2, format: 'folio' },
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
  const [showGuides, setShowGuides] = useState(true);
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = translations[lang];

  const calculateAutoGrid = useCallback((imgW: number, imgH: number, targetRows?: number, targetCols?: number) => {
    const paper = PAPER_DIMENSIONS[paperSize];
    const printableW = paper.width - (marginH * 20);
    const printableH = paper.height - (marginV * 20);
    const overlapMm = overlap * 10;
    const imgAspect = imgW / imgH;
    const effectiveSheetW = printableW - overlapMm;
    const effectiveSheetH = printableH - overlapMm;

    if (targetRows) {
      const totalH_mm = targetRows * effectiveSheetH + overlapMm;
      const totalW_mm = totalH_mm * imgAspect;
      const calculatedCols = Math.max(1, Math.round((totalW_mm - overlapMm) / effectiveSheetW));
      setRows(targetRows);
      setCols(calculatedCols);
    } else if (targetCols) {
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
  }, [paperSize, marginV, marginH, overlap]);

  const physicalInfo = useMemo(() => {
    if (!image) return null;
    const paper = PAPER_DIMENSIONS[paperSize];
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
  }, [image, rows, cols, overlap, marginV, marginH, paperSize]);

  const handleImageUpload = (file: File, url: string) => {
    const img = new Image();
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
      const img = new Image();
      img.src = image.url;
      await new Promise((resolve) => img.onload = resolve);

      const paper = PAPER_DIMENSIONS[paperSize];
      const pdf = new jsPDF({
        orientation: paper.width > paper.height ? 'l' : 'p',
        unit: 'mm',
        format: paper.format as any
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
          pdf.text(`REPROHUB | MURALIS | PANEL ${r+1}-${c+1} | ${paperSize}`, marginH * 10, paper.height - (marginV * 5));
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

  const SettingsContent = () => (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white px-2 py-1 rounded-md shadow-sm border border-border/20">
          <Settings2 className="h-3 w-3" /> {t.gridSettings}
        </h2>
        {image && (
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase gap-2 border-dashed border-primary/30 bg-white" onClick={() => setImage(null)}>
            <ImageIcon className="h-3.5 w-3.5" /> {lang === 'es' ? 'Cambiar' : 'Change'}
          </Button>
        )}
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

        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-muted-foreground bg-white px-2 py-0.5 rounded-md shadow-sm border border-border/10 mb-2 inline-block">{t.paperSize}</Label>
          <Select value={paperSize} onValueChange={(v) => setPaperSize(v)}>
            <SelectTrigger className="h-10 rounded-lg text-xs font-bold bg-white shadow-sm border border-border/10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(PAPER_DIMENSIONS).map(key => <SelectItem key={key} value={key} className="text-xs font-bold">{key}</SelectItem>)}
            </SelectContent>
          </Select>
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
    <div className="flex flex-col h-screen w-full font-body bg-white text-foreground">
      <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary">
              <ChevronLeft className="h-4 w-4" /> Inicio
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Layers className="text-white h-4 w-4" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary">
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
        <div className="flex items-center gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button className="bg-primary hover:bg-primary/90 text-white font-black gap-2 h-10 px-4 md:px-6 rounded-xl shadow-md transition-all active:scale-95 text-xs" onClick={handleExport} disabled={!image || isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            <span className="hidden sm:inline">{isExporting ? "..." : t.export}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <section className={cn(
          "flex-1 relative bg-[#f8f9fa] flex flex-col items-center",
          !image ? "overflow-y-auto justify-start py-8 md:justify-center" : "overflow-hidden justify-center"
        )}>
          {!image ? (
            <div className="max-w-lg w-full px-6 md:p-8 animate-fade-in text-center flex flex-col gap-6 md:gap-8 my-auto">
              <div className="order-2 md:order-1 space-y-2">
                <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tighter">Preparar nuevo mural</h2>
                <p className="text-muted-foreground font-medium text-sm md:text-base">Sube una imagen de alta resolución para generar tu cuadrícula.</p>
              </div>
              <div className="order-1 md:order-2">
                <ImageUploader onImageUpload={handleImageUpload} language={lang} t={t} />
              </div>
            </div>
          ) : (
            <>
              {physicalInfo && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-4xl px-4 md:px-8">
                  <div className="bg-white/80 backdrop-blur-xl border border-primary/20 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] px-4 md:px-8 py-3 rounded-2xl flex items-center justify-between pointer-events-auto animate-fade-in">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex flex-col">
                        <span className="text-[7px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{lang === 'es' ? 'DIMENSIONES IMAGEN' : 'IMAGE DIMENSIONS'}</span>
                        <div className="flex items-center gap-2">
                          <Maximize2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                          <span className="text-sm md:text-base font-black text-foreground">{physicalInfo.imgW} x {physicalInfo.imgH} cm</span>
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-8 opacity-50" />
                      <div className="flex flex-col">
                        <span className="text-[7px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Paneles</span>
                        <div className="flex items-center gap-2">
                          <Layers className="h-3 w-3 md:h-3.5 md:w-3.5 text-accent" />
                          <span className="text-sm md:text-base font-black text-foreground">{rows * cols} <span className="hidden sm:inline">{lang === 'es' ? 'HOJAS' : 'SHEETS'}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t.paperSize}</span>
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{paperSize}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full h-full p-4 md:p-8 flex flex-col pt-24">
                {view === 'editor' ? (
                  <MuralCanvas 
                    imageUrl={image.url} 
                    rows={rows} 
                    cols={cols} 
                    overlap={overlap} 
                    marginV={marginV} 
                    marginH={marginH}
                    paperSize={paperSize} 
                    showGuides={showGuides} 
                    imageWidth={image.width} 
                    imageHeight={image.height} 
                  />
                ) : (
                  <MockupPreview imageUrl={image.url} rows={rows} cols={cols} />
                )}
              </div>
            </>
          )}
        </section>

        {/* Panel de ajustes para Escritorio */}
        <aside className="hidden lg:block w-80 border-l border-border bg-white overflow-y-auto shadow-xl z-10">
          <SettingsContent />
        </aside>

        {/* Botón flotante y panel totalmente transparente para Móvil/Tablet */}
        {image && (
          <div className="lg:hidden absolute bottom-6 right-6 z-50">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 border-4 border-white">
                  <Settings2 className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] sm:w-[400px] p-0 bg-transparent backdrop-blur-none border-l border-white/50 shadow-2xl">
                <div className="h-full overflow-y-auto pt-10 scrollbar-hide">
                  <div className="px-6 pb-4 md:hidden flex bg-white/20 py-4 mb-4 items-center justify-between border-b border-white/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-white/90 px-2 py-0.5 rounded shadow-md border border-primary/20">Vista</span>
                    <div className="flex bg-white/40 p-1.5 rounded-xl shadow-lg border border-white/30 backdrop-blur-md">
                      <Button 
                        onClick={() => setView('editor')} 
                        className={cn(
                          "gap-2 font-bold h-9 rounded-lg text-xs shadow-sm transition-all flex-1",
                          view === 'editor' ? "bg-primary text-white border-primary" : "bg-white/60 text-muted-foreground hover:bg-white border-transparent"
                        )}
                        variant={view === 'editor' ? 'default' : 'ghost'}
                      >
                        {t.editor}
                      </Button>
                      <Button 
                        onClick={() => setView('preview')} 
                        className={cn(
                          "gap-2 font-bold h-9 rounded-lg text-xs shadow-sm transition-all flex-1",
                          view === 'preview' ? "bg-primary text-white border-primary" : "bg-white/60 text-muted-foreground hover:bg-white border-transparent"
                        )}
                        variant={view === 'preview' ? 'default' : 'ghost'}
                      >
                        {t.preview}
                      </Button>
                    </div>
                  </div>
                  <SettingsContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </main>
    </div>
  );
}

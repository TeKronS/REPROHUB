
"use client";

import { useState, useEffect, useCallback } from "react";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { ImageUploader } from "./ImageUploader";
import { MuralCanvas } from "./MuralCanvas";
import { MockupPreview } from "./MockupPreview";
import { 
  Settings2, 
  Layout, 
  FileDown, 
  Undo2, 
  Eye, 
  Settings,
  Scissors,
  Layers,
  Info,
  Loader2,
  Maximize,
  Link2,
  Image as ImageIcon
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
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";

const PAPER_DIMENSIONS: Record<string, { width: number; height: number; format: string }> = {
  'A4': { width: 210, height: 297, format: 'a4' },
  'A3': { width: 297, height: 420, format: 'a3' },
  'Letter': { width: 215.9, height: 279.4, format: 'letter' },
  'Legal': { width: 215.9, height: 355.6, format: 'legal' }
};

export default function MuralisEditor() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const [image, setImage] = useState<{ url: string; file: File; width: number; height: number } | null>(null);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [overlap, setOverlap] = useState(1.5); // cm standard
  const [margins, setMargins] = useState(1); // cm
  const [paperSize, setPaperSize] = useState('A4');
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
    const printableW = paper.width - (margins * 20);
    const printableH = paper.height - (margins * 20);
    const overlapMm = overlap * 10;

    const imgAspect = imgW / imgH;
    const sheetAspect = (printableW - overlapMm) / (printableH - overlapMm);

    if (targetRows) {
      const calculatedCols = Math.max(1, Math.round((imgAspect * targetRows) / sheetAspect));
      setRows(targetRows);
      setCols(calculatedCols);
    } else if (targetCols) {
      const calculatedRows = Math.max(1, Math.round(targetCols / (imgAspect / sheetAspect)));
      setCols(targetCols);
      setRows(calculatedRows);
    } else {
      const initialCols = 3;
      const initialRows = Math.max(1, Math.round(initialCols / (imgAspect / sheetAspect)));
      setCols(initialCols);
      setRows(initialRows);
    }
  }, [paperSize, margins, overlap]);

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

      const printableW = paper.width - (margins * 20);
      const printableH = paper.height - (margins * 20);
      const overlapMm = overlap * 10;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas fail");

      const totalW_mm = (cols * printableW) - ((cols - 1) * overlapMm);
      const totalH_mm = (rows * printableH) - ((rows - 1) * overlapMm);
      const pxPerMmX = img.width / totalW_mm;
      const pxPerMmY = img.height / totalH_mm;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r > 0 || c > 0) pdf.addPage();

          const sx = c * (printableW - overlapMm) * pxPerMmX;
          const sy = r * (printableH - overlapMm) * pxPerMmY;
          const sw = printableW * pxPerMmX;
          const sh = printableH * pxPerMmY;

          canvas.width = sw;
          canvas.height = sh;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, sw, sh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(dataUrl, 'JPEG', margins * 10, margins * 10, printableW, printableH);

          pdf.setDrawColor(200);
          pdf.setLineDashPattern([2, 2], 0);
          if (c < cols - 1) {
            const gx = (margins * 10) + (printableW - overlapMm);
            pdf.line(gx, margins * 10, gx, margins * 10 + printableH);
          }
          if (r < rows - 1) {
            const gy = (margins * 10) + (printableH - overlapMm);
            pdf.line(margins * 10, gy, margins * 10 + printableW, gy);
          }

          pdf.setFontSize(7);
          pdf.setTextColor(150);
          pdf.text(`MURALIS | PANEL ${r+1}-${c+1} | ${paperSize} | SOLAPE ${overlap}cm`, margins * 10, paper.height - (margins * 5));
        }
      }

      pdf.save(`muralis-grid-${Date.now()}.pdf`);
      toast({ title: t.export, description: "PDF generado localmente con éxito." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen w-full font-body bg-white text-foreground">
      <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Layers className="text-white h-5 w-5" />
            </div>
            <h1 className="text-2xl font-headline font-black tracking-tighter text-primary">
              MURALIS<span className="text-accent">.</span>
            </h1>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex bg-muted/50 p-1 rounded-xl">
            <Button 
              variant={view === 'editor' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('editor')}
              className="gap-2 font-bold h-9 rounded-lg"
            >
              <Layout className="h-4 w-4" /> {t.editor}
            </Button>
            <Button 
              variant={view === 'preview' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('preview')}
              className="gap-2 font-bold h-9 rounded-lg"
            >
              <Eye className="h-4 w-4" /> {t.preview}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-black gap-2 h-11 px-8 rounded-xl" 
            onClick={handleExport}
            disabled={!image || isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-5 w-5" />}
            {isExporting ? "..." : t.export}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 relative bg-[#fcfcfc] overflow-hidden flex items-center justify-center">
          {!image ? (
            <div className="max-w-lg w-full p-8 animate-fade-in">
              <ImageUploader onImageUpload={handleImageUpload} language={lang} t={t} />
            </div>
          ) : (
            <div className="w-full h-full p-4 md:p-8">
              {view === 'editor' ? (
                <MuralCanvas 
                  imageUrl={image.url} 
                  rows={rows} 
                  cols={cols} 
                  overlap={overlap} 
                  margins={margins}
                  paperSize={paperSize}
                  showGuides={showGuides} 
                />
              ) : (
                <MockupPreview imageUrl={image.url} rows={rows} cols={cols} />
              )}
            </div>
          )}
        </section>

        <aside className="w-80 border-l border-border bg-white overflow-y-auto">
          <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-3 w-3" /> {t.gridSettings}
              </h2>
              {image && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[10px] font-bold uppercase gap-2 border-dashed border-primary/30 hover:bg-primary/5 hover:text-primary transition-all" 
                  onClick={() => setImage(null)}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {lang === 'es' ? 'Cambiar' : 'Change'}
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/10">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3 w-3 text-primary" />
                  <Label className="text-[10px] font-black uppercase cursor-pointer" htmlFor="lock-aspect">Proporción Bloqueada</Label>
                </div>
                <Switch id="lock-aspect" checked={lockAspect} onCheckedChange={setLockAspect} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.rows}</Label>
                  <span className="text-xs font-black text-primary">{rows}</span>
                </div>
                <Slider 
                  value={[rows]} 
                  onValueChange={(v) => lockAspect && image ? calculateAutoGrid(image.width, image.height, v[0]) : setRows(v[0])} 
                  min={1} max={15} step={1} 
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.columns}</Label>
                  <span className="text-xs font-black text-primary">{cols}</span>
                </div>
                <Slider 
                  value={[cols]} 
                  onValueChange={(v) => lockAspect && image ? calculateAutoGrid(image.width, image.height, undefined, v[0]) : setCols(v[0])} 
                  min={1} max={15} step={1} 
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.paperSize}</Label>
                <Select value={paperSize} onValueChange={(v) => { setPaperSize(v); if(image) calculateAutoGrid(image.width, image.height); }}>
                  <SelectTrigger className="h-10 rounded-lg text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAPER_DIMENSIONS).map(key => (
                      <SelectItem key={key} value={key} className="text-xs font-bold">{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Scissors className="h-3 w-3" /> {t.overlap}
                  </Label>
                  <span className="text-xs font-black text-accent">{overlap} cm</span>
                </div>
                <Slider value={[overlap]} onValueChange={(v) => setOverlap(v[0])} min={0} max={5} step={0.1} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Maximize className="h-3 w-3" /> {t.margins}
                  </Label>
                  <span className="text-xs font-black text-primary">{margins} cm</span>
                </div>
                <Slider value={[margins]} onValueChange={(v) => setMargins(v[0])} min={0} max={3} step={0.5} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer" htmlFor="guides">{t.guides}</Label>
                <Switch id="guides" checked={showGuides} onCheckedChange={setShowGuides} />
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">{t.totalPanels}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{rows * cols}</span>
                <span className="text-[10px] text-muted-foreground font-black uppercase">Unidades</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

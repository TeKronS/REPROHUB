"use client";

import { useState } from "react";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { ImageUploader } from "./ImageUploader";
import { MuralCanvas } from "./MuralCanvas";
import { MockupPreview } from "./MockupPreview";
import { 
  Settings2, 
  Grid3X3, 
  Layout, 
  FileDown, 
  Undo2, 
  Eye, 
  Settings,
  Scissors,
  Layers,
  Info,
  Loader2,
  Maximize
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
  const [lang, setLang] = useState<Language>('es');
  const [image, setImage] = useState<{ url: string; file: File } | null>(null);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [overlap, setOverlap] = useState(1.5); // cm
  const [margins, setMargins] = useState(1); // cm
  const [paperSize, setPaperSize] = useState('A4');
  const [showGuides, setShowGuides] = useState(true);
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const t = translations[lang];

  const handleImageUpload = (file: File, url: string) => {
    setImage({ file, url });
  };

  const handleExport = async () => {
    if (!image) return;
    
    setIsExporting(true);
    try {
      const img = new Image();
      img.src = image.url;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const paper = PAPER_DIMENSIONS[paperSize];
      const isLandscape = img.width > img.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'l' : 'p',
        unit: 'mm',
        format: paper.format as any
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize canvas");

      // Dimensions of the printable area
      const printW = paper.width - (margins * 20);
      const printH = paper.height - (margins * 20);

      // Core slice size on the original image
      const sw = img.width / cols;
      const sh = img.height / rows;

      // Ratio of pixels to mm in the final print (per panel)
      const pxPerMmW = sw / printW;
      const pxPerMmH = sh / printH;

      // Overlap in pixels
      const overlapPxW = overlap * 10 * pxPerMmW;
      const overlapPxH = overlap * 10 * pxPerMmH;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r > 0 || c > 0) pdf.addPage();

          // Source coordinates including bleed for overlap
          const sx = Math.max(0, (c * sw) - (c > 0 ? overlapPxW : 0));
          const sy = Math.max(0, (r * sh) - (r > 0 ? overlapPxH : 0));
          
          // Source dimensions including extra area for overlap
          let curSw = sw + (c > 0 ? overlapPxW : 0) + (c < cols - 1 ? overlapPxW : 0);
          let curSh = sh + (r > 0 ? overlapPxH : 0) + (r < rows - 1 ? overlapPxH : 0);

          // Final constraints
          const finalSw = Math.min(curSw, img.width - sx);
          const finalSh = Math.min(curSh, img.height - sy);

          canvas.width = finalSw;
          canvas.height = finalSh;
          ctx.drawImage(img, sx, sy, finalSw, finalSh, 0, 0, finalSw, finalSh);

          const sliceData = canvas.toDataURL('image/jpeg', 0.95);
          
          // Draw image centered in the printable area
          pdf.addImage(sliceData, 'JPEG', margins * 10, margins * 10, printW, printH);

          // Draw Cut/Overlap Guides
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineDashPattern([2, 2], 0);
          
          // Vertical guide (left side if not first column)
          if (c > 0) {
            pdf.line(margins * 10 + (overlap * 10), margins * 10, margins * 10 + (overlap * 10), margins * 10 + printH);
          }
          // Horizontal guide (top side if not first row)
          if (r > 0) {
            pdf.line(margins * 10, margins * 10 + (overlap * 10), margins * 10 + printW, margins * 10 + (overlap * 10));
          }

          // Meta info
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(`PANEL: ${r + 1}-${c + 1} | SOLAPE: ${overlap}cm | MURALIS.`, 10, paper.height - 5);
        }
      }

      pdf.save(`muralis-${Date.now()}.pdf`);
      toast({
        title: lang === 'es' ? "¡Éxito!" : "Success!",
        description: lang === 'es' ? "PDF generado con solapamiento corregido." : "PDF generated with corrected overlap.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: lang === 'es' ? "Error en la generación local." : "Local generation error.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full font-body bg-[#fafafa] text-foreground">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Layers className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary">
              MURALIS<span className="text-accent">.</span>
            </h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <Button 
              variant={view === 'editor' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('editor')}
              className="gap-2 font-semibold h-8"
            >
              <Layout className="h-4 w-4" /> {t.editor}
            </Button>
            <Button 
              variant={view === 'preview' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('preview')}
              className="gap-2 font-semibold h-8"
            >
              <Eye className="h-4 w-4" /> {t.preview}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button 
            variant="default" 
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-6 shadow-xl shadow-primary/20 transition-all hover:scale-105" 
            onClick={handleExport}
            disabled={!image || isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExporting ? (lang === 'es' ? "Generando..." : "Generating...") : t.export}
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Central Canvas Area */}
        <section className="flex-1 relative bg-[#f0f0f0] overflow-hidden flex items-center justify-center">
          {!image ? (
            <div className="max-w-md w-full p-6 animate-fade-in">
              <ImageUploader onImageUpload={handleImageUpload} language={lang} t={t} />
            </div>
          ) : (
            <>
              {view === 'editor' ? (
                <MuralCanvas 
                  imageUrl={image.url} 
                  rows={rows} 
                  cols={cols} 
                  overlap={overlap} 
                  showGuides={showGuides} 
                />
              ) : (
                <div className="w-full h-full p-12 animate-scale-in">
                  <MockupPreview imageUrl={image.url} rows={rows} cols={cols} />
                </div>
              )}
            </>
          )}
        </section>

        {/* Right Adjustment Panel */}
        <aside className="w-80 border-l border-border bg-white overflow-y-auto custom-scrollbar shadow-2xl z-40">
          <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" /> {t.gridSettings}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setImage(null)}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Grid Dimensions */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">{t.rows}</Label>
                  <span className="text-xs font-mono text-primary font-bold">{rows}</span>
                </div>
                <Slider 
                  value={[rows]} 
                  onValueChange={(v) => setRows(v[0])} 
                  min={1} 
                  max={15} 
                  step={1} 
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">{t.columns}</Label>
                  <span className="text-xs font-mono text-primary font-bold">{cols}</span>
                </div>
                <Slider 
                  value={[cols]} 
                  onValueChange={(v) => setCols(v[0])} 
                  min={1} 
                  max={15} 
                  step={1} 
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Physical Adjustments */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">{t.paperSize}</Label>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </div>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger className="bg-white border-border h-9 text-xs">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="A3">A3 (297 x 420 mm)</SelectItem>
                    <SelectItem value="Letter">Carta (8.5 x 11 in)</SelectItem>
                    <SelectItem value="Legal">Oficio (8.5 x 14 in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Scissors className="h-3 w-3" /> {t.overlap}
                  </Label>
                  <span className="text-xs font-mono text-accent font-bold">{overlap} cm</span>
                </div>
                <Slider 
                  value={[overlap]} 
                  onValueChange={(v) => setOverlap(v[0])} 
                  min={0} 
                  max={5} 
                  step={0.1} 
                />
                <p className="text-[10px] text-muted-foreground italic">
                  * Área extra para unir los paneles.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Maximize className="h-3 w-3" /> {t.margins}
                  </Label>
                  <span className="text-xs font-mono text-primary font-bold">{margins} cm</span>
                </div>
                <Slider 
                  value={[margins]} 
                  onValueChange={(v) => setMargins(v[0])} 
                  min={0} 
                  max={3} 
                  step={0.5} 
                />
              </div>

              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase text-muted-foreground cursor-pointer" htmlFor="guides-switch">
                    {t.guides}
                  </Label>
                  <Switch 
                    id="guides-switch" 
                    checked={showGuides} 
                    onCheckedChange={setShowGuides} 
                  />
                </div>
              </div>
            </div>

            {/* Panel Stats Card */}
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
              <h3 className="text-[10px] font-headline font-bold text-primary uppercase tracking-widest">{t.totalPanels}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-headline font-black text-primary">{rows * cols}</span>
                <span className="text-xs text-muted-foreground font-mono">hojas</span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {lang === 'es' ? 'Cada panel incluye un solapamiento de ' : 'Each panel includes an overlap of '} 
                <span className="text-primary font-bold">{overlap}cm</span>
              </p>
            </div>
          </div>

          <div className="p-6 mt-auto">
             <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary hover:text-white font-bold uppercase text-xs tracking-widest py-6 rounded-xl transition-all" onClick={() => setImage(null)}>
              {t.reset}
            </Button>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 border-t border-border bg-white px-4 flex items-center justify-between text-[10px] text-muted-foreground font-mono uppercase tracking-widest z-50">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 font-semibold text-primary"><Settings className="h-3 w-3" /> MURALIS ENGINE V3.0</span>
          <span className="flex items-center gap-1 opacity-50"><Grid3X3 className="h-3 w-3" /> Modo Local / Privado</span>
        </div>
        <div className="flex gap-4">
          <span>{paperSize} @ 300 DPI</span>
          <span className="text-primary font-bold">PROCESADO LOCAL: OK</span>
        </div>
      </footer>
    </div>
  );
}

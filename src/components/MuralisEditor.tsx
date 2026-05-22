
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
  Loader2
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
  const [overlap, setOverlap] = useState(2);
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
      const pdf = new jsPDF({
        orientation: paper.width > paper.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: paper.format as any
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize canvas");

      // We want to slice the image into rows x cols parts
      // Sw, Sh are dimensions of one slice on the original image
      const sw = img.width / cols;
      const sh = img.height / rows;

      // The overlap in pixels relative to the image
      // Assuming each panel is roughly the paper size for the overlap calculation
      const pixelOverlapW = (overlap / paper.width) * sw;
      const pixelOverlapH = (overlap / paper.height) * sh;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r > 0 || c > 0) pdf.addPage();

          // Calculate source coordinates with overlap
          // We take a bit more from the neighbors
          const sx = Math.max(0, (c * sw) - (c > 0 ? pixelOverlapW : 0));
          const sy = Math.max(0, (r * sh) - (r > 0 ? pixelOverlapH : 0));
          
          // Width and height of the slice including overlap
          let curSw = sw + (c > 0 ? pixelOverlapW : 0) + (c < cols - 1 ? pixelOverlapW : 0);
          let curSh = sh + (r > 0 ? pixelOverlapH : 0) + (r < rows - 1 ? pixelOverlapH : 0);

          // Constrain to image bounds
          const finalSw = Math.min(curSw, img.width - sx);
          const finalSh = Math.min(curSh, img.height - sy);

          canvas.width = finalSw;
          canvas.height = finalSh;
          ctx.drawImage(img, sx, sy, finalSw, finalSh, 0, 0, finalSw, finalSh);

          const sliceData = canvas.toDataURL('image/jpeg', 0.95);
          
          // Fit image to page (maintaining aspect ratio or filling?)
          // For a mural, we usually fill the page to maximize size
          pdf.addImage(sliceData, 'JPEG', 0, 0, paper.width, paper.height);

          // Add panel number
          pdf.setFontSize(10);
          pdf.setTextColor(150);
          pdf.text(`Panel: ${r + 1}-${c + 1} | Muralis.`, 10, paper.height - 10);
        }
      }

      pdf.save(`mural-${Date.now()}.pdf`);
      toast({
        title: lang === 'es' ? "¡Éxito!" : "Success!",
        description: lang === 'es' ? "Tu PDF ha sido generado correctamente." : "Your PDF has been generated successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: lang === 'es' ? "Hubo un error al generar el PDF." : "There was an error generating the PDF.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full font-body bg-background text-foreground">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Layers className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary">
              MURALIS<span className="text-accent">.</span>
            </h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex gap-1">
            <Button 
              variant={view === 'editor' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('editor')}
              className="gap-2 font-semibold"
            >
              <Layout className="h-4 w-4" /> {t.editor}
            </Button>
            <Button 
              variant={view === 'preview' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('preview')}
              className="gap-2 font-semibold"
            >
              <Eye className="h-4 w-4" /> {t.preview}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Button 
            variant="default" 
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-6 shadow-md" 
            onClick={handleExport}
            disabled={!image || isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExporting ? (lang === 'es' ? "Procesando..." : "Processing...") : t.export}
          </Button>
        </div>
      </header>

      {/* Main Creative Suite Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Central Canvas Area */}
        <section className="flex-1 relative bg-muted/20 overflow-hidden flex items-center justify-center">
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
        <aside className="w-80 border-l border-border bg-white overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" /> {t.gridSettings}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setImage(null)}>
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
                  max={20} 
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
                  max={20} 
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
                  <SelectTrigger className="bg-white border-border">
                    <SelectValue placeholder="Seleccionar tamaño" />
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
                  <span className="text-xs font-mono text-accent font-bold">{overlap}cm</span>
                </div>
                <Slider 
                  value={[overlap]} 
                  onValueChange={(v) => setOverlap(v[0])} 
                  min={0} 
                  max={10} 
                  step={0.5} 
                />
              </div>

              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold cursor-pointer text-foreground" htmlFor="guides-switch">
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

            {/* Statistics Card */}
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
              <h3 className="text-xs font-headline font-bold text-primary uppercase">{t.totalPanels}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-headline font-black text-primary">{rows * cols}</span>
                <span className="text-xs text-muted-foreground font-mono">uds</span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {lang === 'es' ? 'Tamaño de pared estimado:' : 'Estimated wall size:'} <br/>
                <span className="text-primary font-bold">~{Math.round(cols * (PAPER_DIMENSIONS[paperSize]?.width || 21))} x {Math.round(rows * (PAPER_DIMENSIONS[paperSize]?.height || 29))} mm</span>
              </p>
            </div>
          </div>

          <div className="p-6 mt-auto">
             <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary hover:text-white font-bold uppercase text-xs tracking-widest py-6" onClick={() => setImage(null)}>
              {t.reset}
            </Button>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 border-t border-border bg-white px-4 flex items-center justify-between text-[10px] text-muted-foreground font-mono uppercase tracking-widest z-50 shadow-inner">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 font-semibold"><Settings className="h-3 w-3" /> Sistema: Online (Local)</span>
          <span className="flex items-center gap-1"><Grid3X3 className="h-3 w-3" /> Motor: V2.5 Professional</span>
        </div>
        <div className="flex gap-4">
          <span>Resolución: 300 DPI</span>
          <span className="text-primary font-bold">Alta Precisión: ON</span>
        </div>
      </footer>
    </div>
  );
}

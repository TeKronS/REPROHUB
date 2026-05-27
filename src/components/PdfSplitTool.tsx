"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  Scissors, 
  Loader2, 
  ShieldCheck,
  Zap,
  FileText,
  Download,
  FileType,
  Trash2,
  CheckCircle2,
  Undo2,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import logo from "@/app/icono.png";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface PageThumbnail {
  index: number;
  url: string;
}

export default function PdfSplitTool() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [isSplitting, setIsSplitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [outputName, setOutputName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  }, [mounted]);

  useEffect(() => {
    if (totalPages > 0) {
      const indices = Array.from(selectedPages).sort((a, b) => a - b);
      if (indices.length === 0) {
        setPageRange("");
        return;
      }

      const ranges: string[] = [];
      let start = indices[0];
      let end = indices[0];

      for (let i = 1; i <= indices.length; i++) {
        if (i < indices.length && indices[i] === end + 1) {
          end = indices[i];
        } else {
          if (start === end) {
            ranges.push(`${start + 1}`);
          } else {
            ranges.push(`${start + 1}-${end + 1}`);
          }
          if (i < indices.length) {
            start = indices[i];
            end = indices[i];
          }
        }
      }
      setPageRange(ranges.join(", "));
    }
  }, [selectedPages, totalPages]);

  const generateThumbnails = async (file: File) => {
    if (!file || file.size === 0) return;
    
    setIsLoadingPages(true);
    setThumbnails([]);
    setSelectedPages(new Set());
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: true
      });
      
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);
      
      const newThumbnails: PageThumbnail[] = [];
      const initialSelected = new Set<number>();

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          newThumbnails.push({
            index: i - 1,
            url: canvas.toDataURL()
          });
        }
        initialSelected.add(i - 1);
      }
      
      setThumbnails(newThumbnails);
      setSelectedPages(initialSelected);
    } catch (error: any) {
      console.error("Error generating thumbnails:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudieron generar las vistas previas del PDF." 
      });
      setPdfFile(null);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'))) {
      setPdfFile(file);
      setOutputName(file.name.replace('.pdf', '') + '-Split');
      generateThumbnails(file);
    } else if (file) {
      toast({ variant: "destructive", title: "Error", description: t.pdfFormatOnly });
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
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'))) {
      setPdfFile(file);
      setOutputName(file.name.replace('.pdf', '') + '-Split');
      generateThumbnails(file);
    }
  };

  const togglePageSelection = (index: number) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedPages(newSelection);
  };

  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 0; i < totalPages; i++) all.add(i);
    setSelectedPages(all);
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    if (!rangeStr.trim()) return [];
    
    const parts = rangeStr.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(p => p.trim());
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, maxPages));
          const e = Math.max(1, Math.min(end, maxPages));
          for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
            pages.add(i - 1);
          }
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page)) {
          const p = Math.max(1, Math.min(page, maxPages));
          pages.add(p - 1);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const splitPdf = async () => {
    if (!pdfFile || selectedPages.size === 0) {
      toast({ variant: "destructive", title: "Atención", description: t.invalidRange });
      return;
    }

    setIsSplitting(true);
    try {
      const fileBuffer = await pdfFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(fileBuffer);
      const indices = Array.from(selectedPages).sort((a, b) => a - b);

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(originalPdf, indices);
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = outputName.trim() 
        ? (outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`)
        : `Split-${pdfFile.name}`;
        
      link.download = fileName;
      link.click();
      
      toast({ title: "¡Éxito!", description: "Páginas extraídas correctamente." });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "No se pudo procesar el PDF." 
      });
    } finally {
      setIsSplitting(false);
    }
  };

  if (!mounted) return null;

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.localProcessing}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
          La extracción se realiza directamente en tu navegador. Tu información nunca viaja a servidores externos.
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
            <FileType className="h-3 w-3" /> Rango de Páginas
          </Label>
          <Input 
            placeholder={t.pageRangePlaceholder}
            value={pageRange}
            onChange={(e) => {
              setPageRange(e.target.value);
              const indices = parsePageRange(e.target.value, totalPages);
              setSelectedPages(new Set(indices));
            }}
            className="h-10 border-2 focus:border-rose-500 font-bold text-sm rounded-xl"
          />
          <p className="text-[8px] text-muted-foreground font-bold uppercase">Usa el mouse para seleccionar páginas o escribe aquí.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            {t.outputFileName}
          </Label>
          <Input 
            placeholder={t.outputFileNamePlaceholder}
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            className="h-10 border-2 focus:border-rose-500 font-bold text-sm rounded-xl"
          />
        </div>

        <div className="bg-rose-50 dark:bg-rose-500/10 p-5 rounded-[2rem] border border-rose-100 dark:border-rose-500/20 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Páginas a extraer</span>
            <span className="text-xs font-black text-rose-600">{selectedPages.size}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Páginas totales</span>
            <span className="text-xs font-black text-foreground">{totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background font-body overflow-hidden transition-colors duration-300">
      <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground px-2">
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden sm:inline text-xs">Inicio</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative rounded-lg overflow-hidden border bg-white dark:bg-slate-200">
              <Image src={logo} alt="Logo" fill className="object-contain" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter text-rose-600 uppercase">{t.splitTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSelector language={lang} setLanguage={setLang} />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/30 flex flex-col items-center">
          <div className="w-full max-w-6xl space-y-6">
            {!pdfFile ? (
              <div className="max-w-2xl mx-auto w-full pt-12">
                <div className="text-center space-y-2 mb-8">
                  <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-200/20 font-black px-3 py-1">
                    <Zap className="h-3 w-3 mr-2" /> {t.localProcessing}
                  </Badge>
                  <h2 className="text-3xl font-headline font-black tracking-tighter text-foreground uppercase">
                    {t.splitSubtitle}
                  </h2>
                </div>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "w-full aspect-video min-h-[300px] bg-card border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all group shadow-xl",
                    isDragging ? "border-rose-500 bg-rose-500/10 scale-[1.02]" : "border-border hover:border-rose-300"
                  )}
                >
                  <div className="p-8 bg-rose-50 dark:bg-rose-500/10 rounded-full group-hover:scale-110 transition-transform">
                    <Scissors className="h-16 w-16 text-rose-500" />
                  </div>
                  <h3 className="mt-6 text-xl font-headline font-black text-foreground uppercase tracking-tight">Seleccionar PDF</h3>
                  <p className="mt-2 text-muted-foreground font-medium">{t.dragDrop}</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500 pb-32">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8 bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-500/20 rounded-2xl">
                      <FileText className="h-8 w-8 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-foreground truncate max-w-[200px] sm:max-w-[300px]">{pdfFile.name}</h4>
                      <p className="text-xs font-bold text-muted-foreground uppercase">
                        {totalPages} Páginas • {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl font-bold h-10 px-4 text-[10px] sm:text-xs" onClick={selectAll}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 sm:mr-2 text-rose-500" /> <span className="hidden xs:inline">Seleccionar Todo</span><span className="xs:hidden">Todo</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl font-bold h-10 px-4 text-[10px] sm:text-xs" onClick={deselectAll}>
                      <Undo2 className="h-3.5 w-3.5 mr-1 sm:mr-2 text-slate-400" /> <span className="hidden xs:inline">Limpiar</span><span className="xs:hidden">Nada</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPdfFile(null)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {isLoadingPages ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-12 w-12 text-rose-500 animate-spin" />
                    <p className="font-black text-rose-600 uppercase tracking-widest text-xs">Generando miniaturas...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {thumbnails.map((thumb) => {
                      const isSelected = selectedPages.has(thumb.index);
                      return (
                        <div 
                          key={thumb.index}
                          className="relative group animate-fade-in"
                        >
                          <div 
                            onClick={() => togglePageSelection(thumb.index)}
                            className={cn(
                              "relative aspect-[3/4] bg-white dark:bg-slate-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-4 shadow-sm",
                              isSelected 
                                ? "border-rose-500 ring-4 ring-rose-500/10 scale-[1.02]" 
                                : "border-border hover:border-rose-200"
                            )}
                          >
                            <img src={thumb.url} alt={`Página ${thumb.index + 1}`} className="w-full h-full object-cover" />
                            
                            <div className={cn(
                              "absolute inset-0 transition-opacity duration-300 flex items-center justify-center",
                              isSelected ? "bg-rose-500/10" : "bg-black/0 group-hover:bg-black/5"
                            )}>
                              {isSelected && (
                                <div className="bg-rose-500 text-white rounded-full p-1.5 shadow-lg transform scale-110">
                                  <CheckCircle2 className="h-5 w-5" />
                                </div>
                              )}
                            </div>

                            <div className={cn(
                              "absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tighter shadow-sm",
                              isSelected ? "bg-rose-500 text-white" : "bg-background text-foreground"
                            )}>
                              Pág. {thumb.index + 1}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:flex w-80 bg-card border-l border-border flex-col shrink-0 shadow-2xl z-20">
          <div className="flex-1 overflow-y-auto p-8">
            {renderSettingsContent()}
          </div>

          <div className="p-8 border-t bg-muted/50">
            <Button 
              className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-500/20 uppercase tracking-widest text-xs gap-3 transition-all active:scale-95"
              onClick={splitPdf}
              disabled={!pdfFile || selectedPages.size === 0 || isSplitting}
            >
              {isSplitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {isSplitting ? t.splitting : t.splitAction}
            </Button>
          </div>
        </aside>

        {pdfFile && (
          <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 flex gap-3 pointer-events-auto">
            <div className="flex-1 bg-card/90 backdrop-blur-md p-2 rounded-2xl border border-border shadow-2xl flex items-center justify-between">
              <div className="px-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase block">Extraer</span>
                <span className="text-sm font-black text-rose-600">{selectedPages.size} págs.</span>
              </div>
              <Button 
                className="h-11 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl px-6 uppercase tracking-widest text-xs gap-2"
                onClick={splitPdf}
                disabled={selectedPages.size === 0 || isSplitting}
              >
                {isSplitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isSplitting ? "..." : "Separar"}
              </Button>
            </div>
            
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <Button 
                size="icon" 
                className="h-14 w-14 shrink-0 rounded-full shadow-2xl bg-slate-800 text-white hover:bg-slate-900 transition-all active:scale-95 border-4 border-white"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
              >
                <Settings2 className="h-6 w-6" />
              </Button>
              <SheetContent side="right" className="w-[85%] sm:w-[350px] p-6 bg-card backdrop-blur-xl shadow-2xl overflow-y-auto">
                <SheetHeader className="sr-only">
                  <SheetTitle>Ajustes de PDF</SheetTitle>
                  <SheetDescription>Configura el rango y nombre de archivo</SheetDescription>
                </SheetHeader>
                {renderSettingsContent()}
              </SheetContent>
            </Sheet>
          </div>
        )}
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="application/pdf" 
        onChange={handleFileSelect} 
        className="hidden" 
      />
    </div>
  );
}

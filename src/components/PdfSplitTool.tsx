
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  Scissors, 
  Loader2, 
  X,
  ShieldCheck,
  Zap,
  FileText,
  Download,
  AlertCircle,
  FileType
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { PDFDocument } from "pdf-lib";
import logo from "@/app/icono.png";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'))) {
      setPdfFile(file);
      setOutputName(file.name.replace('.pdf', '') + '-Split');
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
    } else if (file) {
      toast({ variant: "destructive", title: "Error", description: t.pdfFormatOnly });
    }
  };

  const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, maxPages));
          const e = Math.max(1, Math.min(end, maxPages));
          for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
            pages.add(i - 1); // 0-indexed for pdf-lib
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
    if (!pdfFile || !pageRange.trim()) {
      toast({ variant: "destructive", title: "Atención", description: t.invalidRange });
      return;
    }

    setIsSplitting(true);
    try {
      const fileBuffer = await pdfFile.arrayBuffer();
      const originalPdf = await PDFDocument.load(fileBuffer);
      const maxPages = originalPdf.getPageCount();

      const selectedPageIndices = parsePageRange(pageRange, maxPages);

      if (selectedPageIndices.length === 0) {
        throw new Error(t.invalidRange);
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(originalPdf, selectedPageIndices);
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
            <h1 className="text-xl font-headline font-black tracking-tighter text-rose-600 uppercase">{t.splitTitle}</h1>
          </div>
        </div>
        <LanguageSelector language={lang} setLanguage={setLang} />
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-12 bg-slate-100/50 flex flex-col items-center">
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center space-y-2 mb-8">
              <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-200/20 font-black px-3 py-1">
                <Zap className="h-3 w-3 mr-2" /> {t.localProcessing}
              </Badge>
              <h2 className="text-3xl font-headline font-black tracking-tighter text-slate-900 uppercase">
                {t.splitSubtitle}
              </h2>
            </div>

            {!pdfFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full aspect-video min-h-[300px] bg-white border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all group shadow-xl",
                  isDragging ? "border-rose-500 bg-rose-50/50 scale-[1.02]" : "border-rose-100 hover:border-rose-300"
                )}
              >
                <div className="p-8 bg-rose-50 rounded-full group-hover:scale-110 transition-transform">
                  <Scissors className="h-16 w-16 text-rose-500" />
                </div>
                <h3 className="mt-6 text-xl font-headline font-black text-slate-800 uppercase tracking-tight">Seleccionar PDF</h3>
                <p className="mt-2 text-slate-500 font-medium">{t.dragDrop}</p>
                <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleFileSelect} className="hidden" />
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500 pb-32">
                <Card className="p-6 bg-white border-2 border-rose-100 rounded-3xl shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-rose-50 rounded-2xl">
                    <FileText className="h-10 w-10 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-800 truncate">{pdfFile.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full text-slate-400 hover:text-destructive"
                    onClick={() => {
                      setPdfFile(null);
                      setPageRange("");
                    }}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </Card>

                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        {t.pageRange}
                      </Label>
                      <Input 
                        placeholder={t.pageRangePlaceholder}
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value)}
                        className="h-12 border-2 focus:border-rose-500 font-black text-lg rounded-2xl px-6"
                      />
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                        Separa por comas o usa guiones para rangos.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        {t.outputFileName}
                      </Label>
                      <Input 
                        placeholder={t.outputFileNamePlaceholder}
                        value={outputName}
                        onChange={(e) => setOutputName(e.target.value)}
                        className="h-10 border-2 focus:border-rose-500 font-bold text-sm rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">¿Cómo funciona?</p>
                      <p className="text-xs text-blue-600/80 font-medium leading-relaxed">
                        Ingresa los números de las páginas que quieres conservar. Por ejemplo, "1, 3-5, 8" creará un nuevo PDF con las páginas 1, 3, 4, 5 y 8 del original.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex w-80 bg-white border-l border-border flex-col shrink-0 shadow-2xl z-20 p-8">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.localProcessing}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                La extracción se realiza directamente en tu navegador. Tu información nunca viaja a servidores externos, garantizando la seguridad de tus documentos.
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-rose-500">
                <FileType className="h-5 w-5" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Formato de Salida</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                El archivo generado será un PDF estándar compatible con todos los visores y dispositivos.
              </p>
            </div>
          </div>

          <div className="pt-8">
            <Button 
              className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-500/20 uppercase tracking-widest text-xs gap-3 transition-all active:scale-95"
              onClick={splitPdf}
              disabled={!pdfFile || !pageRange.trim() || isSplitting}
            >
              {isSplitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {isSplitting ? t.splitting : t.splitAction}
            </Button>
          </div>
        </aside>

        {/* Mobile Fixed Action Bar */}
        {pdfFile && (
          <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10">
            <Button 
              className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-2xl uppercase tracking-widest text-sm gap-3 border-4 border-white/10"
              onClick={splitPdf}
              disabled={!pdfFile || !pageRange.trim() || isSplitting}
            >
              {isSplitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {isSplitting ? t.splitting : t.splitAction}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

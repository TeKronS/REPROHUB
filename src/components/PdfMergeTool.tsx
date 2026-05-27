"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  FileStack, 
  Loader2, 
  X,
  ShieldCheck,
  Zap,
  ArrowUp,
  ArrowDown,
  Trash2,
  FilePlus,
  Download,
  AlertCircle,
  Copy,
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
import { ThemeToggle } from "./ThemeToggle";

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function PdfMergeTool() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [outputName, setOutputName] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const processFiles = (newFiles: FileList | File[]) => {
    const pdfFiles: PdfFile[] = Array.from(newFiles)
      .filter(file => {
        const isPdfType = file.type === "application/pdf";
        const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
        return isPdfType || isPdfExt;
      })
      .map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size
      }));

    if (pdfFiles.length === 0) {
      toast({ variant: "destructive", title: "Error", description: t.pdfFormatOnly });
      return;
    }

    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
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
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;

    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      toast({ title: "Atención", description: "Selecciona al menos 2 archivos para combinar." });
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const fileObj of files) {
        const fileArrayBuffer = await fileObj.file.arrayBuffer();
        const uint8Array = new Uint8Array(fileArrayBuffer);
        const header = String.fromCharCode(...uint8Array.slice(0, 5));
        
        if (!header.startsWith('%PDF-')) {
          throw new Error(`El archivo "${fileObj.name}" no parece ser un PDF válido.`);
        }

        const pdf = await PDFDocument.load(uint8Array);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = outputName.trim() 
        ? (outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`)
        : `MultiPrintTools-Merged-${Date.now()}.pdf`;
        
      link.download = fileName;
      link.click();
      
      toast({ title: "¡Éxito!", description: "Archivos combinados correctamente." });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Error de combinación", 
        description: error.message || "No se pudieron combinar los archivos. Verifica que no estén protegidos por contraseña." 
      });
    } finally {
      setIsMerging(false);
    }
  };

  if (!mounted) return null;

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
            <h1 className="text-xl font-headline font-black tracking-tighter text-indigo-600 uppercase">{t.mergeTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSelector language={lang} setLanguage={setLang} />
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-12 bg-muted/30 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-6">
            <div className="text-center space-y-2 mb-8">
              <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-200/20 font-black px-3 py-1">
                <Zap className="h-3 w-3 mr-2" /> {t.localProcessing}
              </Badge>
              <h2 className="text-3xl font-headline font-black tracking-tighter text-foreground uppercase">
                {t.mergeSubtitle}
              </h2>
            </div>

            {files.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full aspect-[2/1] min-h-[300px] bg-card border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all group shadow-xl",
                  isDragging ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" : "border-border hover:border-indigo-300"
                )}
              >
                <div className="p-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-full group-hover:scale-110 transition-transform">
                  <Copy className="h-16 w-16 text-indigo-500" />
                </div>
                <h3 className="mt-6 text-xl font-headline font-black text-foreground uppercase tracking-tight">{t.addFiles}</h3>
                <p className="mt-2 text-muted-foreground font-medium">{t.dragDrop}</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-500 pb-32">
                <div className="flex justify-between items-center px-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{files.length} ARCHIVOS CARGADOS</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FilePlus className="h-3 w-3" />
                    {t.addFiles}
                  </Button>
                </div>

                <div className="space-y-3">
                  {files.map((file, idx) => (
                    <Card key={file.id} className="group p-4 bg-card border-2 border-border hover:border-indigo-200 transition-all rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-foreground truncate">{file.name}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg"
                            onClick={() => moveFile(idx, 'up')}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg"
                            onClick={() => moveFile(idx, 'down')}
                            disabled={idx === files.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="p-6 bg-amber-50 dark:bg-amber-500/10 rounded-[2rem] border border-amber-100 dark:border-amber-500/20 flex items-start gap-4">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider">{t.order}</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-500/70 font-medium">Usa las flechas para ordenar los archivos. El PDF final se generará siguiendo este orden de arriba hacia abajo.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden md:flex w-80 bg-card border-l border-border flex-col shrink-0 shadow-2xl z-20 p-6">
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.localProcessing}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Esta herramienta combina tus archivos directamente en tu navegador. Tus PDFs nunca se suben a ningún servidor, garantizando privacidad total y velocidad instantánea.
              </p>
            </div>

            <Separator />

            {files.length > 0 && (
              <div className="space-y-5 animate-in slide-in-from-right-10 duration-500">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <FileType className="h-3 w-3" />
                    {t.outputFileName}
                  </Label>
                  <Input 
                    placeholder={t.outputFileNamePlaceholder}
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="h-10 border-2 focus:border-indigo-500 font-bold text-sm rounded-xl"
                  />
                </div>

                <div className="bg-muted p-4 rounded-2xl border border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Archivos</span>
                    <span className="text-xs font-black text-indigo-600">{files.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Peso Total</span>
                    <span className="text-xs font-black text-foreground">
                      {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6">
            <Button 
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs gap-3 transition-all active:scale-95"
              onClick={mergePdfs}
              disabled={files.length < 2 || isMerging}
            >
              {isMerging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {isMerging ? t.merging : t.mergeAction}
            </Button>
          </div>
        </aside>

        {files.length > 0 && (
          <div className="md:hidden fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 flex flex-col gap-3">
            <div className="bg-card p-3 rounded-2xl shadow-2xl border-2 border-border">
              <Input 
                placeholder={t.outputFileNamePlaceholder}
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="h-10 border-none bg-muted font-bold text-sm rounded-xl text-center"
              />
            </div>
            <Button 
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl uppercase tracking-widest text-sm gap-3 border-4 border-white/10"
              onClick={mergePdfs}
              disabled={files.length < 2 || isMerging}
            >
              {isMerging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {isMerging ? t.merging : t.mergeAction}
            </Button>
          </div>
        )}
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        multiple 
        accept="application/pdf" 
        onChange={handleFileSelect} 
        className="hidden" 
      />
    </div>
  );
}
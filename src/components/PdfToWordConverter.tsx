"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  FileType, 
  Loader2, 
  X,
  ShieldCheck,
  Zap,
  Type,
  CloudLightning,
  Download,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import { convertPdfToDocx } from "@/app/actions/convert";
import logo from "@/app/icono.png";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

export default function PdfToWordConverter() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'))) {
      setPdfFile(file);
      setProgress(0);
      setDownloadUrl(null);
    } else if (file) {
      toast({ variant: "destructive", title: "Formato no válido", description: "Por favor selecciona un archivo PDF." });
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
      setProgress(0);
      setDownloadUrl(null);
    } else if (file) {
      toast({ variant: "destructive", title: "Formato no válido", description: "Por favor selecciona un archivo PDF." });
    }
  };

  const startConversion = async () => {
    if (!pdfFile) return;

    setIsConverting(true);
    setProgress(10);
    setStatusText("Subiendo archivo...");

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 95 ? prev + 1 : prev));
      }, 300);

      const result = await convertPdfToDocx(formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      setDownloadUrl(result.url);
      
      toast({ 
        title: "¡Conversión Exitosa!", 
        description: "El diseño original se ha preservado con alta fidelidad." 
      });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Error de Conversión", 
        description: error.message || "Asegúrate de que tu API Key de CloudConvert sea válida." 
      });
    } finally {
      setIsConverting(false);
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
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary uppercase">PDF A WORD PRO</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSelector language={lang} setLanguage={setLang} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16 space-y-10 flex flex-col items-center">
          <div className="text-center space-y-4 max-w-2xl animate-fade-in">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-black px-4 py-1.5 rounded-full">
              <CloudLightning className="h-3.5 w-3.5 mr-2" /> MOTOR PROFESIONAL CLOUDCONVERT
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-headline font-black tracking-tighter text-foreground uppercase leading-[1.1]">
              CALIDAD DE ESTUDIO GRÁFICO
            </h2>
            <p className="text-muted-foreground font-medium text-base sm:text-lg">
              Utilizamos tecnología líder para respetar fuentes, tablas y diseños complejos de tus documentos.
            </p>
          </div>

          <Card 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "w-full max-w-2xl border-4 border-dashed p-8 sm:p-14 bg-card rounded-[3rem] relative shadow-2xl overflow-hidden group transition-all duration-300",
              isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/40"
            )}
          >
            {!pdfFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center space-y-8 cursor-pointer">
                <div className="p-10 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FileType className={cn("h-20 w-20 transition-colors", isDragging ? "text-primary" : "text-primary/60")} />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Seleccionar PDF</h3>
                  <p className="text-muted-foreground font-bold text-sm">Convierte respetando el diseño exacto.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-7 rounded-2xl text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95">
                  Elegir Archivo
                </Button>
                <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleFileSelect} className="hidden" />
              </div>
            ) : (
              <div className="space-y-8 animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-6 p-6 bg-muted rounded-[2rem] border border-border shadow-inner">
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <FileType className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-foreground truncate">{pdfFile.name}</h4>
                    <p className="text-xs font-bold text-muted-foreground uppercase">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!isConverting && !downloadUrl && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPdfFile(null)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  )}
                </div>

                {isConverting && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-black text-primary uppercase tracking-widest px-2">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {statusText}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-4 bg-primary/10 rounded-full" />
                    <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Esto puede tardar unos segundos dependiendo del tamaño.</p>
                  </div>
                )}

                {downloadUrl ? (
                  <div className="space-y-4">
                    <Button 
                      className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 text-lg uppercase tracking-widest gap-3 transition-all active:scale-95"
                      asChild
                    >
                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-6 w-6" />
                        Descargar Word
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full font-black text-muted-foreground hover:text-primary uppercase text-xs tracking-widest"
                      onClick={() => {
                        setPdfFile(null);
                        setDownloadUrl(null);
                        setProgress(0);
                      }}
                    >
                      Convertir otro archivo
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 text-lg uppercase tracking-widest gap-3 transition-all active:scale-95"
                    onClick={startConversion}
                    disabled={isConverting}
                  >
                    {isConverting ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudLightning className="h-6 w-6" />}
                    {isConverting ? "Procesando en la nube..." : "Convertir con Alta Calidad"}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl pb-12">
            <div className="flex items-start gap-4 bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/10 shadow-sm">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Máxima Fidelidad</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">Respetamos logotipos, imágenes y el interlineado exacto de tu PDF original.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-amber-500/5 p-6 rounded-[2rem] border border-amber-500/10 shadow-sm">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Type className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Fuentes Originales</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">Detectamos tipografías profesionales para que el Word sea 100% editable.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-muted-foreground/60 pb-8">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Los archivos se eliminan automáticamente tras 24 horas.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

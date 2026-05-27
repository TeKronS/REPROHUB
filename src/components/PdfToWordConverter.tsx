
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
    if (file && file.type === "application/pdf") {
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
    if (file && file.type === "application/pdf") {
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
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary uppercase">PDF A WORD PRO</h1>
          </div>
        </div>
        <LanguageSelector language={lang} setLanguage={setLang} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-black mb-2 px-3 py-1">
              <CloudLightning className="h-3 w-3 mr-2" /> MOTOR PROFESIONAL CLOUDCONVERT
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-headline font-black tracking-tighter text-slate-900 uppercase">
              CALIDAD DE ESTUDIO GRÁFICO
            </h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Utilizamos tecnología líder para respetar fuentes, tablas y diseños complejos de tus documentos.
            </p>
          </div>

          <Card 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-4 border-dashed p-8 sm:p-12 bg-white rounded-[2.5rem] relative shadow-2xl overflow-hidden group transition-all",
              isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-primary/20 hover:border-primary/40"
            )}
          >
            {!pdfFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center space-y-6 cursor-pointer">
                <div className="p-8 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FileType className={cn("h-16 w-16 transition-colors", isDragging ? "text-primary" : "text-primary/60")} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Seleccionar PDF</h3>
                  <p className="text-slate-500 font-bold text-sm">Convierte respetando el diseño exacto.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 py-6 rounded-2xl text-lg uppercase tracking-widest shadow-xl">
                  Elegir Archivo
                </Button>
                <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleFileSelect} className="hidden" />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-6 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <FileType className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-800 truncate">{pdfFile.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!isConverting && !downloadUrl && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-slate-400 hover:text-destructive"
                      onClick={() => setPdfFile(null)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  )}
                </div>

                {isConverting && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-emerald-500 animate-pulse" />
                        {statusText}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-primary/10 rounded-full" />
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Esto puede tardar unos segundos dependiendo del tamaño del archivo.</p>
                  </div>
                )}

                {downloadUrl ? (
                  <div className="space-y-4">
                    <Button 
                      className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-2xl text-lg uppercase tracking-widest gap-3"
                      asChild
                    >
                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-6 w-6" />
                        Descargar Word
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full font-bold text-slate-400 uppercase text-xs"
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
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-2xl text-lg uppercase tracking-widest gap-3"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Máxima Fidelidad</p>
                <p className="text-[11px] text-blue-600/80 font-medium">Respetamos logotipos, imágenes y el interlineado exacto de tu PDF.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <Type className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Fuentes Originales</p>
                <p className="text-[11px] text-amber-600/80 font-medium">Detectamos tipografías profesionales para que el Word sea 100% editable.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Los archivos se eliminan automáticamente tras 24 horas.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

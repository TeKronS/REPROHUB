
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  FileType, 
  Loader2, 
  Upload, 
  X,
  FileCheck,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import logo from "@/app/icono.png";

// Versión ultra-compatible de PDF.js (v2.x no usa bloques estáticos de clase que causan el error 'super')
const PDFJS_VERSION = "2.16.105";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export default function PdfToWordConverter() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [libReady, setLibReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const loadPdfJs = () => {
      console.log("Iniciando carga de PDF.js v" + PDFJS_VERSION);
      if (typeof window === "undefined") return;
      
      if ((window as any).pdfjsLib) {
        console.log("PDF.js ya estaba cargado en el objeto window.");
        setLibReady(true);
        return;
      }

      const script = document.createElement("script");
      script.src = PDFJS_CDN;
      script.async = true;
      script.onload = () => {
        console.log("Script principal de PDF.js cargado correctamente.");
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
          console.log("Worker de PDF.js configurado vía CDN.");
          setLibReady(true);
        } else {
          console.error("PDF.js cargado pero pdfjsLib no encontrado en window.");
        }
      };
      script.onerror = (err) => {
        console.error("Error cargando el script de PDF.js desde el CDN:", err);
      };
      document.head.appendChild(script);
    };

    loadPdfJs();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      console.log("Archivo PDF seleccionado:", file.name, "(" + file.size + " bytes)");
      setPdfFile(file);
    } else if (file) {
      console.warn("Intento de carga de archivo no PDF:", file.type);
      toast({
        variant: "destructive",
        title: "Formato no válido",
        description: t.pdfFormatOnly
      });
    }
  };

  const convertToWord = async () => {
    console.log("Iniciando proceso de conversión PDF -> Word...");
    const pdfjsLib = (window as any).pdfjsLib;
    
    if (!pdfFile) {
      console.error("No hay archivo PDF seleccionado.");
      return;
    }

    if (!pdfjsLib) {
      console.error("Librería pdfjsLib no disponible en el momento de la conversión.");
      toast({
        variant: "destructive",
        title: "Error de motor",
        description: "El motor de PDF no está listo. Recarga la página."
      });
      return;
    }
    
    setIsConverting(true);
    setProgress(5);

    try {
      console.log("Paso 1: Importación dinámica de librerías secundarias...");
      
      // Intentamos importar docx de forma aislada
      console.log("Importando 'docx'...");
      const docx = await import("docx").catch(err => {
        console.error("Error fatal importando 'docx':", err);
        throw err;
      });
      console.log("'docx' importado con éxito.");

      // Intentamos importar file-saver de forma aislada
      console.log("Importando 'file-saver'...");
      const fileSaver = await import("file-saver").catch(err => {
        console.error("Error fatal importando 'file-saver':", err);
        throw err;
      });
      console.log("'file-saver' importado con éxito.");

      const { Document, Packer, Paragraph, TextRun } = docx;
      const { saveAs } = fileSaver;

      console.log("Paso 2: Leyendo ArrayBuffer del archivo...");
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      console.log("Paso 3: Cargando documento PDF con PDF.js...");
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const numPages = pdf.numPages;
      console.log("Documento PDF cargado. Total de páginas:", numPages);
      
      const docParagraphs: any[] = [];

      for (let i = 1; i <= numPages; i++) {
        console.log("Procesando página " + i + " de " + numPages + "...");
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY = -1;
        let currentLine = "";

        textContent.items.forEach((item: any) => {
          // Lógica de detección de líneas basada en coordenadas Y
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            if (currentLine.trim()) {
              docParagraphs.push(new Paragraph({
                children: [new TextRun(currentLine)],
              }));
            }
            currentLine = item.str;
          } else {
            currentLine += (currentLine ? " " : "") + item.str;
          }
          lastY = item.transform[5];
        });

        if (currentLine.trim()) {
          docParagraphs.push(new Paragraph({
            children: [new TextRun(currentLine)],
          }));
        }

        if (i < numPages) {
          docParagraphs.push(new Paragraph({
            children: [new TextRun({ text: "", break: 1 })],
          }));
        }

        setProgress(10 + (Math.round((i / numPages) * 80)));
      }

      console.log("Paso 4: Generando estructura final del archivo Word...");
      const doc = new Document({
        sections: [{
          properties: {},
          children: docParagraphs,
        }],
      });

      console.log("Paso 5: Empaquetando y disparando descarga...");
      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, pdfFile.name.replace(".pdf", ".docx"));
      
      console.log("Conversión completada con éxito.");
      setProgress(100);
      toast({
        title: "Conversión terminada",
        description: "El archivo Word se ha generado correctamente."
      });
    } catch (error: any) {
      console.error("ERROR CRÍTICO DURANTE LA CONVERSIÓN:", error);
      console.error("Detalle del error:", error.message, error.stack);
      toast({
        variant: "destructive",
        title: "Error de procesamiento",
        description: "Error: " + (error.message || "Error desconocido en el navegador.")
      });
    } finally {
      setIsConverting(false);
      setTimeout(() => setProgress(0), 2000);
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
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary uppercase">
              PDF A WORD
            </h1>
          </div>
        </div>
        <LanguageSelector language={lang} setLanguage={setLang} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-headline font-black tracking-tighter text-slate-900 uppercase">
              {t.pdfToWordTitle}
            </h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              {t.pdfToWordDesc}
            </p>
          </div>

          <Card className="border-4 border-dashed border-primary/20 p-8 sm:p-12 bg-white/50 backdrop-blur-sm rounded-[2.5rem] relative overflow-hidden group shadow-xl">
            {!libReady ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="font-bold text-primary animate-pulse uppercase tracking-widest text-[10px]">Cargando motor local compatible...</p>
              </div>
            ) : !pdfFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center space-y-6 cursor-pointer"
              >
                <div className="p-8 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-16 w-16 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t.dropPdf}</h3>
                  <p className="text-slate-500 font-bold text-sm">{t.pdfFormatOnly}</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 py-6 rounded-2xl text-lg shadow-xl uppercase tracking-widest transition-all active:scale-95">
                  {t.selectPdf}
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="application/pdf" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-6 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                    <FileType className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-800 truncate">{pdfFile.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      console.log("Removiendo archivo actual...");
                      setPdfFile(null);
                    }}
                    disabled={isConverting}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {isConverting && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
                      <span>Procesando PDF localmente...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-primary/10 rounded-full" />
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <Button 
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-2xl shadow-primary/20 text-lg uppercase tracking-widest transition-all active:scale-95"
                    onClick={convertToWord}
                    disabled={isConverting}
                  >
                    {isConverting ? (
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    ) : (
                      <FileCheck className="h-6 w-6 mr-2" />
                    )}
                    {isConverting ? "Procesando..." : t.downloadDocx}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center gap-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl shadow-sm">
            <div className="p-2 bg-emerald-100 rounded-full">
              <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-black text-emerald-800 uppercase tracking-tighter">Procesamiento Privado Local</p>
              <p className="text-[10px] font-bold text-emerald-700/80 leading-tight">
                Utilizamos el motor de tu navegador para la conversión. Abre la consola del desarrollador (F12) para ver el progreso detallado.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  FileType, 
  FileDown, 
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
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export default function PdfToWordConverter() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfjs, setPdfjs] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    
    // Carga dinámica de PDF.js solo en el cliente
    const initPdfJs = async () => {
      try {
        const pdfjsModule = await import("pdfjs-dist");
        // @ts-ignore
        const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");
        pdfjsModule.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        setPdfjs(pdfjsModule);
      } catch (error) {
        console.error("Error loading PDF.js:", error);
      }
    };

    initPdfJs();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else if (file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t.pdfFormatOnly
      });
    }
  };

  const convertToWord = async () => {
    if (!pdfFile || !pdfjs) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El motor de conversión aún se está cargando. Por favor, espera un momento."
      });
      return;
    }
    
    setIsConverting(true);
    setProgress(10);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const numPages = pdf.numPages;
      const paragraphs: Paragraph[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY = -1;
        let currentLine = "";

        textContent.items.forEach((item: any) => {
          // Heurística básica para detectar nuevas líneas por cambio de posición Y
          if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
            if (currentLine.trim()) {
              paragraphs.push(new Paragraph({
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
          paragraphs.push(new Paragraph({
            children: [new TextRun(currentLine)],
          }));
        }

        if (i < numPages) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: "", break: 1 })],
          }));
        }

        setProgress(10 + (Math.round((i / numPages) * 80)));
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, pdfFile.name.replace(".pdf", ".docx"));
      
      setProgress(100);
      toast({
        title: "Conversión Exitosa",
        description: "El archivo Word ha sido generado."
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al convertir el PDF."
      });
    } finally {
      setIsConverting(false);
      setTimeout(() => setProgress(0), 1000);
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

          <Card className="border-4 border-dashed border-primary/20 p-8 sm:p-12 bg-white/50 backdrop-blur-sm rounded-[2.5rem] relative overflow-hidden group">
            {!pdfFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center space-y-6 cursor-pointer"
              >
                <div className="p-8 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-16 w-16 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t.dropPdf}</h3>
                  <p className="text-slate-500 font-bold">{t.pdfFormatOnly}</p>
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
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <FileType className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-800 truncate">{pdfFile.name}</h4>
                    <p className="text-sm font-bold text-slate-400">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full text-slate-400 hover:text-destructive"
                    onClick={() => setPdfFile(null)}
                    disabled={isConverting}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {isConverting && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-black text-primary uppercase tracking-widest">
                      <span>{t.convertingPdf}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-primary/10" />
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <Button 
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-2xl shadow-primary/20 text-lg uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    onClick={convertToWord}
                    disabled={isConverting || !pdfjs}
                  >
                    {isConverting ? (
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    ) : (
                      <FileCheck className="h-6 w-6 mr-2" />
                    )}
                    {isConverting ? "..." : t.downloadDocx}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-[11px] font-bold text-orange-700 leading-tight">
              Nota: La conversión extrae el texto manteniendo párrafos básicos. Formatos complejos como tablas o imágenes anidadas podrían no preservarse perfectamente en esta versión.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

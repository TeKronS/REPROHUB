
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  FileType, 
  Loader2, 
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

const PDFJS_VERSION = "2.16.105";
const DOCX_VERSION = "7.1.0";
const FILE_SAVER_VERSION = "2.0.5";

const LIBS = [
  { id: 'pdfjs', url: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js` },
  { id: 'pdfjs-worker', url: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js` },
  { id: 'docx', url: `https://unpkg.com/docx@${DOCX_VERSION}/build/index.js` },
  { id: 'file-saver', url: `https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/${FILE_SAVER_VERSION}/FileSaver.min.js` }
];

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
  const [libsReady, setLibsReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const loadScript = (url: string) => {
      return new Promise((resolve, reject) => {
        if (typeof document === 'undefined') return;
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = (e) => {
          console.error(`Error cargando motor: ${url}`, e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    };

    const loadAllLibs = async () => {
      try {
        for (const lib of LIBS) {
          await loadScript(lib.url);
        }
        if ((window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS[1].url;
        }
        setLibsReady(true);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error de inicialización",
          description: "No se pudieron cargar los componentes locales de procesamiento."
        });
      }
    };

    loadAllLibs();
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    }
  };

  const convertToWord = async () => {
    if (!pdfFile || !libsReady) return;
    
    const pdfjsLib = (window as any).pdfjsLib;
    const docx = (window as any).docx;
    const saveAs = (window as any).saveAs;

    if (!pdfjsLib || !docx || !saveAs) {
      toast({ variant: "destructive", title: "Error", description: "Librerías de procesamiento no listas." });
      return;
    }

    setIsConverting(true);
    setProgress(5);
    setStatusText("Analizando estructura...");

    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, Header } = docx;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      
      const docChildren: any[] = [];
      const headerChildren: any[] = [];
      const headerThreshold = 120; // Puntos desde el top para considerar "cabecera"

      for (let i = 1; i <= numPages; i++) {
        setStatusText(`Procesando página ${i} de ${numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        // 1. Extraer Imágenes y detectar si van a la Cabecera
        const operatorList = await page.getOperatorList();
        for (let j = 0; j < operatorList.fnArray.length; j++) {
          const fn = operatorList.fnArray[j];
          if (fn === (pdfjsLib as any).OPS.paintImageXObject || fn === (pdfjsLib as any).OPS.paintInlineImageXObject) {
            const imgKey = operatorList.argsArray[j][0];
            try {
              const imgObj = await new Promise((resolve) => {
                page.objs.get(imgKey, (obj: any) => resolve(obj));
              });
              
              if (imgObj && (imgObj as any).data) {
                const canvas = document.createElement('canvas');
                canvas.width = (imgObj as any).width;
                canvas.height = (imgObj as any).height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const imgData = ctx.createImageData(canvas.width, canvas.height);
                  imgData.data.set((imgObj as any).data);
                  ctx.putImageData(imgData, 0, 0);
                  
                  const imgBase64 = canvas.toDataURL('image/png');
                  const imageRun = new ImageRun({
                    data: imgBase64,
                    transformation: { 
                      width: Math.min(canvas.width / 2.5, pageWidth - 100), 
                      height: canvas.height / 2.5 
                    }
                  });

                  // Si está en el primer 15% de la primera página, lo mandamos al Header real de Word
                  if (i === 1) {
                    headerChildren.push(new Paragraph({
                      children: [imageRun],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 200 }
                    }));
                  } else {
                    docChildren.push(new Paragraph({
                      children: [imageRun],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 300 }
                    }));
                  }
                }
              }
            } catch (e) {
              console.warn("Error extrayendo imagen:", e);
            }
          }
        }

        // 2. Extraer Texto
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        const styles = textContent.styles as any;

        // Ordenar items por posición Y (arriba a abajo)
        items.sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff;
          return a.transform[4] - b.transform[4];
        });

        let currentY = -1;
        let lastLineY = -1;
        let lineItems: any[] = [];
        
        const processLine = (line: any[]) => {
          if (line.length === 0) return;
          
          let minX = Infinity;
          let maxX = -Infinity;
          let maxFontSize = 11;
          const textRuns: any[] = [];

          const lineYFromTop = pageHeight - line[0].transform[5];

          line.forEach(item => {
            const fontStyle = styles[item.fontName];
            
            // Normalización de Fuentes
            let fontFamily = "Arial";
            if (fontStyle && fontStyle.fontFamily) {
              const rawFont = fontStyle.fontFamily.toLowerCase();
              if (rawFont.includes('times')) fontFamily = "Times New Roman";
              else if (rawFont.includes('calibri')) fontFamily = "Calibri";
              else if (rawFont.includes('arial')) fontFamily = "Arial";
            }

            // Detección de Negritas
            const fontNameLower = (item.fontName || "").toLowerCase();
            const isBold = fontNameLower.includes('bold') || 
                           fontNameLower.includes('black') || 
                           fontNameLower.includes('heavy') ||
                           fontNameLower.includes('w7') ||
                           fontNameLower.includes('w8') ||
                           fontNameLower.includes('w9');
            
            minX = Math.min(minX, item.transform[4]);
            maxX = Math.max(maxX, item.transform[4] + item.width);
            const fontSize = Math.abs(item.transform[0]);
            maxFontSize = Math.max(maxFontSize, fontSize);

            textRuns.push(new TextRun({
              text: item.str,
              size: Math.round(fontSize * 2),
              bold: isBold,
              font: fontFamily
            }));
          });

          // Detección de Alineación
          const lineCenter = (minX + maxX) / 2;
          const pageCenter = pageWidth / 2;
          let alignment = AlignmentType.LEFT;
          
          if (Math.abs(lineCenter - pageCenter) < 50) {
            alignment = AlignmentType.CENTER;
          } else if (maxX > pageWidth - 100) {
            alignment = AlignmentType.RIGHT;
          }

          const paragraph = new Paragraph({
            children: textRuns,
            alignment: alignment,
            spacing: { after: 120, line: 240 }
          });

          // Si el texto está muy arriba en la primera página, va al Header técnico de Word
          if (i === 1 && lineYFromTop < headerThreshold) {
            headerChildren.push(paragraph);
          } else {
            // Detección de Enters (Espaciado Vertical) entre párrafos del cuerpo
            if (lastLineY !== -1) {
              const verticalGap = lastLineY - line[0].transform[5];
              if (verticalGap > maxFontSize * 2) {
                const numEnters = Math.max(1, Math.floor(verticalGap / (maxFontSize * 1.5)) - 1);
                for (let e = 0; e < numEnters; e++) {
                  docChildren.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
                }
              }
            }
            docChildren.push(paragraph);
          }

          lastLineY = line[0].transform[5];
        };

        items.forEach(item => {
          if (currentY !== -1 && Math.abs(item.transform[5] - currentY) > 8) {
            processLine(lineItems);
            lineItems = [item];
          } else {
            lineItems.push(item);
          }
          currentY = item.transform[5];
        });
        processLine(lineItems);

        // Salto de página en Word
        if (i < numPages) {
          docChildren.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }));
          lastLineY = -1;
        }

        setProgress(10 + Math.round((i / numPages) * 85));
      }

      // Crear el documento con Header real
      const docObj = new Document({
        creator: "MultiPrintTools PRO",
        title: pdfFile.name,
        sections: [{
          properties: { 
            page: { 
              margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } 
            } 
          },
          headers: headerChildren.length > 0 ? {
            default: new Header({
              children: headerChildren,
            }),
          } : undefined,
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(docObj);
      saveAs(blob, pdfFile.name.replace(/\.[^/.]+$/, "") + " (Convertido).docx");
      setProgress(100);
      toast({ title: "¡Éxito!", description: "Conversión finalizada con cabecera técnica." });
    } catch (error) {
      console.error("Fallo conversión:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo reconstruir el documento." });
    } finally {
      setIsConverting(false);
      setTimeout(() => setProgress(0), 4000);
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
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1 rounded-full mb-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Motor de Alta Fidelidad v3.0</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-headline font-black tracking-tighter text-slate-900 uppercase">
              RECONSTRUCCIÓN DE CABECERAS
            </h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Extracción de logotipos e integración en la cabecera real de Word (.docx).
            </p>
          </div>

          <Card className="border-4 border-dashed border-primary/20 p-8 sm:p-12 bg-white rounded-[2.5rem] relative shadow-xl overflow-hidden group">
            {!libsReady ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="font-bold text-primary uppercase tracking-widest text-[10px]">Cargando motores locales de alta precisión...</p>
              </div>
            ) : !pdfFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center space-y-6 cursor-pointer">
                <div className="p-8 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FileType className="h-16 w-16 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t.dropPdf}</h3>
                  <p className="text-slate-500 font-bold text-sm">Privacidad garantizada: Procesamiento 100% local en tu navegador.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 py-6 rounded-2xl text-lg uppercase tracking-widest shadow-xl">
                  {t.selectPdf}
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
                    <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
                      <span>{statusText}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-primary/10 rounded-full" />
                  </div>
                )}

                <Button 
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-2xl text-lg uppercase tracking-widest"
                  onClick={convertToWord}
                  disabled={isConverting}
                >
                  {isConverting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <FileCheck className="h-6 w-6 mr-2" />}
                  {isConverting ? "Procesando Cabecera..." : "Convertir Fielmente"}
                </Button>
              </div>
            )}
          </Card>

          <div className="flex items-start gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200">
            <AlertCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nota de Calidad</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Este motor detecta elementos en la parte superior de la página y los integra en la cabecera real de Word para una edición más profesional.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

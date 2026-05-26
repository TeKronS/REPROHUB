
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
  ShieldCheck,
  Zap,
  Type,
  AlignLeft,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Language, translations } from "@/lib/translations";
import { LanguageSelector } from "./LanguageSelector";
import logo from "@/app/icono.png";

// Versiones estables de motores externos para ejecución local
const PDFJS_VERSION = "2.16.105";
const DOCX_VERSION = "7.1.0";
const FILE_SAVER_VERSION = "2.0.5";

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
          console.error(`Fallo al cargar motor externo: ${url}`, e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    };

    const loadAllLibs = async () => {
      try {
        await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`);
        await loadScript(`https://unpkg.com/docx@${DOCX_VERSION}/build/index.js`);
        await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/${FILE_SAVER_VERSION}/FileSaver.min.js`);
        
        if ((window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
          setLibsReady(true);
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error de motor",
          description: "No se pudieron cargar las herramientas locales."
        });
      }
    };

    loadAllLibs();
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setProgress(0);
    }
  };

  const startConversion = async () => {
    if (!pdfFile || !libsReady) return;

    const pdfjsLib = (window as any).pdfjsLib;
    const docx = (window as any).docx;
    const saveAs = (window as any).saveAs;

    setIsConverting(true);
    setProgress(5);
    setStatusText("Analizando estructura...");

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } = docx;
      const sections: any[] = [];
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        setProgress(Math.round((i / totalPages) * 70));
        setStatusText(`Procesando página ${i}...`);

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;

        // Limpieza y agrupación de items por coordenadas Y con tolerancia
        const items = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontName: item.fontName,
        }));

        const lines: any[] = [];
        items.forEach((item: any) => {
          // Tolerancia de 3 unidades para agrupar en la misma línea
          const line = lines.find(l => Math.abs(l.y - item.y) < 3);
          if (line) {
            line.items.push(item);
          } else {
            lines.push({ y: item.y, items: [item] });
          }
        });

        // Ordenar líneas de arriba a abajo y items de izquierda a derecha
        lines.sort((a, b) => b.y - a.y);
        lines.forEach(l => l.items.sort((a: any, b: any) => a.x - b.x));

        const pageParagraphs: any[] = [];
        let lastLineY = lines.length > 0 ? lines[0].y + 20 : 0;

        lines.forEach((line) => {
          const verticalGap = lastLineY - line.y;
          lastLineY = line.y;

          // Detección de alineación basada en márgenes
          const lineStartX = line.items[0].x;
          const lineEndX = line.items[line.items.length - 1].x + line.items[line.items.length - 1].width;
          const lineCenter = (lineStartX + lineEndX) / 2;
          const pageCenter = pageWidth / 2;

          let alignment = AlignmentType.LEFT;
          // Si el centro de la línea está cerca del centro de la página, es CENTRADO
          if (Math.abs(lineCenter - pageCenter) < 30) {
            alignment = AlignmentType.CENTER;
          } else if (lineStartX > pageWidth * 0.45) {
            alignment = AlignmentType.RIGHT;
          }

          // Detección de Negritas y Fuentes
          const runs = line.items.map((item: any, idx: number) => {
            const fontName = item.fontName.toLowerCase();
            
            // Heurística de negrita: nombres técnicos o pesos
            const isBold = fontName.includes('bold') || 
                           fontName.includes('bd') || 
                           fontName.includes('black') || 
                           fontName.includes('heavy') ||
                           item.height > 13; // Títulos suelen ser más grandes

            // Forzar Times New Roman si parece un documento formal
            let fontFamily = "Times New Roman";
            if (fontName.includes('arial') || fontName.includes('helvetica')) fontFamily = "Arial";
            else if (fontName.includes('courier')) fontFamily = "Courier New";
            else if (fontName.includes('calibri')) fontFamily = "Calibri";

            // Heurística de subrayado para títulos centrales típicos
            const isUnderlined = alignment === AlignmentType.CENTER && 
                                 item.text === item.text.toUpperCase() && 
                                 item.text.length > 5;

            // Manejo de espacios entre palabras (el PDF no siempre los incluye)
            let prefix = "";
            if (idx > 0) {
              const prevItem = line.items[idx - 1];
              const gapX = item.x - (prevItem.x + prevItem.width);
              if (gapX > 4) prefix = " "; // Si hay hueco, añade espacio
              if (gapX > 20) prefix = "    "; // Si el hueco es grande, es una tabulación
            }

            return new TextRun({
              text: prefix + item.text,
              bold: isBold,
              underline: isUnderlined ? { type: UnderlineType.SINGLE } : undefined,
              size: Math.round(item.height * 1.95), // Factor de escala PDF -> Word
              font: fontFamily,
            });
          });

          // Calcular interlineado dinámico (spacing before)
          const spacingBefore = verticalGap > 5 ? Math.min(400, (verticalGap * 10)) : 0;

          pageParagraphs.push(new Paragraph({
            children: runs,
            alignment: alignment,
            spacing: { 
              before: spacingBefore,
              after: 100 
            },
            indent: alignment === AlignmentType.LEFT ? { left: Math.round(lineStartX * 15) } : undefined
          }));
        });

        sections.push({
          properties: {
            page: {
              margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
            }
          },
          children: pageParagraphs
        });
      }

      setStatusText("Generando archivo Word...");
      const doc = new Document({
        creator: "MultiPrintTools Engine V2",
        title: pdfFile.name,
        sections: sections
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, pdfFile.name.replace(".pdf", "") + " (Convertido).docx");
      
      setProgress(100);
      toast({ title: "¡Conversión Exitosa!", description: "Documento reconstruido localmente." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el PDF." });
    } finally {
      setIsConverting(false);
      setTimeout(() => setProgress(0), 5000);
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
            <h1 className="text-xl font-headline font-black tracking-tighter text-primary uppercase">PDF A WORD LOCAL</h1>
          </div>
        </div>
        <LanguageSelector language={lang} setLanguage={setLang} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 font-black mb-2">
              <ShieldCheck className="h-3 w-3 mr-1" /> MOTOR GEOMÉTRICO 100% LOCAL
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-headline font-black tracking-tighter text-slate-900 uppercase">
              RECONSTRUCCIÓN DE DOCUMENTOS
            </h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Analizamos la geometría del PDF para recrear fuentes, negritas y espaciados sin usar la nube.
            </p>
          </div>

          <Card className="border-4 border-dashed border-primary/20 p-8 sm:p-12 bg-white rounded-[2.5rem] relative shadow-2xl overflow-hidden group transition-all hover:border-primary/40">
            {!libsReady ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="font-bold text-primary uppercase tracking-widest text-[10px]">Cargando motores locales...</p>
              </div>
            ) : !pdfFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center space-y-6 cursor-pointer">
                <div className="p-8 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FileType className="h-16 w-16 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Seleccionar PDF</h3>
                  <p className="text-slate-500 font-bold text-sm">Respetamos Times New Roman, Negritas y Espaciados.</p>
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
                      <span className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-emerald-500 animate-pulse" />
                        {statusText}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-primary/10 rounded-full" />
                  </div>
                )}

                <Button 
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-2xl text-lg uppercase tracking-widest gap-3"
                  onClick={startConversion}
                  disabled={isConverting}
                >
                  {isConverting ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileCheck className="h-6 w-6" />}
                  {isConverting ? "Procesando..." : "Convertir localmente"}
                </Button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <Type className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Times New Roman</p>
                <p className="text-[11px] text-blue-600/80 font-medium">Forzamos el uso de fuentes Serif para máxima fidelidad en documentos oficiales.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <AlignLeft className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Análisis Geométrico</p>
                <p className="text-[11px] text-amber-600/80 font-medium">Calculamos la posición exacta de cada letra para no perder la estructura del formulario.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

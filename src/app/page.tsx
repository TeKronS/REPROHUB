
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Layers, 
  ArrowRight,
  Sparkles,
  FileText,
  FileType,
  Maximize,
  Copy,
  Scissors
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Language, translations } from "@/lib/translations";
import logo from "./icono.png";

export default function Home() {
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];

  const tools = [
    {
      title: t.muralisTitle,
      description: t.muralisDesc,
      icon: <Layers className="h-8 w-8 text-primary" />,
      href: "/muralis",
      status: "active",
      badge: t.popular
    },
    {
      title: t.resizerTitle,
      description: t.resizerDesc,
      icon: <Maximize className="h-8 w-8 text-emerald-500" />,
      href: "/resizer",
      status: "active",
      badge: t.popular
    },
    {
      title: t.mergeTitle,
      description: t.pdfMasterDesc,
      icon: <Copy className="h-8 w-8 text-indigo-500" />,
      href: "/pdf-merge",
      status: "active",
      badge: "PRO"
    },
    {
      title: t.splitTitle,
      description: t.splitDesc,
      icon: <Scissors className="h-8 w-8 text-rose-500" />,
      href: "/pdf-split",
      status: "active",
      badge: "PRO"
    },
    {
      title: t.imgToPdfTitle,
      description: t.imgToPdfDesc,
      icon: <FileText className="h-8 w-8 text-blue-500" />,
      href: "/image-to-pdf",
      status: "active",
      badge: "PRO"
    },
    {
      title: t.pdfToWordTitle,
      description: t.pdfToWordDesc,
      icon: <FileType className="h-8 w-8 text-orange-500" />,
      href: "/pdf-to-word",
      status: "active",
      badge: "NEW"
    }
  ];

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Navbar Minimalista y Adaptable */}
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 relative overflow-hidden rounded-lg md:rounded-xl shadow-lg shadow-primary/20 bg-white border border-border/10">
            <Image 
              src={logo} 
              alt="MultiPrintTools Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <span className="text-lg md:text-2xl font-headline font-black tracking-tighter text-foreground whitespace-nowrap">
            MultiPrint<span className="text-primary">Tools</span>
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Link href="#" className="hidden sm:block text-xs md:text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
            {t.support}
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mb-10 md:mb-16 space-y-3 md:space-y-4 text-center sm:text-left">
          <Badge variant="secondary" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
            {t.heroBadge}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tighter leading-[1] md:leading-[0.9] text-foreground">
            {t.heroTitlePrefix}<span className="text-primary">{t.heroTitleSuffix}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto sm:mx-0">
            {t.heroDesc}
          </p>
        </div>

        {/* Grid de Herramientas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {tools.map((tool) => (
            <Link 
              key={tool.title} 
              href={tool.href}
              className={tool.status === 'coming-soon' ? 'pointer-events-none' : ''}
            >
              <Card className={`group relative h-full transition-all duration-300 border-2 bg-card ${tool.status === 'active' ? 'hover:border-primary hover:shadow-2xl hover:shadow-primary/10 cursor-pointer' : 'opacity-60 bg-muted/30 border-dashed'}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 md:p-8">
                  <div className="space-y-3 md:space-y-4 flex-1 min-w-0 pr-4">
                    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl inline-flex transition-transform group-hover:scale-110 duration-300 ${tool.status === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                        {tool.icon}
                      </div>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl md:text-2xl font-headline font-black leading-tight truncate">{tool.title}</CardTitle>
                        <Badge variant={tool.status === 'active' ? 'default' : 'outline'} className="font-bold text-[9px] md:text-[10px] uppercase tracking-wider shrink-0">
                          {tool.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm md:text-base text-muted-foreground leading-snug line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                  {tool.status === 'active' && (
                    <div className="bg-primary/10 p-2 rounded-full transform group-hover:translate-x-1 transition-transform shrink-0 mt-1">
                      <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                  )}
                </CardHeader>
                {tool.status === 'active' && (
                  <div className="absolute bottom-4 right-6 md:right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t.openApp}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-16 md:mt-24 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-muted-foreground font-medium text-center md:text-left">{t.footerRights}</p>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">{t.newTools}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

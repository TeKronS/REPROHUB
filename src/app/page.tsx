
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
    <div className="min-h-screen bg-white font-body">
      {/* Navbar Minimalista */}
      <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative overflow-hidden rounded-xl shadow-lg shadow-primary/20 bg-white border border-border/10">
            <Image 
              src={logo} 
              alt="MultiPrintTools Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <span className="text-2xl font-headline font-black tracking-tighter text-foreground">
            MultiPrint<span className="text-primary">Tools</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <LanguageSelector language={lang} setLanguage={setLang} />
          <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
            {t.support}
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mb-16 space-y-4">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
            {t.heroBadge}
          </Badge>
          <h1 className="text-5xl md:text-6xl font-headline font-black tracking-tighter leading-[0.9] text-foreground">
            {t.heroTitlePrefix}<span className="text-primary">{t.heroTitleSuffix}</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
            {t.heroDesc}
          </p>
        </div>

        {/* Grid de Herramientas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {tools.map((tool) => (
            <Link 
              key={tool.title} 
              href={tool.href}
              className={tool.status === 'coming-soon' ? 'pointer-events-none' : ''}
            >
              <Card className={`group relative h-full transition-all duration-300 border-2 ${tool.status === 'active' ? 'hover:border-primary hover:shadow-2xl hover:shadow-primary/10 cursor-pointer' : 'opacity-60 bg-muted/30 border-dashed'}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6 sm:p-8">
                  <div className="space-y-4 flex-1 min-w-0 pr-4">
                    <div className={`p-4 rounded-2xl inline-flex transition-transform group-hover:scale-110 duration-300 ${tool.status === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                      {tool.icon}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl font-headline font-black leading-none">{tool.title}</CardTitle>
                        <Badge variant={tool.status === 'active' ? 'default' : 'outline'} className="font-bold text-[10px] uppercase tracking-wider shrink-0">
                          {tool.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-base text-muted-foreground leading-snug">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                  {tool.status === 'active' && (
                    <div className="bg-primary/10 p-2 rounded-full transform group-hover:translate-x-2 transition-transform shrink-0">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </CardHeader>
                {tool.status === 'active' && (
                  <div className="absolute bottom-4 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">{t.openApp}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-24 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground font-medium">{t.footerRights}</p>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-black uppercase tracking-widest">{t.newTools}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

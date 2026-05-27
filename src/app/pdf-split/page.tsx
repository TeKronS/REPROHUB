
"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PdfSplitTool = dynamic(
  () => import("@/components/PdfSplitTool"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="font-black text-primary uppercase tracking-widest text-xs">Cargando herramienta...</p>
        </div>
      </div>
    )
  }
);

export default function PdfSplitPage() {
  return <PdfSplitTool />;
}

"use client";

import React, { use, useState } from "react";
import { useRepoData } from "@/hooks/useRepoData";
import RepoNavigation from "@/component/repo/RepoNavigation";
import MermaidDiagram from "@/component/repo/MermaidDiagram";

export default function DiagramPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { repoId } = resolvedParams;
  const [isOpen, setIsOpen] = useState(false);

  const { data, loading, errorMessage } = useRepoData(repoId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#191919]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-gray-400 font-mono">Loading diagram...</div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#191919]">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">⚠️ Error</div>
          <div className="text-red-300">{errorMessage}</div>
        </div>
      </div>
    );
  }

  const diagram = (data as any)?.project_data_flow_diagram;

  if (!diagram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#191919]">
        <div className="text-center text-gray-400 font-mono">
          No diagram available
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#191919] text-white">
      <RepoNavigation repoId={repoId} />
      <div className="p-6">
        <MermaidDiagram 
          diagram={diagram}
          title="Project Data Flow Diagram"
          enableDialog={true}
          fullSize={false}
        />
      </div>
    </div>
  );
}

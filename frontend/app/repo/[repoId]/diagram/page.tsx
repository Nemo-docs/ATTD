"use client";

import React, { use } from "react";
import RepoLayout from "@/component/repo/RepoLayout";
import MermaidDiagram from "@/component/repo/MermaidDiagram";

export default function DiagramPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { repoId } = resolvedParams;

  return (
    <div className="h-full w-full">
      <RepoLayout repoId={repoId} render={(data) => (
          <div className="h-full w-full">
            <MermaidDiagram 
              diagram={(data as any)?.project_data_flow_diagram}
              title="Project Data Flow Diagram"
              fullSize={true}
            />
          </div>
        )}
      />
    </div>
  );
}

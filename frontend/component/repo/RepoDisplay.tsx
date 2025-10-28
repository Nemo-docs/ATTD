"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import mermaid from 'mermaid';
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';

const unwrapFencedContent = (text?: string) => {
  if (!text) return '';
  // If the content is wrapped in a fenced code block (``` or ~~~), unwrap it
  const fenceRegex = /^(?:```|~~~)[^\n]*\n([\s\S]*?)\n(?:```|~~~)\s*$/;
  const m = text.match(fenceRegex);
  if (m && m[1]) return m[1].trim();
  return text;
};

// reuse shared markdown components from `MarkdownComponents.tsx`

export default function RepoDisplay({ repoId }: { repoId: string }) {
  const [data, setData] = useState<any>(null);
  const router = useRouter();
  const [diagramRenderError, setDiagramRenderError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const key = `repo_${repoId}`;
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (stored) {
      try {
        setData(JSON.parse(stored));
        return;
      } catch (e) {
        console.warn('Failed to parse stored repo data', e);
      }
    }
    setData({ error: "No local data found for this repo. Try cloning again." });
  }, [repoId]);

  // initialize mermaid once
  useEffect(() => {
    try {
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'dark', 
        securityLevel: 'loose',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true
        },
        themeVariables: {
          primaryColor: '#262626',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#404040',
          lineColor: '#666666',
          secondaryColor: '#1b1b1b',
          tertiaryColor: '#333333'
        }
      });
    } catch (err) {
      console.warn('Mermaid initialization failed:', err);
    }
  }, []);

  // render any mermaid diagrams present in the DOM whenever data changes
  useEffect(() => {
    if (!data) return;

    const renderDiagrams = async () => {
      // clear previous render error state
      setDiagramRenderError(null);
      const diagrams = document.querySelectorAll('.mermaid-diagram');
      for (const diagram of Array.from(diagrams)) {
        const code = diagram.textContent || '';
        if (code.trim() && !diagram.querySelector('svg')) {
          try {
            // Generate a safe, unique ID for mermaid
            const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(uniqueId, code.trim());
            diagram.innerHTML = svg;
          } catch (error) {
            console.warn('Failed to render mermaid diagram:', error);
            const msg = (error && (error as any).message) ? (error as any).message : String(error);
            setDiagramRenderError(msg || 'Unknown error');
            diagram.innerHTML = `<pre class="text-red-500 p-3 rounded bg-red-50">Failed to render diagram: ${msg}</pre>`;
          }
        }
      }
    };

    // slight delay so ReactMarkdown has mounted nodes
    const id = window.setTimeout(renderDiagrams, 100);
    return () => window.clearTimeout(id);
  }, [data]);

  const makeMermaidBlock = (diagram?: string) => {
    if (!diagram) return '';
    return ['```mermaid', diagram, '```'].join('\n');
  };

  const makeCodeBlock = (text?: string) => {
    if (!text) return '';
    return ['```text', text, '```'].join('\n');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#191919] text-white">
      <div className="w-full h-full rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[24px] font-mono">Repository Overview</h1>
            {/* <Button variant="ghost" onClick={() => router.push('/')} className="text-[14px] font-mono">
              Back
            </Button> */}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">

          {data ? (
            ('error' in data) ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="text-red-400 text-lg mb-2">⚠️ Error</div>
                  <div className="text-red-300">{(data as any).error}</div>
                </div>
              </div>
            ) : (
              <div className="max-w-none space-y-8">
                {/* Repository Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#262626] p-6 rounded-lg border border-gray-700">
                    <div className="mb-3 text-[14px] text-gray-400 font-mono uppercase tracking-wide">Repository Name</div>
                    <div className="text-[16px] font-mono text-white">{(data as any).name || 'Unknown'}</div>
                  </div>

                  <div className="bg-[#262626] p-6 rounded-lg border border-gray-700">
                    <div className="mb-3 text-[14px] text-gray-400 font-mono uppercase tracking-wide">GitHub URL</div>
                    <div className="text-[16px]">
                      {(data as any).github_url ? (
                        <a 
                          href={(data as any).github_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-400 hover:text-blue-300 underline font-mono break-all"
                        >
                          {(data as any).github_url}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project Intro */}
                <div className="bg-[#262626] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 bg-[#1f1f1f] border-b border-gray-700">
                    <h2 className="text-[18px] font-mono text-white">Project Introduction</h2>
                  </div>
                  <div className="p-6">
                      <div className="bg-[#1b1b1b] p-4 rounded-lg border border-gray-800">
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((data as any).project_intro) || 'No project introduction available.'}
                      </AsyncMarkdown>
                    </div>
                  </div>
                </div>

                {/* Data Flow Diagram */}
                <div className="bg-[#262626] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 bg-[#1f1f1f] border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-[18px] font-mono text-white">Project Data Flow Diagram</h2>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          const src = (data as any).project_data_flow_diagram || '';
                          try {
                            await navigator.clipboard.writeText(src);
                            setCopyStatus('Copied!');
                            setTimeout(() => setCopyStatus(null), 1500);
                          } catch (e) {
                            setCopyStatus('Copy failed');
                            setTimeout(() => setCopyStatus(null), 1500);
                          }
                        }}
                        className="text-[12px] font-mono"
                      >
                        Copy Source
                      </Button>
                      {copyStatus && (
                        <span className="text-[12px] text-green-400 font-mono">{copyStatus}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    {diagramRenderError && (
                      <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="text-red-400 text-[14px] font-mono">
                          ⚠️ Diagram Render Error: {diagramRenderError}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-[#1b1b1b] p-6 rounded-lg border border-gray-800 overflow-x-auto">
                      <div className="min-h-[200px] flex items-center justify-center">
                        <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                          {makeMermaidBlock((data as any).project_data_flow_diagram)}
                        </AsyncMarkdown>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cursory Explanation */}
                <div className="bg-[#262626] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 bg-[#1f1f1f] border-b border-gray-700">
                    <h2 className="text-[18px] font-mono text-white">Project Overview</h2>
                  </div>
                  <div className="p-6">
                    <div className="bg-[#1b1b1b] p-4 rounded-lg border border-gray-800">
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {makeCodeBlock((data as any).project_cursory_explanation)}
                      </AsyncMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <div className="text-gray-400 font-mono">Loading repository data...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MermaidDiagramProps {
  diagram?: string;
  title?: string;
  fullSize?: boolean;
}

// Separate memoized component for the diagram content
const DiagramContent = React.memo(({ diagram }: { diagram?: string }) => {
  const markdownComponents = useMemo(() => getMarkdownComponents(false), []);
  const mermaidContent = useMemo(() => {
    if (!diagram) return '';
    return ['```mermaid', diagram, '```'].join('\n');
  }, [diagram]);

  return (
    <AsyncMarkdown components={markdownComponents} isUser={false}>
      {mermaidContent}
    </AsyncMarkdown>
  );
});

DiagramContent.displayName = 'DiagramContent';

export default function MermaidDiagram({ diagram, title = "Diagram", fullSize = false }: MermaidDiagramProps) {
  const [diagramRenderError, setDiagramRenderError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // initialize mermaid once
  useEffect(() => {
    try {
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'dark', 
        securityLevel: 'loose',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        flowchart: {
          useMaxWidth: !fullSize,
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
  }, [fullSize]);

  // render any mermaid diagrams present in the DOM whenever diagram changes
  useEffect(() => {
    if (!diagram) return;

    const renderDiagrams = async () => {
      // clear previous render error state
      setDiagramRenderError(null);
      const diagrams = document.querySelectorAll('.mermaid-diagram');
      for (const diagramElement of Array.from(diagrams)) {
        const code = diagramElement.textContent || '';
        if (code.trim() && !diagramElement.querySelector('svg')) {
          try {
            // Generate a safe, unique ID for mermaid
            const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(uniqueId, code.trim());
            diagramElement.innerHTML = svg;
            // Prevent SVG from being interactive during drag
            const svgElement = diagramElement.querySelector('svg');
            if (svgElement && fullSize) {
              svgElement.style.pointerEvents = 'none';
            }
          } catch (error) {
            console.warn('Failed to render mermaid diagram:', error);
            const msg = (error && (error as any).message) ? (error as any).message : String(error);
            setDiagramRenderError(msg || 'Unknown error');
            diagramElement.innerHTML = `<pre class="text-red-500 p-3 rounded bg-red-50">Failed to render diagram: ${msg}</pre>`;
          }
        }
      }
    };

    // slight delay so ReactMarkdown has mounted nodes
    const id = window.setTimeout(renderDiagrams, 100);
    return () => window.clearTimeout(id);
  }, [diagram, fullSize]);

  const handleCopySource = async () => {
    const src = diagram || '';
    try {
      await navigator.clipboard.writeText(src);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 1500);
    } catch (e) {
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(null), 1500);
    }
  };

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!fullSize) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [fullSize, position.x, position.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !fullSize) return;
    e.preventDefault();
    e.stopPropagation();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, fullSize, dragStart.x, dragStart.y]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!fullSize) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, [fullSize]);

  if (!diagram) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-[14px] font-mono text-white">{title}</h2>
        </div>
        <div className="p-6">
          <div className="p-8 text-center text-[14px] text-gray-400 font-mono">
            No diagram available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden ${fullSize ? 'h-full flex flex-col' : ''}`}>
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <h2 className="text-[14px] font-mono text-white">{title}</h2>
        <div className="flex items-center gap-3">
          {fullSize && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleZoomOut}
                className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-[14px] font-mono text-gray-400 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleZoomIn}
                className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleFitToScreen}
                className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
                title="Fit to Screen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleReset}
                className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleCopySource}
            className="text-[14px] font-mono h-8 px-3 hover:bg-white/[0.06]"
          >
            Copy Source
          </Button>
          {copyStatus && (
            <span className="text-[14px] text-green-400 font-mono">{copyStatus}</span>
          )}
        </div>
      </div>
      <div className={fullSize ? "flex-1 overflow-hidden relative" : "p-6"}>
        {diagramRenderError && (
          <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-lg ${fullSize ? 'absolute top-4 left-4 right-4 z-10' : 'mb-4'}`}>
            <div className="text-red-400 text-[14px] font-mono">
              Diagram Render Error: {diagramRenderError}
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className={fullSize ? "w-full h-full overflow-hidden flex items-center justify-center" : "overflow-x-auto"}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ 
            cursor: fullSize ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: fullSize ? 'none' : 'auto',
            WebkitUserSelect: fullSize ? 'none' : 'auto'
          }}
        >
          <div 
            className={fullSize ? "" : "min-h-[200px] flex items-center justify-center"}
            style={fullSize ? {
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              pointerEvents: 'none'
            } : {}}
          >
            <DiagramContent diagram={diagram} />
          </div>
        </div>
      </div>
    </div>
  );
}

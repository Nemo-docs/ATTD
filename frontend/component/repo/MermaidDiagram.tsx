"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MermaidDiagramProps {
  diagram?: string;
  title?: string;
  fullSize?: boolean;
  enableDialog?: boolean;
}

const Toolbar = React.memo(({
  fullSize, 
  title, 
  onZoomIn, 
  onZoomOut, 
  onFitToScreen, 
  onReset, 
  onCopySource, 
  copyStatus 
}: { 
  fullSize: boolean; 
  title: string; 
  onZoomIn: () => void; 
  onZoomOut: () => void; 
  onFitToScreen: () => void; 
  onReset: () => void; 
  onCopySource: () => void; 
  copyStatus: string | null; 
}) => {
  return (
    <div className="px-5 py-4 border-b border-white/[0.06] flex w-full items-center justify-between flex-shrink-0">
      <h2 className="text-[14px] font-mono text-white">{title}</h2>
      <div className="flex items-center gap-3">
        {fullSize && (
          <>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onZoomOut}
              className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onZoomIn}
              className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onFitToScreen}
              className="text-[14px] font-mono h-8 px-2 hover:bg-white/[0.06]"
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onReset}
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
          onClick={onCopySource}
          className="text-[14px] font-mono h-8 px-3 hover:bg-white/[0.06]"
        >
          Copy Source
        </Button>
        {copyStatus && (
          <span className="text-[14px] text-green-400 font-mono">{copyStatus}</span>
        )}
      </div>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

const DiagramArea = React.memo(({
  diagram, 
  diagramRenderError, 
  fullSize, 
  scale, 
  position, 
  isDragging, 
  containerRef, 
  onMouseDown, 
  onMouseMove, 
  onMouseUp, 
  onWheel 
}: { 
  diagram: string; 
  diagramRenderError: string | null; 
  fullSize: boolean; 
  scale: number; 
  position: { x: number; y: number; }; 
  isDragging: boolean; 
  containerRef: React.RefObject<HTMLDivElement | null>; 
  onMouseDown: (e: React.MouseEvent) => void; 
  onMouseMove: (e: React.MouseEvent) => void; 
  onMouseUp: () => void; 
  onWheel: (e: React.WheelEvent) => void; 
}) => {
  return (
    <div className={fullSize ? "flex-1 overflow-hidden" : ""}>
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
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ 
          cursor: fullSize ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: fullSize ? 'none' : 'auto',
          WebkitUserSelect: fullSize ? 'none' : 'auto'
        }}
      >
        <div 
          className={fullSize ? "" : "min-h-[500px] flex items-center justify-center"}
          style={fullSize ? {
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            pointerEvents: 'none'
          } : {}}
        >
          <pre className="mermaid-diagram whitespace-pre-wrap">{diagram}</pre>
        </div>
      </div>
    </div>
  );
});

DiagramArea.displayName = 'DiagramArea';

export default function MermaidDiagram({ diagram, title = "Diagram", fullSize = false, enableDialog = false }: MermaidDiagramProps) {
  const [diagramRenderError, setDiagramRenderError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hasFittedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFittingRef = useRef(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // initialize mermaid once
  useEffect(() => {
    try {
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'dark', 
        securityLevel: 'loose',
        fontFamily: '"Geist Mono", monospace',
        flowchart: {
          useMaxWidth: !fullSize,
          htmlLabels: true,
          curve: 'basis',
          diagramPadding: 20,
          nodeSpacing: 60,
          rankSpacing: 100
        },
        themeVariables: {
          primaryColor: '#262626',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#404040',
          lineColor: '#a0a0a0',
          secondaryColor: '#1b1b1b',
          tertiaryColor: '#333333'
        }
      });
    } catch (err) {
      console.warn('Mermaid initialization failed:', err);
    }
  }, [fullSize]);

  // Function to fit diagram to container
  const fitToContainer = useCallback(() => {
    if (isFittingRef.current) {
      console.log('fitToContainer already in progress, skipping');
      return;
    }
    isFittingRef.current = true;
    console.log('Starting fitToContainer');

    if (!containerRef.current || !fullSize) {
      isFittingRef.current = false;
      return;
    }

    const container = containerRef.current;
    const svg = container.querySelector('svg');
    if (!svg) {
      console.log('No SVG found in container');
      isFittingRef.current = false;
      return;
    }

    // Temporarily reset styles to get intrinsic size
    const originalWidth = svg.style.width;
    const originalHeight = svg.style.height;
    svg.style.width = '';
    svg.style.height = '';
    console.log('Reset SVG styles, original width/height:', originalWidth, originalHeight);

    const executeFit = () => {
      console.log('executeFit called');
      if (svg.children.length > 0) {
        console.log('Children present, proceeding with fit');
        // Use getBBox() for intrinsic content bounding box (accurate, style-independent)
        const bbox = svg.getBBox();
        console.log('SVG bbox:', bbox);
        const intrinsicWidth = bbox.width + (bbox.x * 2);  // Account for x offset (Mermaid padding)
        const intrinsicHeight = bbox.height + (bbox.y * 2);  // Account for y offset
        console.log('Calculated intrinsic dimensions:', { intrinsicWidth, intrinsicHeight });
        
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        console.log('Container dimensions:', { containerWidth, containerHeight });

        console.log('Intrinsic: containerWidth', containerWidth, 'intrinsicWidth', intrinsicWidth, 'intrinsicHeight', intrinsicHeight);

        if (intrinsicWidth > 0 && intrinsicHeight > 0) {
          const widthScale = containerWidth / intrinsicWidth;
          const heightScale = containerHeight / intrinsicHeight;
          const baseScale = Math.min(widthScale, heightScale);
          const fitScale = Math.min(baseScale * 0.85, 1.0);  // Higher multiplier for less padding (~50px sides)
          
          const scaledWidth = intrinsicWidth * fitScale;
          const scaledHeight = intrinsicHeight * fitScale;
          const sideSpace = (containerWidth - scaledWidth) / 2;

          console.log('Scale calculations:', { widthScale, heightScale, baseScale, fitScale });
          console.log('fitScale', fitScale, 'scaledWidth', scaledWidth, 'sideSpace', sideSpace);

          // Apply direct styling based on intrinsic
          svg.style.width = `${scaledWidth}px`;
          svg.style.height = `${scaledHeight}px`;
          svg.style.maxWidth = '100%';
          svg.style.maxHeight = '100%';
          svg.style.display = 'block';
          svg.style.margin = '0 auto';
          console.log('Applied SVG styles');

          setScale(1);  // Reset for interactions
          setPosition({ x: 0, y: 0 });
          hasFittedRef.current = true;
          console.log('Set hasFittedRef to true, reset scale and position');

          // Post-apply check
          setTimeout(() => {
            const finalRect = svg.getBoundingClientRect();
            console.log('Final rendered width', finalRect.width, 'Final side space', (containerRect.width - finalRect.width) / 2);
          }, 100);
        } else {
          console.log('Invalid intrinsic dimensions, skipping fit');
        }
      } else {
        console.log('No children yet in executeFit');
      }
    };

    // Check immediately if children are already present
    if (svg.children.length > 0) {
      console.log('Immediate check: children already present');
      executeFit();
      isFittingRef.current = false;
      return;
    }

    // Wait for stable render with observer
    const observer = new MutationObserver(() => {
      console.log('Observer triggered');
      if (svg.children.length > 0) {
        observer.disconnect();
        console.log('Observer disconnected, children length:', svg.children.length);
        executeFit();
      } else {
        console.log('Observer triggered but no children yet');
      }
    });
    console.log('Setting up observer on SVG');
    observer.observe(svg, { childList: true, subtree: true, attributes: true });

    // Fallback timeout: Just disconnect observer, no recursion
    setTimeout(() => {
      console.log('Fallback timeout reached');
      observer.disconnect();
      if (!hasFittedRef.current) {
        console.log('Fallback: checking children now');
        if (svg.children.length > 0) {
          console.log('Fallback: children now present');
          executeFit();
        } else {
          console.log('Fallback: still no children, fit failed');
        }
      } else {
        console.log('Fallback timeout reached but already fitted');
      }
      isFittingRef.current = false;
    }, 500);

    // Additional fallback: try executeFit after short delay
    setTimeout(() => {
      if (!hasFittedRef.current && svg.children.length > 0) {
        console.log('Additional timeout: executing fit');
        executeFit();
      }
      // Note: Don't set isFittingRef false here, let fallback handle it
    }, 100);

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
            if (svgElement && !fullSize) {
              svgElement.style.width = '700px';
              svgElement.style.height = 'auto';
              svgElement.style.maxWidth = '100%';
            }
            // Auto-fit if fullSize and not yet fitted
            if (fullSize && !hasFittedRef.current) {
              // Increased timeout to account for dialog animation
              setTimeout(fitToContainer, 300);
            }
          } catch (error) {
            console.warn('Failed to render mermaid diagram:', error);
            const msg = (error && (error as any).message) ? (error as any).message : String(error);
            setDiagramRenderError(msg || 'Unknown error');
            diagramElement.innerHTML = `<div class="text-red-500 p-3 rounded bg-red-50">Failed to render diagram: ${msg}</div>`;
          }
        }
      }
    };

    renderDiagrams();
  }, [diagram, fullSize, fitToContainer]);

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
    setScale(prev => Math.max(prev - 0.2, 0.1));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    fitToContainer();
  }, [fitToContainer]);

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
    setScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
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

  if (enableDialog && !fullSize) {
    return (
      <>
        <div 
          className="w-[750px] mx-auto cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => setIsDialogOpen(true)}
        >
          <MermaidDiagram 
            diagram={diagram}
            title={title}
            fullSize={false}
            enableDialog={false}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="h-[80vh] w-[1200px] sm:max-w-[1200px] max-w-none p-0">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <div className="h-full w-full overflow-hidden">
              <MermaidDiagram 
                diagram={diagram}
                title=""
                fullSize={true}
                enableDialog={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className={`bg-white/[0.02] w-full rounded-lg overflow-hidden ${fullSize ? 'h-full flex flex-col' : ''}`}>
      <Toolbar 
        fullSize={fullSize}
        title={title}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        onReset={handleReset}
        onCopySource={handleCopySource}
        copyStatus={copyStatus}
      />
      <DiagramArea 
        diagram={diagram}
        diagramRenderError={diagramRenderError}
        fullSize={fullSize}
        scale={scale}
        position={position}
        isDragging={isDragging}
        containerRef={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
}

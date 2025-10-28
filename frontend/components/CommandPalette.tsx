"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number; element: Element | null };
  onSubmit?: (value: string) => void;
}

export function CommandPalette({ open, onClose, position, onSubmit }: CommandPaletteProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the input when the palette opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (value.trim()) {
          onSubmit?.(value.trim());
          // onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose]);

  if (!open) return null;

  // If no valid cursor position, center the palette on screen
  const isValidPosition = position.element !== null && position.x > 0 && position.y > 0;

  // Calculate base position
  let baseLeft = isValidPosition ? position.x : window.innerWidth / 2;
  let baseTop = isValidPosition ? position.y : window.innerHeight * 0.2;

  // Box dimensions (approximate)
  const boxWidth = 450; // Between min 400px and max 500px
  const boxHeight = 120; // Approximate height based on content

  // Adjust position to keep box within viewport
  let finalLeft = baseLeft;
  let finalTop = baseTop;

  // Horizontal positioning: center on cursor but ensure box stays in viewport
  if (isValidPosition) {
    // Try to center on cursor, but clamp to viewport bounds
    const halfBoxWidth = boxWidth / 2;
    finalLeft = Math.max(halfBoxWidth, Math.min(window.innerWidth - halfBoxWidth, baseLeft));
  } else {
    finalLeft = window.innerWidth / 2;
  }

  // Vertical positioning: position above cursor, but ensure box stays in viewport
  if (isValidPosition) {
    // Position above cursor (baseTop is already position.y which includes the -8 offset)
    finalTop = Math.max(10, Math.min(window.innerHeight - boxHeight - 10, baseTop));
  } else {
    finalTop = window.innerHeight * 0.2;
  }

  const style = {
    left: finalLeft,
    top: finalTop,
    transform: isValidPosition ? 'translate(-50%, 0)' : 'translate(-50%, 0)',
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={style}
    >
      <div className="bg-background border border-border rounded-lg shadow-2xl p-4 min-w-[400px] max-w-[500px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Ask anything..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "pl-10 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground",
              "focus:border-ring focus:ring-1 focus:ring-ring",
              "text-sm h-10 rounded-md"
            )}
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        {/* {value && (
          <div className="mt-3 text-xs text-white/50 flex items-center gap-4">
            <span>Press Enter to execute</span>
            <span>•</span>
            <span>Esc to close</span>
          </div>
        )} */}
        {/* {!value && (
          <div className="mt-3 text-xs text-white/30">
            Start typing to create new section...
          </div>
        )} */}
      </div>
    </div>
  );
}

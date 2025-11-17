"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DefinitionMentionDropdown } from '@/component/page_components/DefinitionMentionDropdown';
import { X, Undo } from 'lucide-react';

export type BlockType = 'h1' | 'h2' | 'h3' | 'text' | 'code' | 'command';

interface SlashCommand {
  label: string;
  description: string;
  type: BlockType;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { label: 'h1', description: 'Heading 1', type: 'h1' },
  { label: 'h2', description: 'Heading 2', type: 'h2' },
  { label: 'h3', description: 'Heading 3', type: 'h3' },
  { label: 'text', description: 'Normal text', type: 'text' },
  { label: 'code', description: 'Code snippet', type: 'code' },
];

interface Definition {
  node_type: 'file' | 'class' | 'function';
  node_name: string;
  code_snippet: string;
  start_end_lines: number[];
  file_name: string;
}

interface SingleLineMarkdownBlockProps {
  content: string;
  type: BlockType;
  isFocused?: boolean;
  isSelected?: boolean;
  onChange: (content: string) => void;
  onTypeChange: (type: BlockType) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onEnter?: () => void;
  onInsertAbove?: (type?: BlockType) => void;
  onBackspaceAtStart?: () => void;
  onOverflow?: (overflowText: string) => void;
  className?: string;
  repoId?: string;
  findMatches?: (query: string) => Definition[];
  onCommandSubmit?: (value: string) => void;
  commandState?: { loading: boolean; error: string | null; insertedCount?: number };
  onClose?: () => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  onUndo?: () => void;
}

export function SingleLineMarkdownBlock({
  content,
  type,
  isFocused = false,
  isSelected = false,
  onChange,
  onTypeChange,
  onFocus,
  onBlur,
  onNavigateUp,
  onNavigateDown,
  onEnter,
  onInsertAbove,
  onBackspaceAtStart,
  onOverflow,
  className,
  repoId,
  findMatches,
  onCommandSubmit,
  commandState,
  onClose,
  onPaste,
  onUndo,
}: SingleLineMarkdownBlockProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>(SLASH_COMMANDS);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCheckingOverflow, setIsCheckingOverflow] = useState(false);
  const prevFocusedRef = useRef(false);

  // Sync overlay height with input/textarea height
  useEffect(() => {
    if (inputRef.current && overlayRef.current) {
      if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        overlayRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      } else {
        overlayRef.current.style.height = `${inputRef.current.offsetHeight}px`;
      }
    }
  }, [content, type]);

  // Focus management - only reset cursor when focus state changes, not on content changes
  useEffect(() => {
    if (isFocused && inputRef.current) {
      const wasFocused = prevFocusedRef.current;
      inputRef.current.focus();
      // Only place cursor at the end when first receiving focus, not on every content change
      if (!wasFocused) {
        // Read directly from input element to avoid stale closure issues
        const currentContent = inputRef.current.value;
        if (inputRef.current instanceof HTMLInputElement) {
          inputRef.current.setSelectionRange(currentContent.length, currentContent.length);
        } else if (inputRef.current instanceof HTMLTextAreaElement) {
          inputRef.current.setSelectionRange(currentContent.length, currentContent.length);
        }
      }
      prevFocusedRef.current = true;
    } else {
      prevFocusedRef.current = false;
    }
  }, [isFocused]); // Only depend on isFocused, not content.length

  // Calculate exact overflow point using scrollWidth
  const calculateOverflowPoint = (element: HTMLElement): number => {
    const text = (element as HTMLInputElement).value || element.textContent || '';
    if (!text) return 0;

    // If no overflow, return full length
    if (element.scrollWidth <= element.clientWidth) {
      return text.length;
    }

    // Create a temporary span to measure text
    const measureElement = document.createElement('span');
    const computedStyle = window.getComputedStyle(element);
    
    measureElement.style.font = computedStyle.font;
    measureElement.style.fontSize = computedStyle.fontSize;
    measureElement.style.fontFamily = computedStyle.fontFamily;
    measureElement.style.fontWeight = computedStyle.fontWeight;
    measureElement.style.letterSpacing = computedStyle.letterSpacing;
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.padding = computedStyle.padding;
    measureElement.style.border = computedStyle.border;

    document.body.appendChild(measureElement);

    const containerWidth = element.clientWidth - 
      parseInt(computedStyle.paddingLeft) - 
      parseInt(computedStyle.paddingRight) - 
      parseInt(computedStyle.borderLeftWidth) - 
      parseInt(computedStyle.borderRightWidth);

    let exactFit = 0;
    
    // Binary search to find exact overflow point
    let left = 0;
    let right = text.length;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const testText = text.substring(0, mid);
      measureElement.textContent = testText;
      
      if (measureElement.offsetWidth <= containerWidth) {
        exactFit = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    document.body.removeChild(measureElement);
    return exactFit;
  };

  // Overflow detection for headings and text
  const checkOverflow = () => {
    if (!inputRef.current || !onOverflow || isCheckingOverflow) return;

    // Apply overflow detection to headings and text
    if (type !== 'h1' && type !== 'h2' && type !== 'h3' && type !== 'text') return;

    const element = inputRef.current;
    const text = content;

    if (!text || text.length <= 1) return;

    // Check if there's actual overflow
    const hasOverflow = element.scrollWidth > element.clientWidth + 2;

    if (hasOverflow) {
      setIsCheckingOverflow(true);

      const overflowPoint = calculateOverflowPoint(element);

      // Only proceed if we have overflow
      if (overflowPoint < text.length) {
        let breakPoint = overflowPoint;

        // For text with spaces, try to break at word boundary
        const hasSpaces = text.includes(' ');
        if (hasSpaces && overflowPoint > 0) {
          // Look for the last space before the overflow point
          for (let i = Math.min(overflowPoint, text.length - 1); i >= 0; i--) {
            if (text[i] === ' ') {
              breakPoint = i;
              break;
            }
          }
        }
        // For continuous text (like 'hhhhhh'), breakPoint remains as overflowPoint

        const currentText = text.substring(0, breakPoint);
        const remainingText = text.substring(breakPoint);

        if (remainingText) {
          // Update current block content
          onChange(currentText);
          // Trigger overflow with remaining text
          onOverflow(remainingText);
        }
      }

      setTimeout(() => setIsCheckingOverflow(false), 10);
    }
  };

  // Check for overflow after content changes
  useEffect(() => {
    if (content && (type === 'h1' || type === 'h2' || type === 'h3' || type === 'text')) {
      // Delay to ensure DOM has updated
      const timeoutId = setTimeout(checkOverflow, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [content, type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    onChange(value);

    // Check for @ mention (only if repoId and findMatches are provided)
    if (repoId && findMatches) {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        // Check if there's text after @ and no space/newline
        if (textAfterAt.trim() && !textAfterAt.includes('\n') && !textAfterAt.includes(' ')) {
          setMentionQuery(textAfterAt);
          setShowMentionDropdown(true);
          setSelectedMentionIndex(0);

          // Calculate dropdown position
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMentionPosition({
              top: rect.bottom + 4,
              left: rect.left,
            });
          }
        } else {
          setShowMentionDropdown(false);
        }
      } else {
        setShowMentionDropdown(false);
      }
    }

    // Check for slash command only for non-command types
    if (type !== 'command') {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

      if (lastSlashIndex !== -1) {
        const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
        const isAtStart = lastSlashIndex === 0;

        if (isAtStart && !textAfterSlash.includes('\n') && !textAfterSlash.includes(' ')) {
          // Show slash menu
          const filtered = SLASH_COMMANDS.filter(cmd =>
            cmd.label.toLowerCase().startsWith(textAfterSlash.toLowerCase()) ||
            cmd.description.toLowerCase().includes(textAfterSlash.toLowerCase())
          );
          setFilteredCommands(filtered);
          setSelectedCommandIndex(0);
          setShowSlashMenu(true);

          // Calculate menu position
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setSlashMenuPosition({
              top: rect.bottom + 4,
              left: rect.left,
            });
          }
        } else {
          setShowSlashMenu(false);
        }
      } else {
        setShowSlashMenu(false);
      }
    }
  };

  const insertCommand = (command: SlashCommand) => {
    onTypeChange(command.type);
    onChange(''); // Clear content when changing type
    setShowSlashMenu(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Find all @mentions in the content that match definitions
  const getMatchedMentions = (): Array<{start: number, end: number, text: string}> => {
    if (!repoId || !findMatches) return [];
    
    const mentions: Array<{start: number, end: number, text: string}> = [];
    const regex = /@([\w.]+)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const mentionText = match[1];
      const matches = findMatches(mentionText);
      
      // Only highlight if there's an exact match
      if (matches.some(def => def.node_name === mentionText)) {
        mentions.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });
      }
    }
    
    return mentions;
  };

  // Create highlighted text overlay
  const createHighlightOverlay = (): string | null => {
    const matchedMentions = getMatchedMentions();
    if (matchedMentions.length === 0) return null;

    // Helper function to escape only essential HTML entities
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    let highlightedText = '';
    let lastIndex = 0;

    matchedMentions.forEach(mention => {
      // Add text before mention (escaped)
      highlightedText += escapeHtml(content.substring(lastIndex, mention.start));
      // Add highlighted mention with mark tag (no padding/border to avoid size changes)
      highlightedText += `<mark class="bg-blue-100/50 dark:bg-blue-500/20">${escapeHtml(mention.text)}</mark>`;
      lastIndex = mention.end;
    });

    // Add remaining text (escaped)
    highlightedText += escapeHtml(content.substring(lastIndex));
    return highlightedText;
  };

  const matchedDefinitions = findMatches ? findMatches(mentionQuery) : [];

  const handleMentionSelect = (definition: Definition) => {
    const atIndex = content.lastIndexOf('@');
    const beforeAt = content.substring(0, atIndex);
    const newValue = `${beforeAt}@${definition.node_name} `;
    onChange(newValue);
    setShowMentionDropdown(false);
    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention dropdown keys first, for all types
    if (showMentionDropdown && matchedDefinitions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedMentionIndex(prev =>
            prev < matchedDefinitions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedMentionIndex(prev =>
            prev > 0 ? prev - 1 : matchedDefinitions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (matchedDefinitions[selectedMentionIndex]) {
            handleMentionSelect(matchedDefinitions[selectedMentionIndex]);
          }
          break;
        case 'Escape':
          setShowMentionDropdown(false);
          break;
        default:
          // Let other keys be handled normally
          break;
      }
      return;
    }

    // Handle slash menu keys only for non-command
    if (type !== 'command' && showSlashMenu) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCommandIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands.length > 0) {
            insertCommand(filteredCommands[selectedCommandIndex]);
          }
          break;
        case 'Escape':
          setShowSlashMenu(false);
          break;
      }
      return;
    }

    // Handle Ctrl+K only for non-command
    if (type !== 'command' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      onInsertAbove?.('command');
      return;
    }

    // Handle command-specific keys
    if (type === 'command') {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!commandState?.loading) {
          onCommandSubmit?.(content);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        setShowMentionDropdown(false);
        setShowSlashMenu(false);
        return;
      }
    }

    // Handle navigation and other keys for all types
    const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    switch (e.key) {
      case 'ArrowUp':
        if (target.selectionStart === 0) {
          e.preventDefault();
          onNavigateUp?.();
        }
        break;
      case 'ArrowDown':
        if (target.selectionStart === target.value.length) {
          e.preventDefault();
          onNavigateDown?.();
        }
        break;
      case 'Enter':
        if (type !== 'command' && !e.shiftKey) {
          e.preventDefault();
          onEnter?.();
        }
        break;
      case 'Backspace':
        if (target.selectionStart === 0 && content === '') {
          e.preventDefault();
          onBackspaceAtStart?.();
        }
        break;
    }
  };

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    // Delay blur to allow menu clicks
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowSlashMenu(false);
        setShowMentionDropdown(false);
        onBlur?.();
      }
    }, 100);
  };

  const renderInput = () => {
    if (type === 'command') {
      const isLoading = Boolean(commandState?.loading);
      const matchedMentions = getMatchedMentions();
      const highlightOverlay = createHighlightOverlay();
      return (
        <div className={cn("relative w-full max-w-xl rounded-xl", className)}>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="absolute right-2 top-2 z-50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close command block"
          >
            <X className="h-3 w-3" />
          </button>
          {/* Highlight overlay for command */}
          {matchedMentions.length > 0 && highlightOverlay && (
            <>
              <style dangerouslySetInnerHTML={{
                __html: `
                  .highlight-overlay-markdown mark {
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    display: inline !important;
                    line-height: inherit !important;
                    font-size: inherit !important;
                    font-family: inherit !important;
                    font-weight: inherit !important;
                    background-color: rgba(59, 130, 246, 0.1) !important;
                  }
                `
              }} />
              <div 
                ref={overlayRef}
                className="highlight-overlay-markdown absolute inset-0 pointer-events-none font-mono text-[10px] overflow-hidden pl-2 pr-8 pt-2 pb-2 z-1"
                style={{
                  color: 'transparent',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxSizing: 'border-box',
                  lineHeight: 'inherit'
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightOverlay
                }}
              />
            </>
          )}
          <Textarea
            ref={inputRef as any}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPaste={onPaste}
            disabled={isLoading}
            placeholder="Press Shift+Enter for newline"
            className="min-h-[80px] w-full resize-none bg-transparent pr-8 pl-2 pt-2 pb-2 font-mono !text-[10px] leading-tight text-white focus-visible:ring-0 focus-visible:ring-offset-0 relative z-10"
          />
          {commandState?.insertedCount && commandState.insertedCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUndo?.();
              }}
              className="absolute bottom-2 right-2 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-background border hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Undo response"
            >
              <Undo className="h-3 w-3" />
            </button>
          )}
        </div>
      );
    }

    // Base classes with markdown editor-style spacing
    const getBaseClasses = () => {
      if (type === 'code') {
        // Code blocks: background color and rounded corners
        return "border-none bg-gray-100 dark:bg-gray-800 !bg-gray-100 dark:!bg-gray-800 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md p-3 !leading-tight";
      }
      const base = "border-none bg-transparent !bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0";
      if (type === 'text') {
        // Standard markdown editor: normal line-height (1.5), no padding, minimal height
        return `${base} !p-0 !h-auto !py-0 !px-0 !m-0 !leading-normal`;
      }
      return `${base} p-0 !leading-tight`;
    };

    // Get font classes based on type - matching classical markdown editor conventions
    const getFontClasses = () => {
      switch (type) {
        case 'h1': return "!text-3xl !font-bold";
        case 'h2': return "!text-2xl !font-bold";
        case 'h3': return "!text-xl !font-bold";
        case 'code': return "!font-mono !text-sm"; // Monospace only for code
        default: return "!text-base !font-sans"; // Standard sans-serif font for text (not monospace)
      }
    };

    // Get overlay classes to match input styles exactly
    const getOverlayClasses = () => {
      const fontClasses = getFontClasses();
      if (type === 'code') {
        // Code has p-3 padding and rounded-md
        return `absolute top-0 left-0 right-0 pointer-events-none font-mono text-sm overflow-hidden rounded-md p-3 leading-tight`;
      }
      if (type === 'text') {
        // Text has no padding, normal line-height
        return `absolute top-0 left-0 right-0 pointer-events-none text-base font-sans overflow-hidden p-0 m-0 leading-normal`;
      }
      // For headings - no padding, tight line-height
      return `absolute top-0 left-0 right-0 pointer-events-none ${fontClasses} overflow-hidden p-0 m-0 leading-tight`;
    };

    const commonProps = {
      ref: inputRef as any,
      value: content,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onPaste,
      className: cn(getBaseClasses(), getFontClasses(), className),
    //   placeholder: type === 'code' ? 'Enter code...' : `Type '/' for commands or enter ${type}...`,
    };

    const matchedMentions = getMatchedMentions();
    const highlightOverlay = createHighlightOverlay();

    if (type === 'code') {
      return (
        <div className="relative">
          {/* Highlight overlay for code */}
          {matchedMentions.length > 0 && highlightOverlay && (
            <>
              <style dangerouslySetInnerHTML={{
                __html: `
                  .highlight-overlay-markdown mark {
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    display: inline !important;
                    line-height: inherit !important;
                    font-size: inherit !important;
                    font-family: inherit !important;
                    font-weight: inherit !important;
                  }
                `
              }} />
              <div 
                ref={overlayRef}
                className={cn("highlight-overlay-markdown", getOverlayClasses())}
                style={{
                  color: 'transparent',
                  zIndex: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxSizing: 'border-box',
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightOverlay
                }}
              />
            </>
          )}
          <Textarea
            {...commonProps}
            className={cn(commonProps.className, "min-h-[60px] relative z-10")}
          />
        </div>
      );
    }

    // Different heights for different heading types - reduced for tighter spacing
    const getInputHeight = () => {
      switch (type) {
        case 'h1': return "min-h-[48px]";
        case 'h2': return "min-h-[40px]";
        case 'h3': return "min-h-[32px]";
        default: return "!min-h-0 !h-auto"; // Remove all height constraints for text blocks
      }
    };

    return (
      <div className="relative">
        {/* Highlight overlay for headings and text */}
        {matchedMentions.length > 0 && highlightOverlay && (
          <>
            <style dangerouslySetInnerHTML={{
              __html: `
                .highlight-overlay-markdown mark {
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  display: inline !important;
                  line-height: inherit !important;
                  font-size: inherit !important;
                  font-family: inherit !important;
                  font-weight: inherit !important;
                }
              `
            }} />
            <div 
              ref={overlayRef}
              className={cn("highlight-overlay-markdown", getOverlayClasses())}
              style={{
                color: 'transparent',
                zIndex: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxSizing: 'border-box',
              }}
              dangerouslySetInnerHTML={{
                __html: highlightOverlay
              }}
            />
          </>
        )}
        <Input
          {...commonProps}
          className={cn(commonProps.className, getInputHeight(), "relative z-10")}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative group">
      <div className="flex items-center gap-2">
        {/* Block type indicator */}
        <div className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {type === 'h1' && '#'}
          {type === 'h2' && '##'}
          {type === 'h3' && '###'}
          {type === 'code' && '</>'}
          {type === 'text' && 'T'}
          {type === 'command' && '↗'}
        </div>

        {/* Input */}
        <div className="flex-1">
          {renderInput()}
        </div>
      </div>

      {/* Definition Mention Dropdown */}
      {showMentionDropdown && matchedDefinitions.length > 0 && findMatches && (
        <DefinitionMentionDropdown
          definitions={matchedDefinitions}
          selectedIndex={selectedMentionIndex}
          onSelect={handleMentionSelect}
          position={mentionPosition}
        />
      )}

      {/* Slash Command Menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div
          className="fixed z-50 bg-background border border-border rounded-md shadow-lg min-w-[250px] text-[10px] mt-2"
          style={{
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
          }}
        >
          {filteredCommands.map((cmd, index) => (
            <div
              key={cmd.label}
              onClick={() => insertCommand(cmd)}
              className={cn(
                "px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-accent",
                index === selectedCommandIndex && "bg-accent"
              )}
            >
              <div>
                <div className="font-mono">/{cmd.label}</div>
                {/* <div className="text-xs text-muted-foreground">{cmd.description}</div> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

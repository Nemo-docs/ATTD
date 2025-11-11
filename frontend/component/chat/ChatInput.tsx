'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Network, Brain, FileText, Code, FunctionSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDefinitions } from '@/hooks/useDefinitions';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  diagramMode: boolean;
  onToggleDiagramMode: () => void;
  uiMode?: 'Simple' | 'Detailed';
  thinkLevel?: 'simple' | 'detailed';
  onToggleThinkLevel?: () => void;
  onToggleUiMode?: () => void;
  canvasOpen: boolean;
  hasMessages: boolean;
  repoId?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isLoading,
  diagramMode,
  onToggleDiagramMode,
  uiMode,
  onToggleUiMode,
  thinkLevel,
  onToggleThinkLevel,
  canvasOpen,
  hasMessages,
  repoId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { findMatches } = useDefinitions(repoId || '');

  // Find all @mentions in the input that match definitions
  const getMatchedMentions = () => {
    const mentions: Array<{start: number, end: number, text: string}> = [];
    const regex = /@([\w.]+)/g;
    let match;
    
    while ((match = regex.exec(inputValue)) !== null) {
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
    console.log(mentions);
    
    return mentions;
  };

  // Auto-resize textarea and sync overlay height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      
      // Sync overlay height
      if (overlayRef.current) {
        overlayRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [inputValue]);

  // Handle @ mention logic
  useEffect(() => {
    const atIndex = inputValue.lastIndexOf('@');
    if (atIndex !== -1 && atIndex < inputValue.length - 1) {
      const afterAt = inputValue.substring(atIndex + 1);
      // Check if there's text after @ and no space/newline
      if (afterAt.trim() && !afterAt.includes('\n') && !afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        setShowMentions(true);
        setSelectedIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [inputValue]);

  const matchedDefinitions = findMatches(mentionQuery);

  const handleMentionSelect = (definition: any) => {
    const atIndex = inputValue.lastIndexOf('@');
    const beforeAt = inputValue.substring(0, atIndex);
    const newValue = `${beforeAt}@${definition.node_name} `;
    onInputChange(newValue);
    setShowMentions(false);
    // Focus back to textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && matchedDefinitions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < matchedDefinitions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : matchedDefinitions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (matchedDefinitions[selectedIndex]) {
            handleMentionSelect(matchedDefinitions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowMentions(false);
          break;
        default:
          // Let other keys be handled by the original onKeyPress
          onKeyPress(e);
      }
    } else {
      onKeyPress(e);
    }
  };

  const getIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'function':
        return <FunctionSquare className="h-4 w-4" />;
      case 'class':
        return <Code className="h-4 w-4" />;
      case 'file':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Create highlighted text overlay
  const createHighlightOverlay = () => {
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
      highlightedText += escapeHtml(inputValue.substring(lastIndex, mention.start));
      // Add highlighted mention with mark tag (no padding/border to avoid size changes)
      highlightedText += `<mark class="bg-blue-100/50 dark:bg-blue-500/20">${escapeHtml(mention.text)}</mark>`;
      lastIndex = mention.end;
    });

    // Add remaining text (escaped)
    highlightedText += escapeHtml(inputValue.substring(lastIndex));
    console.log(highlightedText);
    return highlightedText;
  };

  // Render a compact floating input bar that overlays the chat
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      {/* Dropdown positioned above the input container */}
      {showMentions && matchedDefinitions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute bottom-full left-4 right-4 mb-3 z-50"
        >
          <div className="bg-popover/95 text-popover-foreground border border-border rounded-lg shadow-xl backdrop-blur-md">
            <div className="p-1 max-h-[280px] overflow-y-auto scrollbar-hide">
              <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border mb-1">
                Definitions ({matchedDefinitions.length})
              </div>
              {matchedDefinitions.map((definition, index) => (
                <button
                  key={`${definition.node_type}-${definition.node_name}-${definition.file_name}-${definition.start_end_lines?.[0] || index}`}
                  onClick={() => handleMentionSelect(definition)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-colors ${
                    index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getIcon(definition.node_type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate font-mono text-sm">{definition.node_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {definition.node_type} in {definition.file_name}
                        {definition.start_end_lines?.[0] && ` (line ${definition.start_end_lines[0]})`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={inputContainerRef} className="bg-sidebar/80 backdrop-blur-sm border border-border rounded-xl shadow-lg px-3 py-2 flex items-center gap-3">
        {/* Diagram toggle - compact icon button */}
        <Button
          variant={diagramMode ? 'default' : 'ghost'}
          size="icon"
          onClick={onToggleDiagramMode}
          title={diagramMode ? 'Disable diagram mode' : 'Enable diagram mode'}
          className={diagramMode ? 'bg-primary text-primary-foreground' : ''}
        >
          <Network className="h-4 w-4" />
        </Button>

        {/* Think level (brain icon) - toggles simple/detailed thinking */}
        <Button
          variant={thinkLevel === 'detailed' ? 'default' : 'ghost'}
          size="icon"
          onClick={onToggleThinkLevel}
          title={thinkLevel === 'detailed' ? 'Thinking: detailed' : 'Thinking: simple'}
          className={thinkLevel === 'detailed' ? 'bg-primary text-primary-foreground' : ''}
        >
          <Brain className="h-4 w-4" />
        </Button>

        {/* Input - single-line textarea styled compactly */}
        <div className="flex-1 relative">
          {/* Highlight overlay */}
          {getMatchedMentions().length > 0 && (
            <>
              <style dangerouslySetInnerHTML={{
                __html: `
                  .highlight-overlay mark {
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
                className="highlight-overlay absolute top-0 left-0 right-0 pointer-events-none font-mono text-sm overflow-hidden px-3 py-2"
                style={{
                  color: 'transparent',
                  zIndex: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 'inherit'
                }}
                dangerouslySetInnerHTML={{
                  __html: createHighlightOverlay() || ''
                }}
              />
            </>
          )}
          
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className="min-h-[36px] max-h-32 resize-none pr-12 font-mono text-sm bg-transparent border-0 focus:ring-0 relative z-10 leading-normal"
            style={{ backgroundColor: 'transparent' }}
            disabled={isLoading}
          />
          
          <div className="absolute right-2 bottom-2 text-[11px] text-muted-foreground font-mono z-20">
            {inputValue.length}/2000
          </div>
        </div>

        {/* Send button */}
        <Button
          onClick={onSendMessage}
          disabled={!inputValue.trim() || isLoading}
          size="icon"
          className="h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

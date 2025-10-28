'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Network, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Render a compact floating input bar that overlays the chat
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <div className="bg-sidebar/80 backdrop-blur-sm border border-border rounded-xl shadow-lg px-3 py-2 flex items-center gap-3">
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
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyPress}
            placeholder="Type your message here..."
            className="min-h-[36px] max-h-32 resize-none pr-12 font-mono text-sm bg-transparent border-0 focus:ring-0"
            disabled={isLoading}
          />
          <div className="absolute right-2 bottom-2 text-[11px] text-muted-foreground font-mono">
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

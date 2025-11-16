'use client';

import React from 'react';
import { Copy, Bot, User, Network } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import AsyncMarkdown from './AsyncMarkdown';
import { getMarkdownComponents } from './MarkdownComponents';

interface ChatMessageProps {
  message: ChatMessageType;
  onCopyMessage: (content: string) => void;
  onAddToCanvas: (content: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onCopyMessage,
  onAddToCanvas,
}) => {
  return (
    <div className="flex gap-3 group">
      {/* <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
        {message.role === 'user' ? (
          <>
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="" />
            <AvatarFallback className="bg-muted">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar> */}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* <span className="text-xs font-medium text-muted-foreground font-mono">
            {message.role === 'user' ? 'You' : 'Assistant'}
          </span> */}
          {message.diagramMode && (
            <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-mono">
              <Network className="h-3 w-3" />
              <span>Diagram</span>
            </div>
          )}
          {/* <span className="text-xs text-muted-foreground font-mono">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span> */}
        </div>

        <Card className={`${message.role === 'user'
          ? `bg-primary text-primary-foreground ml-auto max-w-[60%] min-w-fit ${message.diagramMode ? 'ring-2 ring-primary/30 shadow-lg' : ''} py-2`
          : `bg-muted max-w-[75%] min-w-fit ${message.diagramMode ? 'ring-2 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 shadow-lg' : ''} py-2`
        }`}>
          <CardContent className="px-3 py-2">
            <div className="text-sm leading-relaxed font-mono">
              <AsyncMarkdown
                components={getMarkdownComponents(message.role === 'user')}
                isUser={message.role === 'user'}
              >
                {message.content}
              </AsyncMarkdown>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-1 mt-1 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCopyMessage(message.content)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          {message.role === 'assistant' && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-[12px] font-mono bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10 focus:ring-2 focus:ring-primary/20"
              onClick={() => onAddToCanvas(message.content)}
            >
              Add to Canvas
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface LoadingMessageProps {}

export const LoadingMessage: React.FC<LoadingMessageProps> = () => {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
        <AvatarFallback className="bg-muted">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground font-mono">
            Assistant
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            typing...
          </span>
        </div>

        <Card className="bg-muted max-w-[75%] min-w-fit py-2">
          <CardContent className="px-3 py-2">
            <div className="flex items-center gap-1">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

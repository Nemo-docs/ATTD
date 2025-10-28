'use client';

import React from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Canvas from '@/components/Canvas';
import { ChatMessage, LoadingMessage } from '@/component/chat/ChatMessage';
import { ChatInput } from '@/component/chat/ChatInput';
import { ChatHistory } from '@/component/chat/ChatHistory';
import { useChat } from '@/hooks/useChat';
import { useMermaid } from '@/hooks/useMermaid';

interface ChatPageProps {
  pageId?: string;
}

export default function ChatPage({ pageId }: ChatPageProps = {}) {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    currentPageId,
    currentConversation,
    conversations,
    showHistory,
    setShowHistory,
    diagramMode,
    setDiagramMode,
    canvasOpen,
    setCanvasOpen,
    canvasRef,
    scrollAreaRef,
    suggestedPrompts,
    handleSuggestionClick,
    handleSendMessage,
    handleKeyPress,
    copyMessage,
    addToCanvas,
    newConversation,
    loadConversation,
    thinkLevel,
    setThinkLevel,
  } = useChat({ pageId });

  // Initialize mermaid rendering
  useMermaid(messages, canvasOpen);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ChatHistory
        conversations={conversations}
        currentConversation={currentConversation}
        showHistory={showHistory}
        onNewConversation={newConversation}
        onLoadConversation={loadConversation}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 relative">
        {/* Header */}
        {/* <div className="flex items-center justify-between p-4 border-b bg-sidebar/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(s => !s)}
              className="h-8 w-8"
              title="Toggle conversations"
            >
              <History className="h-4 w-4" />
            </Button>

            {currentPageId && (
              <span className="text-sm text-muted-foreground font-mono">
                (Page {currentPageId})
              </span>
            )}
          </div>

          <div />
        </div> */}

        {/* Content Area - Messages and Canvas side by side when canvas is open */}
        <div className="flex flex-1 flex-col min-h-0">
          {/* Top row: Messages and optional Canvas */}
        <div className={`flex flex-1 min-h-0 ${canvasOpen ? '' : (messages.length === 0 ? 'justify-center items-center' : '')}`}>
            {/* Messages Section */}
            <div className={`${canvasOpen ? 'w-1/2' : 'w-full'} flex flex-col flex-1 min-h-0 pb-24`}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 px-4">
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold font-mono">Nemo Docs</h2>

                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {suggestedPrompts.map((p) => (
                          <Button
                            key={p}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(p)}
                            className="font-mono"
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
                <div className={`space-y-4 p-4 ${canvasOpen ? '' : 'max-w-3xl mx-auto'}`}>
                  {messages.map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onCopyMessage={copyMessage}
                        onAddToCanvas={addToCanvas}
                      />
                    ))}

                    {isLoading && <LoadingMessage />}
                </div>
              </ScrollArea>
              )}
            </div>

            {/* Canvas Panel */}
            {canvasOpen && (
              <div className="w-1/2 border-l flex flex-col min-h-0">
                <Canvas ref={canvasRef} title="Canvas" onClose={() => setCanvasOpen(false)} />
              </div>
            )}
          </div>

          {/* Bottom: Input Area */}
          <ChatInput
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            isLoading={isLoading}
            diagramMode={diagramMode}
            onToggleDiagramMode={() => setDiagramMode(!diagramMode)}
            thinkLevel={thinkLevel}
            onToggleThinkLevel={() => setThinkLevel(t => (t === 'simple' ? 'detailed' : 'simple'))}
            canvasOpen={canvasOpen}
            hasMessages={messages.length > 0}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { ChatConversation } from '@/types/chat';

interface ChatHistoryProps {
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  showHistory: boolean;
  onNewConversation: () => void | Promise<void>;
  onLoadConversation: (conversation: ChatConversation) => void | Promise<void>;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  conversations,
  currentConversation,
  showHistory,
  onNewConversation,
  onLoadConversation,
}) => {
  return (
    <div className={`${showHistory ? 'w-80' : 'w-0'} border-r bg-sidebar/50 backdrop-blur-sm flex flex-col transition-all duration-300 overflow-hidden`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-mono">Conversations</h2>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-left h-auto p-3 font-mono"
            onClick={() => {
              void onNewConversation();
            }}
          >
            <div className="flex items-center gap-2 w-full">
              <Plus className="h-4 w-4" />
              <span>New Conversation</span>
            </div>
          </Button>

          {conversations.map((conversation) => {
            const messageTotal = conversation.messageCount ?? conversation.messages.length;

            return (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-colors hover:bg-sidebar-accent/50 ${
                currentConversation?.id === conversation.id ? 'bg-sidebar-accent' : ''
              }`}
              onClick={() => {
                void onLoadConversation(conversation);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm font-mono truncate">
                      {conversation.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {messageTotal} messages
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {conversation.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

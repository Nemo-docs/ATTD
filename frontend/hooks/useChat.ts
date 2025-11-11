import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { chatQaApi } from '@/lib/api';
import { resolveUserId } from '@/lib/user';
import { useDefinitions } from '@/hooks/useDefinitions';
import { ChatMessage, ChatConversation } from '@/types/chat';
import { ChatQaRequest, ChatConversationRequest, ChatConversationResponse, ChatQaResponse } from '@/types/chat-qa';

interface UseChatProps {
  pageId?: string;
}

const normalizeConversationSummary = (conversation: ChatConversationResponse): ChatConversation => {
  const createdAtRaw = (conversation as any).created_at ?? conversation.createdAt;
  const updatedAtRaw = (conversation as any).updated_at ?? conversation.updatedAt;
  const messageCountRaw = (conversation as any).message_count ?? conversation.messageCount ?? 0;

  return {
    id: conversation.id,
    title: conversation.title,
    messages: [],
    createdAt: createdAtRaw ? new Date(createdAtRaw) : new Date(),
    updatedAt: updatedAtRaw ? new Date(updatedAtRaw) : new Date(),
    messageCount: typeof messageCountRaw === 'number' ? messageCountRaw : 0,
  };
};

const hydrateConversationMessages = (
  records: ChatQaResponse[],
  fallbackConversationId?: string,
  fallbackPageId?: string,
): ChatMessage[] => {
  const entries: ChatMessage[] = [];

  records.forEach(record => {
    const id = record.id;
    const messageContent = (record as any).message ?? record.message;
    const responseContent = (record as any).response ?? record.response;
    const conversationIdValue = (record as any).conversation_id ?? record.conversationId ?? fallbackConversationId;
    const pageIdValue = (record as any).page_id ?? record.pageId ?? fallbackPageId;
    const createdAtRaw = (record as any).created_at ?? record.createdAt;
    const diagramModeRaw = (record as any).diagram_mode ?? record.diagramMode ?? false;
    const timestamp = createdAtRaw ? new Date(createdAtRaw) : new Date();

    if (messageContent) {
      entries.push({
        id: `${id}-user`,
        content: messageContent,
        role: 'user',
        timestamp,
        pageId: pageIdValue,
        conversationId: conversationIdValue,
        diagramMode: Boolean(diagramModeRaw),
      });
    }

    if (responseContent) {
      entries.push({
        id,
        content: responseContent,
        role: 'assistant',
        timestamp,
        pageId: pageIdValue,
        conversationId: conversationIdValue,
        diagramMode: Boolean(diagramModeRaw),
      });
    }
  });

  return entries;
};

export const useChat = ({ pageId }: UseChatProps = {}) => {
  const searchParams = useSearchParams();
  const params = useParams();
  const repoId = params.repoId as string;
  const conversationId = params.conversationId as string;
  const { findMatches } = useDefinitions(repoId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPageId] = useState<string | undefined>(pageId || searchParams.get('pageId') || undefined);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [diagramMode, setDiagramMode] = useState(false);
  const [thinkLevel, setThinkLevel] = useState<'simple' | 'detailed'>('simple');
  const [mentionedDefinations, setMentionedDefinations] = useState<Array<{node_name: string, file_name: string, start_end_lines: number[], node_type: 'file' | 'class' | 'function'}>>([]);
  // ScrollArea viewport is a div element; keep the ref typed to HTMLDivElement
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const canvasRef = useRef<any>(null);

  const suggestedPrompts = [
    "Explain what the utils in this repository do",
    "Create a sequence diagram for service 'X'",
    // "List important functions in the 'auth' module and their purpose",
    // "Suggest edge cases to test for the 'payment' flow",
    "Summarize the README and next steps to run the project locally",
  ];

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    // Radix ScrollArea uses a viewport element internally. The custom
    // `ScrollArea` component sets `data-slot="scroll-area-viewport"` on
    // the viewport. Select that first; fall back to selecting a direct
    // child div if the attribute name differs (older Radix versions).
    const scrollContainer =
      // fixed: correctly-closed attribute selector
      scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') ||
      scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') ||
      // final fallback: the first element child of the root
      (scrollAreaRef.current.firstElementChild as HTMLElement | null);

    if (scrollContainer) {
      // Ensure the element can scroll by forcing its scrollTop to its
      // scrollHeight. Use requestAnimationFrame to avoid layout thrashing
      // when messages render asynchronously.
      requestAnimationFrame(() => {
        try {
          (scrollContainer as HTMLElement).scrollTop = (scrollContainer as HTMLElement).scrollHeight;
        } catch (err) {
          // non-fatal
          console.warn('Auto-scroll failed', err);
        }
      });
    }
  }, [messages]);

  // Intentionally skip auto-loading of previous conversations to keep new chats clean
  useEffect(() => {
    return () => {};
  }, [currentPageId]);

  const requireUserId = () => resolveUserId();

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
    // focus textarea and move caret to end
    requestAnimationFrame(() => {
      const ta = document.querySelector('textarea') as HTMLTextAreaElement;
      if (ta) {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = ta.value.length;
      }
    });
  };

  const createNewConversation = async () => {
    try {
      const title = inputValue.trim() || 'New Conversation';
      const requestData: ChatConversationRequest = {
        title,
        pageId: currentPageId,
        userId: requireUserId(),
      };

      const response = await chatQaApi.createConversation(requestData);

      const newConversation = normalizeConversationSummary(response);

      setCurrentConversation(newConversation);
      setMessages([]);
      setConversations(prev => [newConversation, ...prev]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };
  const loadConversation = async (conversation: ChatConversation) => {
    try {
      const userId = requireUserId();
      const { messages: records } = await chatQaApi.getConversationMessages(conversation.id, userId);
      const hydratedMessages = hydrateConversationMessages(records, conversation.id, currentPageId);
      const updatedAt = hydratedMessages.length
        ? hydratedMessages[hydratedMessages.length - 1].timestamp
        : conversation.updatedAt;

      const updatedConversation: ChatConversation = {
        ...conversation,
        messages: hydratedMessages,
        updatedAt,
        messageCount: Math.max(conversation.messageCount ?? 0, Math.ceil(hydratedMessages.length / 2)),
      };

      setCurrentConversation(updatedConversation);
      setMessages(hydratedMessages);
      setShowHistory(false);
      setConversations(prev =>
        prev.map(conv => (conv.id === conversation.id ? updatedConversation : conv))
      );
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Helper: detect "{text}/canvas" (case-insensitive)
  function parseCanvasCommand(input: string): { isCanvas: boolean; text: string } {
    const m = input.match(/^(.*)\/canvas\s*$/i);
    if (!m) return { isCanvas: false, text: input.trim() };
    return { isCanvas: true, text: (m[1] || '').trim() };
  }

  // Helper: extract mentioned definitions from input text
  const extractMentionedDefinitions = (input: string) => {
    const mentions: string[] = [];
    const regex = /@([\w.]+)/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      mentions.push(match[1]);
    }

    // Find matching definitions for each mention
    const mentionedDefinitions = mentions
      .map(mention => {
        const matches = findMatches(mention);
        // Return the exact match if found, otherwise the first match
        return matches.find(def => def.node_name === mention) || matches[0];
      })
      .filter(Boolean) // Remove undefined entries
      .map(def => ({
        node_name: def.node_name,
        file_name: def.file_name,
        start_end_lines: def.start_end_lines,
        node_type: def.node_type,
      }));

    return mentionedDefinitions;
  };

  const handleSendMessage = async () => {
    const parsed = parseCanvasCommand(inputValue.trim());
    if (!parsed.text || isLoading) return;

    // Extract mentioned definitions from the input
    const extractedDefinitions = extractMentionedDefinitions(parsed.text);
    setMentionedDefinations(extractedDefinitions);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: parsed.text,
      role: 'user',
      timestamp: new Date(),
      pageId: currentPageId,
      diagramMode: diagramMode,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    // If '/canvas' is present, we'll open the canvas now but append the assistant
    // response to it after we receive it from the backend.
    if (parsed.isCanvas) {
      if (!canvasOpen) setCanvasOpen(true);
    }

    // Update current conversation
    const now = new Date();
    let activeConversation = currentConversation;

    if (currentConversation) {
      const updatedConversation: ChatConversation = {
        ...currentConversation,
        messages: updatedMessages,
        updatedAt: now,
        messageCount: Math.ceil(updatedMessages.length / 2),
      };
      activeConversation = updatedConversation;
      setCurrentConversation(updatedConversation);
      setConversations(prev =>
        prev.map(conv => (conv.id === currentConversation.id ? updatedConversation : conv))
      );
    } else if (conversationId) {
      const inferredConversation: ChatConversation = {
        id: conversationId,
        title: 'Conversation',
        messages: updatedMessages,
        createdAt: now,
        updatedAt: now,
        messageCount: Math.ceil(updatedMessages.length / 2),
      };
      activeConversation = inferredConversation;
      setCurrentConversation(inferredConversation);
      setConversations(prev => {
        const existing = prev.some(conv => conv.id === conversationId);
        return existing
          ? prev.map(conv => (conv.id === conversationId ? inferredConversation : conv))
          : [inferredConversation, ...prev];
      });
    }

    try {
      const targetConversationId = activeConversation?.id ?? conversationId;
      const requestData: ChatQaRequest & { thinkLevel?: 'simple' | 'detailed' } = {
        message: parsed.text,
        pageId: currentPageId,
        // Prefer the active conversation id from state, but fall back to the
        // conversation id present in the URL params so the backend receives
        // a conversation id when the route contains one.
        conversationId: targetConversationId,
        repoHash: repoId,
        diagramMode: diagramMode,
        thinkLevel: thinkLevel,
        userId: requireUserId(),
        mentionedDefinations: mentionedDefinations,
      };

      console.log('ChatPage: repoId from params:', repoId);
      console.log('ChatPage: requestData:', requestData);
      console.log('requestData', requestData)
      const response = await chatQaApi.sendMessage(requestData);
      const responseCreatedAt = (response as any).created_at ?? response.createdAt;
      const responseDiagramMode = (response as any).diagram_mode ?? response.diagramMode ?? false;
      const responseConversationId =
        response.conversationId ?? (response as any).conversation_id ?? targetConversationId ?? undefined;

      const assistantMessage: ChatMessage = {
        id: response.id,
        content: response.response,
        role: 'assistant',
        timestamp: responseCreatedAt ? new Date(responseCreatedAt) : new Date(),
        pageId: currentPageId,
        conversationId: responseConversationId,
        diagramMode: Boolean(responseDiagramMode),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Conversation ID is handled automatically by the API and stored in state
      // No URL redirect needed - stay on current repo/chat route

      // If the original user message included '/canvas', append the assistant
      // response to the canvas (not the user message). Ensure the canvas is
      // open before appending.
      if (parsed.isCanvas) {
        if (!canvasOpen) setCanvasOpen(true);
        requestAnimationFrame(() => {
          canvasRef.current?.appendLine(assistantMessage.content);
        });
      }

      // Update current conversation with assistant response
      if (activeConversation) {
        const finalConversation: ChatConversation = {
          ...activeConversation,
          messages: finalMessages,
          updatedAt: new Date(),
          messageCount: Math.ceil(finalMessages.length / 2),
        };
        activeConversation = finalConversation;
        setCurrentConversation(finalConversation);
        setConversations(prev =>
          prev.map(conv => (conv.id === finalConversation.id ? finalConversation : conv))
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        content: '**Sorry, I encountered an error. Please try again.**',
        role: 'assistant',
        timestamp: new Date(),
        pageId: currentPageId,
        diagramMode: false,
      };

      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);

      // Update current conversation with error message
      if (activeConversation) {
        const errorConversation: ChatConversation = {
          ...activeConversation,
          messages: errorMessages,
          updatedAt: new Date(),
          messageCount: Math.ceil(errorMessages.length / 2),
        };
        setCurrentConversation(errorConversation);
        setConversations(prev =>
          prev.map(conv => (conv.id === errorConversation.id ? errorConversation : conv))
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const addToCanvas = (content: string) => {
    if (!canvasOpen) setCanvasOpen(true);
    requestAnimationFrame(() => {
      canvasRef.current?.appendLine(content);
    });
  };

  const newConversation = async () => {
    await createNewConversation();
    setShowHistory(false);
  };

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      try {
        const userId = requireUserId();
        const conversationSummaries = await chatQaApi.listConversations(userId);
        const normalizedConversations = conversationSummaries.map(normalizeConversationSummary);

        if (!isActive) return;

        setConversations(normalizedConversations);

        if (!conversationId) {
          return;
        }

        try {
          const { messages: records } = await chatQaApi.getConversationMessages(conversationId, userId);
          if (!isActive) return;

          const hydratedMessages = hydrateConversationMessages(records, conversationId, currentPageId);
          const fallbackConversation = normalizedConversations.find(conv => conv.id === conversationId) ?? {
            id: conversationId,
            title: 'Conversation',
            messages: [],
            createdAt: hydratedMessages[0]?.timestamp ?? new Date(),
            updatedAt: hydratedMessages[hydratedMessages.length - 1]?.timestamp ?? new Date(),
            messageCount: 0,
          };

          const updatedConversation: ChatConversation = {
            ...fallbackConversation,
            messages: hydratedMessages,
            updatedAt: hydratedMessages.length
              ? hydratedMessages[hydratedMessages.length - 1].timestamp
              : fallbackConversation.updatedAt,
            createdAt: hydratedMessages.length ? hydratedMessages[0].timestamp : fallbackConversation.createdAt,
            messageCount: Math.max(
              fallbackConversation.messageCount ?? 0,
              Math.ceil(hydratedMessages.length / 2)
            ),
          };

          setCurrentConversation(updatedConversation);
          setMessages(hydratedMessages);
          setConversations(prev => {
            const exists = prev.some(conv => conv.id === updatedConversation.id);
            return exists
              ? prev.map(conv => (conv.id === updatedConversation.id ? updatedConversation : conv))
              : [updatedConversation, ...prev];
          });
        } catch (error) {
          console.error('Failed to hydrate conversation messages:', error);
        }
      } catch (error) {
        if ((error as Error).message !== 'Unable to determine user id') {
          console.error('Failed to initialize chat conversations:', error);
        }
      }
    };

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [conversationId]);

  return {
    // State
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
    thinkLevel,
    setThinkLevel,
    canvasOpen,
    setCanvasOpen,
    canvasRef,
    scrollAreaRef,
    suggestedPrompts,

    // Actions
    handleSuggestionClick,
    handleSendMessage,
    handleKeyPress,
    clearChat,
    copyMessage,
    addToCanvas,
    newConversation,
    loadConversation,
  };
};

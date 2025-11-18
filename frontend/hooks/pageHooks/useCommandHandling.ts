import { useState, useCallback } from 'react';
import { CommandState } from '../../types/page-editor';
import { BlockType } from '../../component/chat/SingleLineMarkdownBlock';
import { inlineQnaApi } from '../../lib/inlineApi';
import { MentionedDefinition } from '../../types/inline-qna';

type DefinitionMatch = {
  node_name: string;
  file_name: string;
  start_end_lines: number[];
  node_type: 'file' | 'class' | 'function';
};

type FindMatchesFn = (query: string) => DefinitionMatch[];

export const formatQuery = (
  pageContentAbove: string,
  userQuery: string,
  highlightedContent: string | undefined,
  pageContentBelow: string
): string => {
  const baseTemplate = `
<page_content_above_command_block>
${pageContentAbove}
</page_content_above_command_block>
<user_query>
${userQuery}
</user_query>
`;

  if (highlightedContent) {
    return `${baseTemplate}
<highlighted_command_block_selection_blocks>
${highlightedContent}
</highlighted_command_block_selection_blocks>
<page_content_below_command_block>
${pageContentBelow}
</page_content_below_command_block>`;
  } else {
    return `${baseTemplate}
<response>
</response>
<page_content_below_command_block>
${pageContentBelow}
</page_content_below_command_block>`;
  }
};

export const useCommandHandling = (pageId: string, repoHash: string, findMatches?: FindMatchesFn) => {
  const [commandStates, setCommandStates] = useState<Record<string, CommandState & {insertedCount: number}>>({});
  const [commandResponseBlocks, setCommandResponseBlocks] = useState<Record<string, number[]>>({});

  const extractMentionedDefinitions = useCallback((inputs: string[]): MentionedDefinition[] => {
    if (!findMatches || inputs.length === 0) {
      return [];
    }

    const regex = /@([\w.]+)/g;
    const mentions = new Set<string>();

    inputs.forEach(input => {
      if (!input?.trim()) return;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(input)) !== null) {
        mentions.add(match[1]);
      }
    });

    const deduped = new Map<string, MentionedDefinition>();

    mentions.forEach(mention => {
      const matches = findMatches(mention);
      if (!matches || matches.length === 0) return;

      const exactMatch = matches.find(def => def.node_name === mention) ?? matches[0];
      if (!exactMatch) return;

      const rawLines = Array.isArray(exactMatch.start_end_lines) ? exactMatch.start_end_lines : [];
      const start = rawLines[0] ?? 0;
      const end = rawLines[1] ?? start;

      deduped.set(`${exactMatch.node_type}-${exactMatch.node_name}-${exactMatch.file_name}`, {
        node_name: exactMatch.node_name,
        file_name: exactMatch.file_name,
        start_end_lines: [start, end] as [number, number],
        node_type: exactMatch.node_type,
      });
    });

    return Array.from(deduped.values());
  }, [findMatches]);

  const registerCommandBlock = (blockId: string) => {
    setCommandStates(prev => ({
      ...prev,
      [blockId]: { loading: false, error: null, insertedCount: 0 },
    }));
  };

  const unregisterCommandBlock = (blockId: string) => {
    setCommandStates(prev => {
      if (!prev[blockId]) return prev;
      const { [blockId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleCommandSubmit = async (
    blockId: string,
    index: number,
    userQuery: string,
    insertBlocksBelow: (index: number, payloads: Array<{ type: BlockType; content: string }>) => void,
    blocks: Array<{ id: string; type: BlockType; content: string }>,
    selectedContent?: string
  ) => {
    const trimmed = userQuery.trim();
    if (!trimmed) {
      setCommandStates(prev => ({
        ...prev,
        [blockId]: { loading: false, error: 'Please enter a value', insertedCount: prev[blockId]?.insertedCount || 0 },
      }));
      return;
    }

    if (!blocks) {
      throw new Error('Blocks array is required for query formatting');
    }

    const aboveContent = blocks.slice(0, index).map(b => b.content).join('\n\n');
    const belowContent = blocks.slice(index + 1).map(b => b.content).join('\n\n');
    const highlighted = selectedContent;

    const formattedQuery = formatQuery(aboveContent, trimmed, highlighted, belowContent);

    setCommandStates(prev => ({
      ...prev,
      [blockId]: { loading: true, error: null, insertedCount: prev[blockId]?.insertedCount || 0 },
    }));

    try {
      const pageInputs = [trimmed, ...blocks.map(b => b.content)];
      const mentionedDefinitions = extractMentionedDefinitions(pageInputs);

      const response = await inlineQnaApi.answerQuery({
        query: formattedQuery,
        page_id: pageId,
        repo_hash: repoHash,
        mentioned_definitions: mentionedDefinitions.length ? mentionedDefinitions : undefined,
      });

      const formatted = response.answer.trim() || 'No response received.';
      const lines = formatted.split(/\r?\n/);

      insertBlocksBelow(index, lines.map(line => ({
        type: 'text' as BlockType,
        content: line,
      })));

      setCommandStates(prev => ({
        ...prev,
        [blockId]: { 
          loading: false, 
          error: null,
          insertedCount: lines.length > 0 ? (prev[blockId]?.insertedCount || 0) + 1 : (prev[blockId]?.insertedCount || 0)
        },
      }));
    } catch (err) {
      console.error('Failed to execute command:', err);
      setCommandStates(prev => ({
        ...prev,
        [blockId]: { loading: false, error: 'Failed to fetch response', insertedCount: prev[blockId]?.insertedCount || 0 },
      }));
    }
  };

  const resetCommandState = useCallback((blockId: string) => {
    setCommandStates(prev => {
      const newState = { ...prev };
      if (newState[blockId]) {
        newState[blockId] = { loading: false, error: null, insertedCount: newState[blockId].insertedCount || 0 };
      }
      return newState;
    });
  }, []);

  return {
    commandStates,
    registerCommandBlock,
    unregisterCommandBlock,
    handleCommandSubmit,
    resetCommandState,
  };
};

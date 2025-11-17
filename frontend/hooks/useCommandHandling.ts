import { useState } from 'react';
import { CommandState } from '../types/page-editor';
import { BlockType } from '../component/chat/SingleLineMarkdownBlock';

export const useCommandHandling = () => {
  const [commandStates, setCommandStates] = useState<Record<string, CommandState>>({});

  const registerCommandBlock = (blockId: string) => {
    setCommandStates(prev => ({
      ...prev,
      [blockId]: prev[blockId] ?? { loading: false, error: null },
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
    text: string,
    insertBlocksBelow: (index: number, payloads: Array<{ type: BlockType; content: string }>) => void
  ) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setCommandStates(prev => ({
        ...prev,
        [blockId]: { loading: false, error: 'Please enter a value' },
      }));
      return;
    }

    setCommandStates(prev => ({
      ...prev,
      [blockId]: { loading: true, error: null },
    }));

    try {
      const response = await fetch('https://mpeeeccdd1d98ee29f36.free.beeceptor.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const responseBody = await response.text();
      const formatted = responseBody.trim() || 'No response received.';
      const lines = formatted.split(/\r?\n/);

      insertBlocksBelow(index, lines.map(line => ({
        type: 'text' as BlockType,
        content: line,
      })));

      setCommandStates(prev => ({
        ...prev,
        [blockId]: { loading: false, error: null },
      }));
    } catch (err) {
      console.error('Failed to execute command:', err);
      setCommandStates(prev => ({
        ...prev,
        [blockId]: { loading: false, error: 'Failed to fetch response' },
      }));
    }
  };

  return {
    commandStates,
    registerCommandBlock,
    unregisterCommandBlock,
    handleCommandSubmit,
  };
};

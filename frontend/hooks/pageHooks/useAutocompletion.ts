import { useEffect, useRef, useState } from 'react';
import { Block } from '@/types/page-editor';
import { inlineGhostApi } from '@/lib/inlineGhost';

export interface CaretInfo {
  blockIndex: number;
  offset: number;
}

export interface SurroundingContent {
  pre_context: string;
  post_context: string;
}

/**
 * Compute exact pre_context and post_context for the backend autocomplete request.
 * pre_context: everything above the caret including text to the left within the current block.
 * post_context: everything below the caret including text to the right within the current block.
 */
export function computeSurroundingContent(blocks: Block[], caret: CaretInfo): SurroundingContent {
  if (!blocks || blocks.length === 0) {
    return { pre_context: '', post_context: '' };
  }
  const { blockIndex, offset } = caret;

  const current = blocks[blockIndex]?.content ?? '';
  const beforeCaret = current.slice(0, Math.max(0, Math.min(offset, current.length)));
  const afterCaret = current.slice(Math.max(0, Math.min(offset, current.length)));

  const aboveBlocks = blockIndex > 0 ? blocks.slice(0, blockIndex).map(b => b.content) : [];
  const belowBlocks = blockIndex < blocks.length - 1 ? blocks.slice(blockIndex + 1).map(b => b.content) : [];

  // Join with newline boundaries to preserve line semantics across blocks
  const pre_context =
    (aboveBlocks.length > 0 ? aboveBlocks.join('\n') + (beforeCaret ? '\n' : '') : '') +
    beforeCaret;

  const post_context =
    afterCaret +
    (belowBlocks.length > 0 ? (afterCaret ? '\n' : '') + belowBlocks.join('\n') : '');

  return { pre_context, post_context };
}

export interface UseAutocompletionParams {
  blocks: Block[];
  caretInfo: CaretInfo | null;
  focusedBlockIndex: number | null;
  /**
   * Enable autocompletion only for these block types (e.g., ['h1','h2','h3','text']).
   * Defaults to headings and text.
   */
  enabledTypes?: Array<'h1' | 'h2' | 'h3' | 'text' | 'code' | 'command'>;
  /**
   * Debounce window in milliseconds for requests after caret/content changes.
   * Defaults to 200ms.
   */
  debounceMs?: number;
  /**
   * Force trigger even if other guards fail (e.g., via Ctrl+Space).
   */
  forceTrigger?: boolean;
}

export interface UseAutocompletionResult {
  suggestion: string | null;
  inFlight: boolean;
  /**
   * Clear current suggestion (hide ghost text).
   */
  clearSuggestion: () => void;
  /**
   * Mark the last suggestion as rejected to temporarily suppress future triggers.
   */
  markRejected: () => void;
}

/**
 * Autocompletion hook: builds pre_context/post_context around the caret, calls the backend,
 * and provides a suggestion string to render as ghost text. Uses debounce and cancels
 * in-flight requests on rapid typing via AbortController.
 */
export function useAutocompletion({
  blocks,
  caretInfo,
  focusedBlockIndex,
  enabledTypes = ['h1', 'h2', 'h3', 'text'],
  debounceMs = 300,
  forceTrigger = false,
}: UseAutocompletionParams): UseAutocompletionResult {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<boolean>(false);
  const [suppressedUntilCaretMove, setSuppressedUntilCaretMove] = useState<boolean>(false);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const caretAtSuggestionRef = useRef<CaretInfo | null>(null);
  const hadNonEmptyContextRef = useRef<boolean>(false);
  
  // Clear any pending timers and abort in-flight requests
  const cancelPending = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
      abortRef.current = null;
    }
  };

  const clearSuggestion = () => setSuggestion(null);

  useEffect(() => {
    // Guards
    if (!caretInfo) {
      clearSuggestion();
      return;
    }
    const { blockIndex } = caretInfo;
    if (focusedBlockIndex == null || focusedBlockIndex !== blockIndex) {
      // Only suggest for the currently focused block
      clearSuggestion();
      return;
    }
    const currentType = blocks[blockIndex]?.type;
    if (!forceTrigger && (!currentType || !enabledTypes.includes(currentType as any))) {
      clearSuggestion();
      return;
    }

     // Retention/suppression based on caret, not time
     const caretChanged =
       !caretAtSuggestionRef.current ||
       caretAtSuggestionRef.current.blockIndex !== caretInfo.blockIndex ||
       caretAtSuggestionRef.current.offset !== caretInfo.offset;

     // If explicitly rejected, keep suppressed until caret moves
     if (!forceTrigger && suppressedUntilCaretMove) {
       if (!caretChanged) {
         // Hide any visible suggestion while suppressed
         clearSuggestion();
         return;
       }
       // Lift suppression after caret moves
       setSuppressedUntilCaretMove(false);
     }

     // If we already have a suggestion and caret hasn't moved, keep showing it and skip fetch
     if (!forceTrigger && suggestion && !caretChanged) {
       return;
     }


    // Cancel any previous debounce or request when inputs change
    cancelPending();
  
    // Compute context once to decide leading-edge behavior and reuse in request
    const { pre_context, post_context } = computeSurroundingContent(blocks, caretInfo);
    const hasContext = Boolean(pre_context || post_context);
    const wasNonEmpty = hadNonEmptyContextRef.current;
    hadNonEmptyContextRef.current = hasContext;
  
    // Leading-edge: immediately fire on first transition from empty -> non-empty context
    if (!forceTrigger && !suggestion && !wasNonEmpty && hasContext) {
      (async () => {
        try {
          const controller = new AbortController();
          abortRef.current = controller;
  
          setInFlight(true);
  
          // Fire request with AbortController signal to cancel on rapid typing
          const response = await inlineGhostApi.autocomplete(
            { pre_context, post_context },
            { signal: controller.signal }
          );
  
          const nextSuggestion = response?.suggestion?.trim() ?? '';
          if (nextSuggestion.length > 0) {
            setSuggestion(nextSuggestion);
            // Track the caret position where the suggestion was produced
            caretAtSuggestionRef.current = { blockIndex: caretInfo.blockIndex, offset: caretInfo.offset };
          } else {
            setSuggestion(null);
          }
        } catch (err) {
          // Swallow errors gracefully; do not block typing
          setSuggestion(null);
        } finally {
          setInFlight(false);
          abortRef.current = null;
        }
      })();
    } else {
      // Debounce before issuing a new request (trailing)
      debounceRef.current = window.setTimeout(async () => {
        try {
          const controller = new AbortController();
          abortRef.current = controller;
  
          // Avoid spamming the backend with empty context
          if (!forceTrigger && !hasContext) {
            setSuggestion(null);
            return;
          }
  
          setInFlight(true);
  
          // Fire request with AbortController signal to cancel on rapid typing
          const response = await inlineGhostApi.autocomplete(
            { pre_context, post_context },
            { signal: controller.signal }
          );
  
          const nextSuggestion = response?.suggestion?.trim() ?? '';
          if (nextSuggestion.length > 0) {
            setSuggestion(nextSuggestion);
            // Track the caret position where the suggestion was produced
            caretAtSuggestionRef.current = { blockIndex: caretInfo.blockIndex, offset: caretInfo.offset };
          } else {
            setSuggestion(null);
          }
        } catch (err) {
          // Swallow errors gracefully; do not block typing
          setSuggestion(null);
        } finally {
          setInFlight(false);
          abortRef.current = null;
        }
      }, debounceMs);
    }

    // Cleanup on param changes/unmount
    return cancelPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, caretInfo, focusedBlockIndex, forceTrigger, debounceMs, enabledTypes, suggestion, suppressedUntilCaretMove]);

  return {
    suggestion,
    inFlight,
    clearSuggestion,
    markRejected: () => {
      setSuppressedUntilCaretMove(true);
      setSuggestion(null);
    },
  };
}
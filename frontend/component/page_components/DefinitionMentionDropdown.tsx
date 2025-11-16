'use client';

import React from 'react';
import { FileText, Code, FunctionSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Definition {
  node_type: 'file' | 'class' | 'function';
  node_name: string;
  code_snippet: string;
  start_end_lines: number[];
  file_name: string;
}

interface DefinitionMentionDropdownProps {
  definitions: Definition[];
  selectedIndex: number;
  onSelect: (definition: Definition) => void;
  position: { top: number; left: number };
}

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

export const DefinitionMentionDropdown: React.FC<DefinitionMentionDropdownProps> = ({
  definitions,
  selectedIndex,
  onSelect,
  position,
}) => {
  if (definitions.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-popover/95 text-popover-foreground border border-border rounded-lg shadow-xl backdrop-blur-md min-w-[300px] max-w-[400px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="p-1 max-h-[280px] overflow-y-auto scrollbar-hide">
        <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border mb-1">
          Definitions ({definitions.length})
        </div>
        {definitions.map((definition, index) => (
          <button
            key={`${definition.node_type}-${definition.node_name}-${definition.file_name}-${definition.start_end_lines?.[0] || index}`}
            onClick={() => onSelect(definition)}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-colors',
              index === selectedIndex && 'bg-accent text-accent-foreground'
            )}
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
  );
};


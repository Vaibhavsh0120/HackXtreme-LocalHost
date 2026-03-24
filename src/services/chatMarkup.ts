import type { ToolCall, ToolCallingResult, ToolResult } from '@runanywhere/core';

export interface ParsedToolCallBlock {
  toolName: string;
  argumentsText: string;
}

export interface ParsedToolResultBlock {
  toolName: string;
  status: string;
  outputText: string;
}

export interface ParsedAssistantMarkup {
  assistantMessage: string;
  toolCalls: ParsedToolCallBlock[];
  toolResults: ParsedToolResultBlock[];
  hasStructuredContent: boolean;
}

const extractTagContent = (source: string, tagName: string) => {
  const match = source.match(new RegExp(`<${tagName}>\\s*([\\s\\S]*?)\\s*</${tagName}>`, 'i'));
  return match?.[1]?.trim() ?? '';
};

const collectBlocks = (source: string, tagName: string) => {
  const expression = new RegExp(`<${tagName}>\\s*([\\s\\S]*?)\\s*</${tagName}>`, 'gi');
  return Array.from(source.matchAll(expression), match => match[1]?.trim() ?? '').filter(Boolean);
};

const formatScalar = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return 'null';
  }

  return String(value);
};

const formatStructuredValue = (value: unknown, depth = 0): string[] => {
  const indentation = '  '.repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indentation}(empty)`];
    }

    return value.flatMap(item => {
      if (item && typeof item === 'object') {
        const nested = formatStructuredValue(item, depth + 1);
        return [`${indentation}-`, ...nested];
      }

      return [`${indentation}- ${formatScalar(item)}`];
    });
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [`${indentation}(empty)`];
    }

    return entries.flatMap(([key, entryValue]) => {
      if (entryValue && typeof entryValue === 'object') {
        return [`${indentation}${key}:`, ...formatStructuredValue(entryValue, depth + 1)];
      }

      return [`${indentation}${key}: ${formatScalar(entryValue)}`];
    });
  }

  return [`${indentation}${formatScalar(value)}`];
};

export const formatStructuredFields = (value: unknown) => formatStructuredValue(value).join('\n');

export const buildToolCallMarkup = (toolCall: ToolCall) => [
  '<tool_call>',
  `  <tool_name>${toolCall.toolName}</tool_name>`,
  '  <arguments>',
  formatStructuredFields(toolCall.arguments)
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n'),
  '  </arguments>',
  '</tool_call>',
].join('\n');

export const buildToolResultMarkup = (toolResult: ToolResult) => [
  '<tool_result>',
  `  <tool_name>${toolResult.toolName}</tool_name>`,
  `  <status>${toolResult.success ? 'success' : 'failed'}</status>`,
  '  <output>',
  formatStructuredFields(toolResult.success ? toolResult.result : { error: toolResult.error ?? 'Unknown error' })
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n'),
  '  </output>',
  '</tool_result>',
].join('\n');

export const buildAssistantMarkup = (
  assistantMessage: string,
  toolCalls: ToolCall[] = [],
  toolResults: ToolResult[] = [],
) => [
  ...toolCalls.map(buildToolCallMarkup),
  ...toolResults.map(buildToolResultMarkup),
  '<assistant_message>',
  assistantMessage.trim() || '(empty response)',
  '</assistant_message>',
]
  .filter(Boolean)
  .join('\n\n');

export const buildAssistantMarkupFromResult = (result: ToolCallingResult) =>
  buildAssistantMarkup(result.text, result.toolCalls, result.toolResults);

export const parseAssistantMarkup = (content: string): ParsedAssistantMarkup => {
  const toolCalls = collectBlocks(content, 'tool_call').map(block => ({
    toolName: extractTagContent(block, 'tool_name') || 'Unknown tool',
    argumentsText: extractTagContent(block, 'arguments'),
  }));

  const toolResults = collectBlocks(content, 'tool_result').map(block => ({
    toolName: extractTagContent(block, 'tool_name') || 'Unknown tool',
    status: extractTagContent(block, 'status') || 'success',
    outputText: extractTagContent(block, 'output'),
  }));

  const assistantMessage = extractTagContent(content, 'assistant_message');
  const hasStructuredContent = toolCalls.length > 0 || toolResults.length > 0 || assistantMessage.length > 0;

  return {
    assistantMessage,
    toolCalls,
    toolResults,
    hasStructuredContent,
  };
};

export const getCopyableAssistantText = (content: string) => {
  const parsed = parseAssistantMarkup(content);
  if (!parsed.hasStructuredContent) {
    return content.trim();
  }

  const sections: string[] = [];

  parsed.toolCalls.forEach(toolCall => {
    sections.push(`Tool Call\n${toolCall.toolName}`);
    if (toolCall.argumentsText) {
      sections.push(`Arguments\n${toolCall.argumentsText}`);
    }
  });

  parsed.toolResults.forEach(toolResult => {
    sections.push(`Tool Result\n${toolResult.toolName} (${toolResult.status})`);
    if (toolResult.outputText) {
      sections.push(toolResult.outputText);
    }
  });

  if (parsed.assistantMessage) {
    sections.push(`Assistant\n${parsed.assistantMessage}`);
  }

  return sections.join('\n\n').trim();
};

export const getConversationPreviewText = (content: string) => {
  const parsed = parseAssistantMarkup(content);
  const previewSource = parsed.assistantMessage
    || parsed.toolResults[parsed.toolResults.length - 1]?.outputText
    || parsed.toolCalls[parsed.toolCalls.length - 1]?.toolName
    || content;

  return previewSource
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

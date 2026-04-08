import type { XMLToolSignature } from "@ai/types";

export interface NativeToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
  execute?: (input: Record<string, any>) => Promise<string> | string;
}

export type SerializableToolDefinition = Omit<NativeToolDefinition, "execute">;

export interface ChatTemplateToolMapper {
  mapTools: (tools: Array<SerializableToolDefinition>) => Array<unknown>;
  parseToolCalls: (response: string) => Array<XMLToolSignature>;
}

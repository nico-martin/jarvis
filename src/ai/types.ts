import { McpServerWithState } from "@ai/mcp/react/types";

export enum ModelStatus {
  IDLE,
  LOADING,
  LOADED,
}

/* MESSAGES */

export interface Message {
  id: string;
  role: MessageRole;
  messageParts: Array<MessagePart>;
}

export enum MessageRole {
  ASSISTANT,
  USER,
  SYSTEM,
}

export type MessageUser = Message & {
  role: MessageRole.USER;
  messageParts: [MessagePartText];
};

export interface MessagePartBase {
  type: MessagePartType;
  id: string;
}

export enum MessagePartType {
  TEXT,
  TOOL_CALL,
}

export type MessagePartTool = MessagePartBase & {
  type: MessagePartType.TOOL_CALL;
  functionName: string;
  parameters: Record<string, any>;
  response: string;
  responseMedia?: {
    type: "image" | "audio";
    data: string;
    mimeType: string;
  };
};

export type MessagePartText = MessagePartBase & {
  type: MessagePartType.TEXT;
  text: string;
};

export type MessagePart = MessagePartTool | MessagePartText;

export interface Conversation {
  createConversation: (
    systemPrompt: string,
    mcpServers: Array<
      (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState
    >
  ) => void;
  messages: Array<Message>;
  onMessagesChange: (callback: (messages: Array<Message>) => void) => void;
  status: ModelStatus;
  onStatusChange: (callback: (status: ModelStatus) => void) => void;
  processPrompt: (
    message: MessageUser,
    onTextFeedback?: (feedback: string) => void
  ) => Promise<void>;
  preLoadEngine?: () => Promise<void>;
}

export interface ConversationConstructorOptions {
  log?: (message?: any, ...optionalParams: any[]) => void;
  onConversationEnded?: () => void;
  conversationEndKeyword?: string;
}

export interface McpServerStoreBase {
  name: string;
  active: boolean;
  activeTools: Array<string>;
}

export interface McpServerStoreHttp extends McpServerStoreBase {
  url: string;
}

export interface McpServerStoreBuiltIn extends McpServerStoreBase {
  serverType: "take_picture" | string;
}

export type McpServerStore = McpServerStoreHttp | McpServerStoreBuiltIn;

export type XMLToolSignature = {
  functionName: string;
  parameters: Record<string, any>;
};

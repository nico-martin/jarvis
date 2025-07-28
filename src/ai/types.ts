export interface Message {
  id: string;
  text: string;
  role: MessageRole;
}

export type MessageUser = Message & {
  role: MessageRole.USER;
};

export enum ModelStatus {
  IDLE,
  LOADING,
  LOADED,
}

export enum MessageRole {
  ASSISTANT,
  USER,
  TOOL,
  SYSTEM,
}

export enum PartialResponseType {
  TEXT,
  TOOL,
}

interface PartialResponseTool {
  type: PartialResponseType.TOOL;
}

interface PartialResponseText {
  type: PartialResponseType.TEXT;
  text: string;
}

export type PartialResponse = PartialResponseText | PartialResponseTool;

export interface Conversation {
  messages: Array<Message>;
  onMessagesChange: (callback: (messages: Array<Message>) => void) => void;
  status: ModelStatus;
  onStatusChange: (callback: (status: ModelStatus) => void) => void;
  processPrompt: (
    message: MessageUser,
    onPartialUpdate?: (part: PartialResponse) => void
  ) => Promise<string>;
}

export interface ConversationConstructorOptions {
  temperature?: number;
  log?: (message?: any, ...optionalParams: any[]) => void;
}

export interface ConversationConstructor {
  new (
    systemPrompt: string,
    options: ConversationConstructorOptions
  ): Conversation;
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

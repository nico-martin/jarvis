export interface Message {
  id: string;
  text: string;
  role: MessageRole;
}

export enum MessageRole {
  ASSISTANT,
  USER,
  TOOL,
  SYSTEM,
}

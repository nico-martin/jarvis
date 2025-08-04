import { McpServerWithState } from "@ai/mcp/react/types";
import {
  Conversation,
  ConversationConstructorOptions,
  McpServerStoreBuiltIn,
  McpServerStoreHttp,
  Message,
  MessageUser,
  ModelStatus,
} from "@ai/types";

class ConversationTransformersJS implements Conversation {
  private engineLoading: boolean;
  private _messages: Array<Message> = [];
  private log: (message?: any, ...optionalParams: any[]) => void = () => {};
  private temperature: number = 1;
  private mcpServers: Array<
    (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState
  > = [];
  private onConversationEnded?: () => void;
  private conversationEndKeyword?: string;

  private statusEventListeners: Set<(status: ModelStatus) => void> = new Set();
  private messagesEventListeners: Set<(messages: Array<Message>) => void> =
    new Set();

  public constructor(options?: ConversationConstructorOptions) {
    if (options?.log) {
      this.log = options.log;
    }
    if (options?.onConversationEnded) {
      this.onConversationEnded = options.onConversationEnded;
    }
    if (options?.conversationEndKeyword) {
      this.conversationEndKeyword = options.conversationEndKeyword;
    }
  }

  public createConversation(
    systemPrompt: string,
    mcpServers: Array<
      (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState
    >
  ) {}

  public get status() {
    if (this.engineLoading) {
      return ModelStatus.LOADING;
    }
    /* if (ENGINE) {
      return ModelStatus.LOADED;
    }*/
    return ModelStatus.IDLE;
  }

  public onStatusChange = (callback: (status: ModelStatus) => void) => {
    const listener = () => callback(this.status);
    this.statusEventListeners.add(listener);
    return () => this.statusEventListeners.delete(listener);
  };

  public get messages() {
    return this._messages;
  }

  public set messages(messages) {
    this._messages = messages;
    this.messagesEventListeners.forEach((listener) => listener(messages));
  }

  public onMessagesChange = (callback: (messages: Array<Message>) => void) => {
    const listener = () => callback(this.messages);
    this.messagesEventListeners.add(listener);
    return () => this.messagesEventListeners.delete(listener);
  };

  public processPrompt = async (
    message: MessageUser,
    onTextFeedback?: (feedback: string) => void
  ): Promise<void> => {};
}

export default ConversationTransformersJS;

import {
  ConversationTransformersJSWorkerResponse,
  TransformersJSMessage,
} from "@ai/llm/tfjsLlm/types";
import toolsToSystemPrompt from "@ai/llm/utils/toolsToSystemPrompt";
import { McpServerWithState } from "@ai/mcp/react/types";
import {
  Conversation,
  ConversationConstructorOptions,
  McpServerStoreBuiltIn,
  McpServerStoreHttp,
  Message,
  MessagePartType,
  MessageRole,
  MessageUser,
  ModelStatus,
  XMLToolSignature,
} from "@ai/types";
import isFullSentence from "@utils/isFullSentence";
import isFullXMLToolCall from "@utils/isFullXMLToolCall";
import { v4 as uuidv4 } from "uuid";

class ConversationTransformersJS implements Conversation {
  private _engineStatus: ModelStatus = ModelStatus.IDLE;
  private worker: Worker;
  private workerRequestId: number = 0;
  private tfjsMessages: Array<TransformersJSMessage> = [];
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
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
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
  ) {
    this.mcpServers = mcpServers;
    const tools = mcpServers.reduce(
      (acc, server) => [
        ...acc,
        ...server.server.tools.filter((tool) =>
          server.activeTools.includes(tool.name)
        ),
      ],
      []
    );

    if (tools.length) {
      systemPrompt += `

${toolsToSystemPrompt(tools)}`;
    }

    const systemMessageId = uuidv4();

    const newMessages: Array<TransformersJSMessage> = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    if (JSON.stringify(this.tfjsMessages) === JSON.stringify(newMessages)) {
      return;
    }

    this.tfjsMessages = newMessages;

    this.messages = [
      {
        id: systemMessageId,
        role: MessageRole.SYSTEM,
        messageParts: [
          {
            type: MessagePartType.TEXT,
            id: systemMessageId,
            text: systemPrompt,
          },
        ],
      },
    ];

    this.initializeCache();
  }

  public get status() {
    return this._engineStatus;
  }

  public set status(status: ModelStatus) {
    this._engineStatus = status;
    this.statusEventListeners.forEach((listener) => listener(this.status));
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

  /*public preLoadEngine = async () =>
    new Promise<void>((resolve) => {
      const id = (this.workerRequestId++).toString();
      this.status = ModelStatus.MODEL_LOADING;
      const listener = (
        e: MessageEvent<ConversationTransformersJSWorkerResponse>
      ) => {
        if (e.data.status === "complete") {
          this.status = ModelStatus.LOADED;
          this.worker.removeEventListener("message", listener);
          resolve();
        }
      };

      this.worker.addEventListener("message", listener);
      this.worker.postMessage({
        id,
        type: "preload",
      });
    });*/

  public processPrompt = async (
    message: MessageUser,
    onTextFeedback?: (feedback: string) => void
  ): Promise<void> => {
    this.tfjsMessages = [
      ...this.tfjsMessages,
      {
        role: "user",
        content: message.messageParts[0].text,
      },
    ];

    this.messages = [...this.messages, message];

    this.log("-- MESSAGES --");
    this.log(this.tfjsMessages);

    let hasToolCalls = true;
    const assistantId = uuidv4();

    this.messages.push({
      id: assistantId,
      role: MessageRole.ASSISTANT,
      messageParts: [],
    });

    while (hasToolCalls) {
      const { toolsToCall } = await this.generateAnswer(
        assistantId,
        onTextFeedback
      );

      const responses: Array<{ functionName: string; response: string }> =
        await Promise.all(
          toolsToCall.map(async (tool) => {
            const server = this.mcpServers.find((server) =>
              server.activeTools.includes(tool.functionName)
            );

            if (!server) {
              return {
                functionName: tool.functionName,
                response: "Cannot call tool",
              };
            }
            const response = await server.server.callTool(
              tool.functionName,
              tool.parameters
            );

            const textResponse = response.content
              .filter(({ type }) => type === "text")
              .map(({ text }) => text)
              .join("\n");

            const mediaResponse = response.content.find(
              ({ type }) => type === "image" || type === "audio"
            );

            this.messages = this.messages.map((message) => {
              if (message.id === assistantId) {
                return {
                  ...message,
                  messageParts: message.messageParts.map((part) =>
                    part.type === MessagePartType.TOOL_CALL &&
                    part.functionName === tool.functionName
                      ? {
                          ...part,
                          response: textResponse,
                          responseMedia: mediaResponse
                            ? {
                                type:
                                  mediaResponse.type === "audio"
                                    ? "audio"
                                    : "image",
                                data: (mediaResponse.data as string) || "",
                                mimeType:
                                  (mediaResponse.mimeType as string) || "",
                              }
                            : null,
                        }
                      : part
                  ),
                };
              }
              return message;
            });

            return {
              functionName: tool.functionName,
              response: textResponse,
            };
          })
        );
      hasToolCalls = toolsToCall.length !== 0;

      if (hasToolCalls) {
        this.tfjsMessages.push({
          role: "user",
          content: `This is the response of the called tools: ${responses
            .map(
              (resp) => `${resp.functionName}:
Response: ${resp.response}`
            )
            .join("\n\n")}`,
        });
      }
    }

    const lastMessage = this.tfjsMessages[this.tfjsMessages.length - 1];

    if (
      this.conversationEndKeyword &&
      lastMessage &&
      lastMessage.role === "assistant" &&
      typeof lastMessage.content === "string" &&
      lastMessage.content.endsWith(this.conversationEndKeyword)
    ) {
      if (this.onConversationEnded) {
        this.onConversationEnded();
      }
      window.setTimeout(() => {
        this.createConversation(
          this.tfjsMessages[0].content as string,
          this.mcpServers
        );
      }, 2000);
    }

    return;
  };

  private generateAnswer = async (
    assistantId: string,
    onTextFeedback?: (feedback: string) => void
  ): Promise<{
    text: string;
    toolsToCall: Array<XMLToolSignature>;
  }> => {
    return new Promise<{
      text: string;
      toolsToCall: Array<XMLToolSignature>;
    }>((resolve, reject) => {
      const id = (this.workerRequestId++).toString();
      let firstToken: DOMHighResTimeStamp = null;

      let reply = "";
      let processedReply: string = "";

      const toolsToCall: Array<XMLToolSignature> = [];

      const listener = (
        e: MessageEvent<ConversationTransformersJSWorkerResponse>
      ) => {
        if (e.data.id !== id) return;

        if (e.data.status === "token_update") {
          firstToken ??= performance.now();
          reply += e.data.decodedTokens;
          const clean = reply.replace("<think>\n\n</think>\n\n", "");
          const newReply = clean.replace(processedReply, "");

          const fullSentence = isFullSentence(newReply);
          const fullXMLToolCall = isFullXMLToolCall(newReply);

          if (fullSentence) {
            processedReply = clean;
            onTextFeedback && onTextFeedback(fullSentence);
            this.messages = this.messages.map((message) => ({
              ...message,
              messageParts:
                message.id === assistantId
                  ? [
                      ...message.messageParts,
                      {
                        type: MessagePartType.TEXT,
                        id: uuidv4(),
                        text: fullSentence,
                      },
                    ]
                  : message.messageParts,
            }));
          }

          if (fullXMLToolCall) {
            processedReply = clean;
            toolsToCall.push(fullXMLToolCall);
            this.messages = this.messages.map((message) => ({
              ...message,
              messageParts:
                message.id === assistantId
                  ? [
                      ...message.messageParts,
                      {
                        type: MessagePartType.TOOL_CALL,
                        id: uuidv4(),
                        functionName: fullXMLToolCall.functionName,
                        parameters: fullXMLToolCall.parameters,
                        response: "",
                      },
                    ]
                  : message.messageParts,
            }));
          }
        }

        if (e.data.status === "complete") {
          this.worker.removeEventListener("message", listener);
          this.tfjsMessages = e.data.messages;

          resolve({
            text: reply,
            toolsToCall,
          });
        }
      };

      this.worker.addEventListener("message", listener);
      this.worker.postMessage({
        id,
        type: "generate",
        messages: this.tfjsMessages,
        temperature: this.temperature,
      });
    });
  };

  private initializeCache = async () =>
    new Promise<void>((resolve) => {
      const id = (this.workerRequestId++).toString();

      const listener = (
        e: MessageEvent<ConversationTransformersJSWorkerResponse>
      ) => {
        if (e.data.id !== id) return;

        if (e.data.status === "loading") {
          this.status = ModelStatus.MODEL_LOADING;
        }
        if (e.data.status === "ready") {
          this.status = ModelStatus.CONVERSATION_LOADING;
        }
        if (e.data.status === "complete") {
          this.status = ModelStatus.READY;
          this.tfjsMessages = e.data.messages;
          this.worker.removeEventListener("message", listener);
          resolve();
        }
      };

      this.worker.addEventListener("message", listener);
      this.worker.postMessage({
        id,
        type: "initialize-cache",
        messages: this.tfjsMessages,
      });
    });
}

export default ConversationTransformersJS;

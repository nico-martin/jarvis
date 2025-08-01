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
import {
  ChatCompletionMessageParam,
  CreateWebWorkerMLCEngine,
  WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import isFullSentence from "@utils/isFullSentence";
import isFullXMLToolCall from "@utils/isFullXMLToolCall";
import { v4 as uuidv4 } from "uuid";

import { QWEN3_4B } from "./constants";

const MESSAGES_EVENT_KEY = "messagesChange";
const STATUS_EVENT_KEY = "statusChange";

let ENGINE: WebWorkerMLCEngine = null;

class ConversationWebLlm extends EventTarget implements Conversation {
  private engineLoading: boolean;
  private webLlmMessages: Array<ChatCompletionMessageParam> = [];
  private _messages: Array<Message> = [];
  private log: (message?: any, ...optionalParams: any[]) => void = () => {};
  private temperature: number = 0.2;
  private mcpServers: Array<
    (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState
  > = [];
  private onConversationEnded?: () => void;
  private conversationEndKeyword?: string;

  public constructor(options?: ConversationConstructorOptions) {
    super();

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
    this.engineLoading = false;
    ENGINE = null;

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

    this.webLlmMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

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
  }

  public get status() {
    if (this.engineLoading) {
      return ModelStatus.LOADING;
    }
    if (ENGINE) {
      return ModelStatus.LOADED;
    }
    return ModelStatus.IDLE;
  }

  public onStatusChange = (callback: (status: ModelStatus) => void) => {
    const listener = () => callback(this.status);
    this.addEventListener(STATUS_EVENT_KEY, listener);
    return () => this.removeEventListener(STATUS_EVENT_KEY, listener);
  };

  public get messages() {
    return this._messages;
  }

  public set messages(messages) {
    this._messages = messages;
    this.dispatchEvent(new Event(MESSAGES_EVENT_KEY));
  }

  public onMessagesChange = (callback: (messages: Array<Message>) => void) => {
    const listener = () => callback(this.messages);
    this.addEventListener(MESSAGES_EVENT_KEY, listener);
    return () => this.removeEventListener(MESSAGES_EVENT_KEY, listener);
  };

  public processPrompt = async (
    message: MessageUser,
    onTextFeedback?: (feedback: string) => void
  ): Promise<void> => {
    this.webLlmMessages = [
      ...this.webLlmMessages,
      {
        role: "user",
        content: message.messageParts[0].text,
      },
    ];

    this.messages = [...this.messages, message];

    if (!ENGINE) {
      this.log("Creating engine:", QWEN3_4B.label);
      this.engineLoading = true;
      this.dispatchEvent(new Event(STATUS_EVENT_KEY));
      ENGINE = await CreateWebWorkerMLCEngine(
        new Worker(new URL("./webLlmWorker.ts", import.meta.url), {
          type: "module",
        }),
        QWEN3_4B.model,
        {
          initProgressCallback: this.log,
        }
      );
      this.engineLoading = false;
      this.dispatchEvent(new Event(STATUS_EVENT_KEY));
    }

    this.log("-- MESSAGES --");
    this.log(this.webLlmMessages);

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
        this.webLlmMessages.push({
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

    const lastMessage = this.webLlmMessages[this.webLlmMessages.length - 1];
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
      this.createConversation(
        this.webLlmMessages[0].content as string,
        this.mcpServers
      );
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
    const prevWebLlmMessages = this.webLlmMessages;

    const chunks = await ENGINE.chat.completions.create({
      messages: this.webLlmMessages,
      temperature: this.temperature,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      extra_body: {
        enable_thinking: false,
      },
    });

    let reply = "";
    let processedReply: string = "";

    const toolsToCall: Array<XMLToolSignature> = [];

    for await (const chunk of chunks) {
      reply += chunk.choices[0]?.delta.content || "";
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

    this.webLlmMessages = [
      ...prevWebLlmMessages,
      {
        role: "assistant",
        content: reply.replace("<think>\n\n</think>\n\n", ""),
      },
    ];

    return { text: reply.replace("<think>\n\n</think>\n\n", ""), toolsToCall };
  };
}

export default ConversationWebLlm;

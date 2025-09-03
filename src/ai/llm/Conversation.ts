import toolsToSystemPrompt from "@ai/llm/utils/toolsToSystemPrompt";
import { McpServerWithState } from "@ai/mcp/react/types";
import {
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
import { LanguageModel } from "language-model-polyfill";
import { v4 as uuidv4 } from "uuid";

const modelId = "Qwen3-4B";
LanguageModel.model_id = modelId;

class Conversation {
  private log: (message?: any, ...optionalParams: any[]) => void = () => {};
  private onConversationEnded?: () => void;
  private conversationEndKeyword?: string;
  private mcpServers: Array<
    (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState
  > = [];
  private session: LanguageModel;
  private systemMessage: string;
  private _messages: Array<Message> = [];
  private messagesEventListeners: Set<(messages: Array<Message>) => void> =
    new Set();
  private _engineStatus: ModelStatus = ModelStatus.IDLE;
  private statusEventListeners: Set<(status: ModelStatus) => void> = new Set();

  public constructor(options?: ConversationConstructorOptions) {
    LanguageModel.worker = new Worker(new URL("./worker.ts", import.meta.url), {
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

  public async createConversation(
    systemPrompt: string,
    mcpServers: Array<
      (McpServerStoreHttp | McpServerStoreBuiltIn) & McpServerWithState
    >,
    downloadProgress: (progress: number) => void = () => {},
    forceRebuild: boolean = false,
    buildKVCache: boolean = true
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

    if (this.systemMessage === systemPrompt && !forceRebuild) {
      return;
    }
    this.systemMessage = systemPrompt;

    if (this.session) {
      this.session.destroy();
    }

    const systemMessageId = uuidv4();
    this.status = ModelStatus.MODEL_LOADING;
    this.session = await LanguageModel.create({
      buildKVCache,
      initialPrompts: [{ role: "system", content: systemPrompt }],
      temperature: 0,
      monitor: (m) => {
        m.addEventListener("downloadprogress", (e) => {
          downloadProgress(e.loaded);
          if (e.loaded >= 1) this.status = ModelStatus.CONVERSATION_LOADING;
        });
      },
    });

    this.status = ModelStatus.READY;
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

  public isCached = async () => {
    return (await LanguageModel.availability()) === "available";
  };

  public static downloadSize = LanguageModel.downloadSize(modelId);

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

  private callTool = async (
    tool: XMLToolSignature,
    assistantId: string
  ): Promise<{ functionName: string; response: string }> => {
    try {
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
                            mediaResponse.type === "audio" ? "audio" : "image",
                          data: (mediaResponse.data as string) || "",
                          mimeType: (mediaResponse.mimeType as string) || "",
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
    } catch (e) {
      return {
        functionName: tool.functionName,
        response: `Could not call tool: ${JSON.stringify(e)}`,
      };
    }
  };

  public processPrompt = async (
    message: MessageUser,
    onTextFeedback?: (feedback: string) => void
  ): Promise<void> => {
    this.messages = [...this.messages, message];

    let nextPrompt = message.messageParts
      .map((part) => (part.type === MessagePartType.TEXT ? part.text : ""))
      .join("\n");
    let shouldTriggerEndConversation = false;

    const assistantId = uuidv4();

    this.messages.push({
      id: assistantId,
      role: MessageRole.ASSISTANT,
      messageParts: [],
    });

    while (nextPrompt) {
      const { toolsToCall, shouldEndConversation } = await this.generateAnswer(
        nextPrompt,
        assistantId,
        onTextFeedback
      );

      shouldTriggerEndConversation = shouldEndConversation;

      const responses: Array<{ functionName: string; response: string }> =
        await Promise.all(
          toolsToCall.map(async (tool) => this.callTool(tool, assistantId))
        );

      if (toolsToCall.length !== 0) {
        nextPrompt = `This is the response of the called tools: ${responses
          .map(
            (resp) => `${resp.functionName}:
Response: ${resp.response}`
          )
          .join("\n\n")}`;
      } else {
        nextPrompt = "";
      }
    }

    if (shouldTriggerEndConversation) {
      if (this.onConversationEnded) {
        this.onConversationEnded();
      }
      window.setTimeout(() => {
        this.createConversation(
          this.systemMessage,
          this.mcpServers,
          () => {},
          true
        );
      }, 2000);
    }
  };

  private generateAnswer = async (
    prompt: string,
    assistantId: string,
    onTextFeedback?: (feedback: string) => void
  ): Promise<{
    text: string;
    toolsToCall: Array<XMLToolSignature>;
    shouldEndConversation: boolean;
  }> => {
    let processedReply: string = "";
    const toolsToCall: Array<XMLToolSignature> = [];

    const stream = this.session.promptStreaming(prompt);
    const reader = stream.getReader();
    let reply = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      reply += value;

      const newReply = reply.replace(processedReply, "");
      const fullSentence = isFullSentence(newReply);
      const fullXMLToolCall = isFullXMLToolCall(newReply);

      if (fullSentence) {
        processedReply = reply;
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
        processedReply = reply;
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

    return {
      text: reply,
      toolsToCall,
      shouldEndConversation:
        this.conversationEndKeyword &&
        reply.endsWith(this.conversationEndKeyword),
    };
  };
}

export default Conversation;

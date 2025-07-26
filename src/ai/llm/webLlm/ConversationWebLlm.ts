import {
  Conversation,
  ConversationConstructorOptions,
  Message,
  MessageRole,
  MessageUser,
  ModelStatus,
  PartialResponse,
  PartialResponseType,
} from "@ai/types";
import {
  ChatCompletionMessageParam,
  CreateWebWorkerMLCEngine,
  WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import extractSentences from "@utils/extractSentences";
import { v4 as uuidv4 } from "uuid";

import { QWEN3_4B } from "./constants";

const MESSAGES_EVENT_KEY = "messagesChange";
const STATUS_EVENT_KEY = "statusChange";

export type WebLlmMessage = ChatCompletionMessageParam & {
  id: string;
  processing?: boolean;
};

let ENGINE: WebWorkerMLCEngine = null;

class ConversationWebLlm extends EventTarget implements Conversation {
  private engineLoading: boolean;
  private _webLlmMessages: Array<WebLlmMessage> = [];
  private _messages: Array<Message> = [];
  private log: (message?: any, ...optionalParams: any[]) => void = () => {};
  private temperature: number = 0.2;

  public constructor(
    systemPrompt: string,
    options?: ConversationConstructorOptions
  ) {
    super();
    this.engineLoading = false;
    ENGINE = null;
    const systemMessage = {
      role: "system" as const,
      content: systemPrompt,
      id: uuidv4(),
    };
    this._webLlmMessages = [systemMessage];
    this._messages = this.transformMessages([systemMessage]);
    if (options?.log) {
      this.log = options.log;
    }
    if (options?.temperature) {
      this.temperature = options.temperature;
    }
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

  public get webLlmMessages() {
    return this._webLlmMessages;
  }

  public set webLlmMessages(messages) {
    this._webLlmMessages = messages;
    this._messages = this.transformMessages(messages);
    this.dispatchEvent(new Event(MESSAGES_EVENT_KEY));
  }

  private transformMessages(
    webLlmMessages: Array<WebLlmMessage>
  ): Array<Message> {
    return webLlmMessages.map((message) => ({
      id: message.id,
      role:
        message.role === "system"
          ? MessageRole.SYSTEM
          : message.role === "user"
            ? MessageRole.USER
            : message.role === "assistant"
              ? MessageRole.ASSISTANT
              : message.role === "tool"
                ? MessageRole.TOOL
                : null,
      text: Array.isArray(message.content)
        ? message.content
            .map((part) => ("text" in part && part?.text) || "")
            .join(" ")
        : message.content || "",
    }));
  }

  public onMessagesChange = (callback: (messages: Array<Message>) => void) => {
    const listener = () => callback(this.messages);
    this.addEventListener(MESSAGES_EVENT_KEY, listener);
    return () => this.removeEventListener(MESSAGES_EVENT_KEY, listener);
  };

  public processPrompt = async (
    message: MessageUser,
    onPartialUpdate?: (part: PartialResponse) => void
  ) => {
    this.webLlmMessages = [
      ...this.webLlmMessages,
      {
        role: "user",
        content: message.text,
        id: message.id,
      },
    ];

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

    const assistantId = uuidv4();
    let partialResponses: Array<PartialResponse> = [];

    return await this.generateAnswer((answer) => {
      if (this.webLlmMessages.find((m) => m.id === assistantId)) {
        this.webLlmMessages = this.webLlmMessages.map((message) =>
          message.id === assistantId ? { ...message, content: answer } : message
        );
      } else {
        this.webLlmMessages = [
          ...this.webLlmMessages,
          {
            role: "assistant",
            content: answer,
            id: assistantId,
          },
        ];
      }

      if (onPartialUpdate) {
        const newPartialResponses = extractSentences(answer).map(
          (sentence) => ({
            type: PartialResponseType.TEXT,
            text: sentence,
          })
        );
        if (newPartialResponses.length > partialResponses.length) {
          partialResponses = newPartialResponses;
          onPartialUpdate(partialResponses[partialResponses.length - 1]);
        }
      }
    });
  };

  private generateAnswer = async (
    onReplyUpdate: (reply: string) => void
  ): Promise<string> => {
    const chunks = await ENGINE.chat.completions.create({
      messages: this.webLlmMessages.map((m) => ({
        role:
          m.role === "system"
            ? "system"
            : m.role === "assistant"
              ? "assistant"
              : "user",
        content: m.content as string,
      })),
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
    for await (const chunk of chunks) {
      reply += chunk.choices[0]?.delta.content || "";
      onReplyUpdate(reply.replace("<think>\n\n</think>\n\n", ""));
      if (chunk.usage) {
        this.log(chunk.usage);
      }
    }
    onReplyUpdate(reply.replace("<think>\n\n</think>\n\n", ""));
    return reply;
  };
}

export default ConversationWebLlm;

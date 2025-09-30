import { Message, Tensor } from "@huggingface/transformers";

class KVCache {
  private cache: Map<
    string,
    { session_id: string; kv: Record<string, Tensor> }
  >;

  public constructor() {
    this.cache = new Map();
  }

  public generateHash = (messages: Array<Message>): string => {
    let hash = 5381;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const roleLen = msg.role.length;
      for (let j = 0; j < roleLen; j++) {
        hash = (hash * 33) ^ msg.role.charCodeAt(j);
      }
      const contentLen = msg.content.length;
      for (let j = 0; j < contentLen; j++) {
        hash = (hash * 33) ^ msg.content.charCodeAt(j);
      }
      hash = hash ^ (i << 16);
    }
    return (hash >>> 0).toString(36);
  };

  // this goes back in the messages array and find the last cache.
  // todo: I guess this wont work because transformers.js always expects the messages[messages.length - 1] as the cache
  /*public get(messages: Array<Message>) {
    const removedMessages: Array<Message> = [];
    let currentMessages = [...messages];

    while (currentMessages.length > 0) {
      const hash = this.generateHash(currentMessages);
      const cachedValue = this.cache.get(hash);

      if (cachedValue !== undefined) {
        return {
          value: cachedValue,
          new_messages: removedMessages,
        };
      }

      const lastMessage = currentMessages.pop();
      if (lastMessage) {
        removedMessages.unshift(lastMessage);
      }
    }

    return {
      value: null,
      new_messages: removedMessages,
    };
  }*/
  public get(messages: Array<Message>) {
    const currentMessages = [...messages];
    const messagesForCache = currentMessages.slice(0, -1);
    const removedMessages = currentMessages.slice(-1);

    const hash = this.generateHash(messagesForCache);
    const cache = this.cache.get(hash);

    return {
      value: cache?.kv || null,
      new_messages: removedMessages,
    };
  }

  public set(
    messages: Array<Message>,
    data: { kv: Record<string, Tensor>; session_id: string },
  ) {
    const hash = this.generateHash(messages);
    this.cache.set(hash, data);
  }

  public deleteSession(session_id: string) {
    this.cache.forEach((value, key) => {
      if (value.session_id === session_id) {
        this.cache.delete(key);
      }
    });
  }
}

export default KVCache;

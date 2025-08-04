import VoiceActivityDetection from "@ai/voiceActivityDetection/VoiceActivityDetection";
import { useState, useMemo, useEffect, useCallback, useRef } from "preact/hooks";
import { ComponentChildren } from "preact";
import { v4 as uuidv4 } from "uuid";

import ConversationWebLlm from "../llm/webLlm/ConversationWebLlm";
import useMcpServer from "../mcp/react/useMcpServer";
import SpeechToText from "../speechToText/SpeechToText";
import Kokoro from "../textToSpeech/kokoro/Kokoro";
import { MessagePartType, MessageRole, MessageUser } from "../types";
import AgentContext, { AgentContextValues } from "./AgentContext";
import { FILL_WORDS } from "./constants";

const SYSTEM_PROMPT = `You are JARVIS, the sophisticated AI assistant from Iron Man.
Core Traits

Voice: Refined British eloquence, dry wit, polite formality
Address: Users as "Sir" or "Ma'am"
Demeanor: Calm, loyal, genuinely protective
Expertise: Advanced tech, science, strategic planning

Communication Style

Provide precise, proactive solutions
End: Offer additional assistance

When the user indicates they want to end the conversation (through phrases like "goodbye," "bye," "talk to you later," "that's all," "thanks, I'm done," or similar farewell expressions), respond with a polite farewell message and then include the exact keyword [END] on a new line at the very end of your response.

Example format:
Thank you for the conversation! Have a great day.
<END>`;

const INSTRUCTIONS = [
  "My Name is Nico Martin",
  "never use ellipsis (...)",
  "Keep your answers short bur percise",
];

export default function AgentContextProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const { active } = useMcpServer();
  const [mute, setMute] = useState<boolean>(false);

  const [speakerAbortController, setSpeakerAbortController] = useState(
    () => new AbortController()
  );

  const speechToText = useMemo(() => {
    const stt = new SpeechToText();
    stt.preload();
    return stt;
  }, []);

  const tts = useMemo(() => {
    const k = new Kokoro();
    k.preload();
    return k;
  }, []);

  const conversation = useMemo(
    () =>
      new ConversationWebLlm({
        onConversationEnded: () => console.log("ENDED"),
        conversationEndKeyword: "<END>",
      }),
    []
  );

  useEffect(() => {
    conversation.createConversation(
      SYSTEM_PROMPT + "\n\n# Instructions:\n" + INSTRUCTIONS.join("\n"),
      active
    );
  }, [active, conversation]);

  const [messages, setMessages] = useState(() => conversation.messages);
  const [conversationStatus, setConversationStatus] = useState(() => conversation.status);

  useEffect(() => {
    const unsubscribeMessages = conversation.onMessagesChange(() => {
      setMessages(conversation.messages);
    });
    const unsubscribeStatus = conversation.onStatusChange(() => {
      setConversationStatus(conversation.status);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [conversation]);

  const processPrompt = useCallback(
    async (
      message: MessageUser,
      onTextFeedback?: (feedback: string) => void
    ): Promise<void> => {
      return conversation.processPrompt(message, onTextFeedback);
    },
    [conversation]
  );

  const submit = useCallback(
    (prompt: string) =>
      processPrompt(
        {
          id: uuidv4(),
          messageParts: [
            {
              type: MessagePartType.TEXT,
              id: uuidv4(),
              text: prompt,
            },
          ],
          role: MessageRole.USER,
        },
        (feedback) =>
          !mute && tts.speak(feedback, speakerAbortController.signal)
      ),
    [processPrompt, mute, tts, speakerAbortController.signal]
  );

  const vadListeners = useRef<Set<(text: string) => void>>(new Set());

  const onVadDetected = useCallback(
    (callback: (text: string) => void) => {
      vadListeners.current.add(callback);
      return () => vadListeners.current.delete(callback);
    },
    []
  );

  const vad = useMemo(() => {
    const vad = new VoiceActivityDetection();
    vad.preload();
    vad.setCallbacks({
      onSpeechChunk: (buffer, timing) => {
        timing.duration > 200 &&
          speechToText.generate(buffer).then((text) => {
            if (FILL_WORDS.indexOf(text.trim().toLowerCase()) === -1) {
              vadListeners.current.forEach((callback) => callback(text));
            }
          });
      },
    });
    return vad;
  }, [speechToText, submit]);

  const [vadStatus, setVadStatus] = useState(() => vad.status);

  useEffect(() => {
    const unsubscribeVad = vad.onStatusChange(() => {
      setVadStatus(vad.status);
    });

    return () => {
      unsubscribeVad();
    };
  }, [vad]);

  const contextValue: AgentContextValues = useMemo(
    () => ({
      messages,
      conversationStatus,
      vad,
      vadStatus,
      submit,
      mute,
      setMute,
      abortSpeaker: () => {
        speakerAbortController.abort();
        setSpeakerAbortController(new AbortController());
      },
      onVadDetected,
    }),
    [messages, conversationStatus, vad, vadStatus, submit, mute, onVadDetected]
  );

  return <AgentContext value={contextValue}>{children}</AgentContext>;
}

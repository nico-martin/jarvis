import VoiceActivityDetection from "@ai/voiceActivityDetection/VoiceActivityDetection";
import React from "react";
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
  children: React.ReactNode;
}) {
  const { active } = useMcpServer();
  const [mute, setMute] = React.useState<boolean>(false);

  const [speakerAbortController, setSpeakerAbortController] = React.useState(
    () => new AbortController()
  );

  const speechToText = React.useMemo(() => {
    const stt = new SpeechToText();
    stt.preload();
    return stt;
  }, []);

  const tts = React.useMemo(() => {
    const k = new Kokoro();
    k.preload();
    return k;
  }, []);

  const conversation = React.useMemo(
    () =>
      new ConversationWebLlm({
        onConversationEnded: () => console.log("ENDED"),
        conversationEndKeyword: "<END>",
      }),
    []
  );

  React.useEffect(() => {
    conversation.createConversation(
      SYSTEM_PROMPT + "\n\n# Instructions:\n" + INSTRUCTIONS.join("\n"),
      active
    );
  }, [active, conversation]);

  const messages = React.useSyncExternalStore(
    (cb) => conversation.onMessagesChange(cb),
    () => conversation.messages
  );

  const conversationStatus = React.useSyncExternalStore(
    (cb) => conversation.onStatusChange(cb),
    () => conversation.status
  );

  const processPrompt = React.useCallback(
    async (
      message: MessageUser,
      onTextFeedback?: (feedback: string) => void
    ): Promise<void> => {
      return conversation.processPrompt(message, onTextFeedback);
    },
    [conversation]
  );

  const submit = React.useCallback(
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

  const vadListeners = React.useRef<Set<(text: string) => void>>(new Set());

  const onVadDetected = React.useCallback(
    (callback: (text: string) => void) => {
      vadListeners.current.add(callback);
      return () => vadListeners.current.delete(callback);
    },
    []
  );

  const vad = React.useMemo(() => {
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

  const vadStatus = React.useSyncExternalStore(
    (cb) => vad.onStatusChange(cb),
    () => vad.status
  );

  const contextValue: AgentContextValues = React.useMemo(
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

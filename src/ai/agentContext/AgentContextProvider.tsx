import { INSTRUCTIONS, SYSTEM_PROMPT } from "@ai/agent";
import ConversationGemini from "@ai/llm/ConversationGemini";
import useExternalState from "@utils/useExternalState";
import { ComponentChildren } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { v4 as uuidv4 } from "uuid";

import ImageToText from "../imageToText/ImageToText";
import Conversation from "../llm/Conversation";
import useMcpServer from "../mcp/react/useMcpServer";
import SpeechToText from "../speechToText/SpeechToText";
import Kokoro from "../textToSpeech/kokoro/Kokoro";
import { Message, MessagePartType, MessageRole, MessageUser } from "../types";
import VoiceActivityDetection from "../voiceActivityDetection/VoiceActivityDetection";
import { VoiceActivityDetectionStatus } from "../voiceActivityDetection/types";
import AgentContext, { DownloadModelProgress } from "./AgentContext";
import { FILL_WORDS } from "./constants";

export default function AgentContextProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const [cacheCheckDone, setCacheCheckDone] = useState<boolean>(false);
  const [allModelsLoaded, setAllModelsLoaded] = useState<boolean>(false);
  const { active: activeMcpServers } = useMcpServer();
  const [mute, setMute] = useState<boolean>(true);
  const [jarvisActive, setJarvisActive] = useState<boolean>(false);

  const [speakerAbortController, setSpeakerAbortController] = useState(
    () => new AbortController()
  );

  const speechToText = useMemo(() => new SpeechToText(), []);
  const tts = useMemo(() => new Kokoro(), []);
  const imageToText = useMemo(() => new ImageToText(), []);

  const isSpeaking = useExternalState<boolean>(
    tts.player.onIsPlayingChange,
    () => tts.player.isPlaying
  );

  const conversation = useMemo(
    () =>
      new ConversationGemini({
        onConversationEnded: () => setJarvisActive(false),
        conversationEndKeyword: "<END>",
      }),
    []
  );

  const conversationIdRef = useRef<string>();
  const evaluateConversation = useCallback(() => {
    if (!allModelsLoaded) return;
    const conversationId = JSON.stringify([
      SYSTEM_PROMPT,
      INSTRUCTIONS,
      activeMcpServers,
    ]);

    if (conversationIdRef.current === conversationId) return;
    conversation.createConversation(
      SYSTEM_PROMPT + "\n\n# Instructions:\n\n" + INSTRUCTIONS.join("\n"),
      activeMcpServers
    );
    conversationIdRef.current = conversationId;
  }, [activeMcpServers, allModelsLoaded, conversation]);

  const messages = useExternalState<Array<Message>>(
    conversation.onMessagesChange,
    () => conversation.messages
  );

  const conversationStatus = useExternalState(
    conversation.onStatusChange,
    () => conversation.status
  );

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
    [processPrompt, tts, speakerAbortController.signal, mute]
  );

  const vadListeners = useRef<Set<(text: string) => void>>(new Set());
  const onVadDetected = useCallback((callback: (text: string) => void) => {
    vadListeners.current.add(callback);
    return () => vadListeners.current.delete(callback);
  }, []);

  const vad = useMemo(() => {
    const vad = new VoiceActivityDetection();
    vad.setCallbacks({
      onSpeechChunk: (buffer, timing) => {
        timing.duration > 200 &&
          speechToText.generate(buffer).then((text) => {
            const isFillWord = FILL_WORDS.includes(text.trim().toLowerCase());
            const possibleFillWord =
              text.trim().startsWith("(") && text.trim().startsWith(")");
            if (!isFillWord && !possibleFillWord) {
              vadListeners.current.forEach((callback) => callback(text));
            }
          });
      },
    });
    return vad;
  }, [speechToText, vadListeners.current]);

  const vadStatus = useExternalState<VoiceActivityDetectionStatus>(
    vad.onStatusChange,
    () => vad.status
  );

  const loadModels = useCallback(
    (callback: (progress: DownloadModelProgress) => void = () => {}) =>
      new Promise<void>(async (resolve) => {
        const loaded: DownloadModelProgress = {
          vad: 0,
          llm: 0,
          tts: 0,
          stt: 0,
          vlm: 0,
        };

        const listener = (model: string, progress: number) => {
          loaded[model as keyof DownloadModelProgress] = progress;
          callback({ ...loaded });
        };

        await Promise.all([
          vad.preload((progress) => listener("vad", progress)),
          speechToText.preload((progress) => listener("stt", progress)),
          tts.preload((progress) => listener("tts", progress)),
          conversation.createConversation(
            "",
            [],
            (progress) => listener("llm", Math.round(progress * 100)),
            false,
            false
          ),
          imageToText.preload((progress) => listener("vlm", progress)),
        ]);
        setAllModelsLoaded(true);
        resolve();
      }),
    [vad, speechToText, tts, conversation, imageToText]
  );

  useEffect(() => {
    (async () => {
      const [vadCached, sttCached, ttsCached, llmCached, vlmCached] =
        await Promise.all([
          vad.isCached(),
          speechToText.isCached(),
          tts.isCached(),
          conversation.isCached(),
          imageToText.isCached(),
        ]);
      if (vadCached && sttCached && ttsCached && llmCached && vlmCached) {
        await loadModels();
      }
      setCacheCheckDone(true);
    })();
  }, []);

  return (
    <AgentContext
      value={{
        messages,
        conversationStatus,
        submit,
        isMute: mute,
        setMute: (mute) => {
          setMute(mute);
          if (mute) {
            speakerAbortController.abort();
            setSpeakerAbortController(new AbortController());
          }
        },
        isDeaf: vadStatus === VoiceActivityDetectionStatus.IDLE,
        setDeaf: async (deaf) =>
          deaf ? vad.stopMicrophone() : await vad.startMicrophone(),
        isSpeaking,
        loadModels,
        cacheCheckDone,
        allModelsLoaded,
        onVadDetected,
        evaluateConversation,
        jarvisActive,
        setJarvisActive,
      }}
    >
      {children}
    </AgentContext>
  );
}

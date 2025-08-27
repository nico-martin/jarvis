import ImageToText from "@ai/imageToText/ImageToText";
import Conversation from "@ai/llm/Conversation";
import useStableValue from "@utils/useStableValue";
import { ComponentChildren } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { v4 as uuidv4 } from "uuid";

import useMcpServer from "../mcp/react/useMcpServer";
import SpeechToText from "../speechToText/SpeechToText";
import Kokoro from "../textToSpeech/kokoro/Kokoro";
import { MessagePartType, MessageRole, MessageUser } from "../types";
import VoiceActivityDetection from "../voiceActivityDetection/VoiceActivityDetection";
import AgentContext, {
  AgentContextValues,
  DownloadModelProgress,
  DownloadedModels,
} from "./AgentContext";
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
But only use that if you are 100% sure the user explicitly told you to end the conversation!

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
  const [downloadCheckDone, setDownloadCheckDone] = useState<boolean>(false);
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModels>({
    vad: false,
    llm: false,
    tts: false,
    stt: false,
    vlm: false,
  });
  const { active } = useMcpServer();
  const stableActiveServers = useStableValue(active);
  const [mute, setMute] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const endedListeners = useRef<Set<() => void>>(new Set());

  const [speakerAbortController, setSpeakerAbortController] = useState(
    () => new AbortController()
  );

  const speechToText = useMemo(() => new SpeechToText(), []);

  const tts = useMemo(() => new Kokoro(), []);

  useEffect(() => {
    const unsubscribe = tts.player.onIsPlayingChange(() => {
      setIsSpeaking(tts.player.isPlaying);
    });
    return () => {
      unsubscribe();
    };
  }, [tts]);

  const conversation = useMemo(
    () =>
      new Conversation({
        onConversationEnded: () => {
          endedListeners.current.forEach((callback) => callback());
        },
        conversationEndKeyword: "<END>",
      }),
    []
  );

  const imageToText = useMemo(() => new ImageToText(), []);

  useEffect(() => {
    if (!stableActiveServers || !downloadedModels.llm) return;
    conversation.createConversation(
      SYSTEM_PROMPT + "\n\n# Instructions:\n" + INSTRUCTIONS.join("\n"),
      stableActiveServers
    );
  }, [stableActiveServers, conversation, downloadedModels]);

  const [messages, setMessages] = useState(() => conversation.messages);
  const [conversationStatus, setConversationStatus] = useState(
    () => conversation.status
  );

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
  const onVadDetected = useCallback((callback: (text: string) => void) => {
    vadListeners.current.add(callback);
    return () => vadListeners.current.delete(callback);
  }, []);

  const onEnded = useCallback((callback: () => void) => {
    endedListeners.current.add(callback);
    return () => endedListeners.current.delete(callback);
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

  const [vadStatus, setVadStatus] = useState(() => vad.status);

  useEffect(() => {
    const unsubscribeVad = vad.onStatusChange(() => {
      setVadStatus(vad.status);
    });

    return () => {
      unsubscribeVad();
    };
  }, [vad]);

  const preloadModels = useCallback(
    (callback: (progress: DownloadModelProgress) => void) =>
      new Promise<void>((resolve) => {
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
          const allLoaded =
            Object.values(loaded).filter((p) => p !== 100).length === 0;
          if (allLoaded) {
            setDownloadedModels({
              vad: true,
              llm: true,
              tts: true,
              stt: true,
              vlm: true,
            });
            resolve();
          }
        };
        vad.isCached()
          ? vad.preload((progress) => listener("vad", progress))
          : listener("vad", 100);
        speechToText.isCached()
          ? speechToText.preload((progress) => listener("stt", progress))
          : listener("stt", 100);
        tts.isCached()
          ? tts.preload((progress) => listener("tts", progress))
          : listener("tts", 100);
        conversation.isCached()
          ? conversation.createConversation("", [], (progress) =>
              listener("llm", Math.round(progress * 100))
            )
          : listener("llm", 100);
        imageToText.isCached()
          ? imageToText.preload((progress) => listener("vlm", progress))
          : listener("vlm", 100);
      }),
    []
  );

  useEffect(() => {
    if (!vad) return;
    Promise.all([
      vad.isCached(),
      speechToText.isCached(),
      tts.isCached(),
      conversation.isCached(),
      imageToText.isCached(),
    ]).then(([vad, stt, tts, llm, vlm]) => {
      if (vad && tts && stt && llm && vlm) {
        preloadModels(() => {}).then(() => {
          setDownloadCheckDone(true);
          setDownloadedModels({ vad, llm, tts, stt, vlm });
        });
      } else {
        setDownloadCheckDone(true);
      }
    });
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
      isSpeaking,
      abortSpeaker: () => {
        speakerAbortController.abort();
        setSpeakerAbortController(new AbortController());
      },
      onVadDetected,
      onEnded,
      downloadCheckDone,
      downloadedModels,
      preloadModels,
    }),
    [
      messages,
      conversationStatus,
      vad,
      vadStatus,
      submit,
      mute,
      isSpeaking,
      onVadDetected,
      onEnded,
      downloadCheckDone,
      downloadedModels,
      preloadModels,
    ]
  );

  return <AgentContext value={contextValue}>{children}</AgentContext>;
}

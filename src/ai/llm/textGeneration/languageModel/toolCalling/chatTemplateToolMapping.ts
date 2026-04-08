import type { ModelIds } from "../../constants";
import GemmaToolMapper from "./GemmaToolMapper";
import OpenAIToolMapper from "./OpenAIToolMapper";
import type { ChatTemplateToolMapper } from "./types";

export type { NativeToolDefinition, SerializableToolDefinition } from "./types";

const openAIToolMapper = new OpenAIToolMapper();
const gemmaToolMapper = new GemmaToolMapper();

const TOOL_MAPPERS: Partial<Record<string, ChatTemplateToolMapper>> = {
  "Gemma4-E2B": gemmaToolMapper,
  "Gemma4-E4B": gemmaToolMapper,
  "Qwen3-4B": openAIToolMapper,
};

export const getChatTemplateToolMapper = (
  modelId: ModelIds
): ChatTemplateToolMapper | null => {
  return TOOL_MAPPERS[modelId] ?? null;
};

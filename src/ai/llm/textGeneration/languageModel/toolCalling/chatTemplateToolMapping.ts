import { MODEL_ID, type ModelIds } from "../../constants";
import GemmaToolMapper from "./GemmaToolMapper";
import type { ChatTemplateToolMapper } from "./types";

export type { NativeToolDefinition, SerializableToolDefinition } from "./types";

const gemmaToolMapper = new GemmaToolMapper();

const TOOL_MAPPERS: Partial<Record<string, ChatTemplateToolMapper>> = {
  [MODEL_ID]: gemmaToolMapper,
};

export const getChatTemplateToolMapper = (
  modelId: ModelIds
): ChatTemplateToolMapper | null => {
  return TOOL_MAPPERS[modelId] ?? null;
};

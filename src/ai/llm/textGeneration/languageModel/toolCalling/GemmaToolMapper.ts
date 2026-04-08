import type {
  ChatTemplateToolMapper,
  SerializableToolDefinition,
} from "./types";
import {
  dedupeToolCalls,
  mapToolsToOpenAIFunctions,
  parseGemmaToolCalls,
  parseJsonToolCalls,
} from "./utils";

class GemmaToolMapper implements ChatTemplateToolMapper {
  mapTools(tools: Array<SerializableToolDefinition>) {
    return mapToolsToOpenAIFunctions(tools);
  }

  parseToolCalls(response: string) {
    return dedupeToolCalls([
      ...parseJsonToolCalls(response),
      ...parseGemmaToolCalls(response),
    ]);
  }
}

export default GemmaToolMapper;

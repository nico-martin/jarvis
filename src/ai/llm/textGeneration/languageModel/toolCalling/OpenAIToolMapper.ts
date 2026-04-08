import type {
  ChatTemplateToolMapper,
  SerializableToolDefinition,
} from "./types";
import {
  mapToolsToOpenAIFunctions,
  parseJsonToolCalls,
  parseXmlFunctionCalls,
} from "./utils";

class OpenAIToolMapper implements ChatTemplateToolMapper {
  mapTools(tools: Array<SerializableToolDefinition>) {
    return mapToolsToOpenAIFunctions(tools);
  }

  parseToolCalls(response: string) {
    return [
      ...parseJsonToolCalls(response),
      ...parseXmlFunctionCalls(response),
    ];
  }
}

export default OpenAIToolMapper;

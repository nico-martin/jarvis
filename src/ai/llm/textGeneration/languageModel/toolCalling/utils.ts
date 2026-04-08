import type { XMLToolSignature } from "@ai/types";

import type { SerializableToolDefinition } from "./types";

const normalizeArguments = (value: unknown): Record<string, any> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return {};
    }
  }

  return {};
};

export const parseXmlFunctionCalls = (
  response: string
): Array<XMLToolSignature> => {
  const functionCallRegex =
    /<functionCall>\s*<name>([^<]+)<\/name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/functionCall>/g;
  const paramRegex = /<(\w+)\s+type="([^"]+)">([^<]*)<\/\1>/g;
  const calls: Array<XMLToolSignature> = [];
  let functionMatch: RegExpExecArray | null = null;

  while ((functionMatch = functionCallRegex.exec(response)) !== null) {
    const functionName = functionMatch[1]?.trim();
    const parametersXml = functionMatch[2] ?? "";
    const parameters: Record<string, any> = {};

    let paramMatch: RegExpExecArray | null = null;
    while ((paramMatch = paramRegex.exec(parametersXml)) !== null) {
      const [, paramName, _type, value] = paramMatch;
      parameters[paramName] = value;
    }

    if (functionName) {
      calls.push({ functionName, parameters });
    }
  }

  return calls;
};

export const parseJsonToolCalls = (
  response: string
): Array<XMLToolSignature> => {
  const toolCallRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  const calls: Array<XMLToolSignature> = [];
  let match: RegExpExecArray | null = null;

  while ((match = toolCallRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const rawCalls = Array.isArray(parsed) ? parsed : [parsed];

      for (const rawCall of rawCalls) {
        if (!rawCall || typeof rawCall !== "object") {
          continue;
        }

        const functionName =
          rawCall.name ??
          rawCall.functionName ??
          rawCall.function?.name ??
          rawCall.tool_name;

        if (!functionName || typeof functionName !== "string") {
          continue;
        }

        const parameters = normalizeArguments(
          rawCall.arguments ?? rawCall.parameters ?? rawCall.function?.arguments
        );

        calls.push({
          functionName,
          parameters,
        });
      }
    } catch {
      continue;
    }
  }

  return calls;
};

const parseGemmaArguments = (rawArguments: string): Record<string, any> => {
  const normalized = rawArguments
    .replace(/<\|"\|>/g, '"')
    .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
    .replace(/:\s*([^,}\]]+)(\s*[,}\]])/g, (_match, rawToken, suffix) => {
      const token = String(rawToken).trim();

      if (!token) {
        return `:${token}${suffix}`;
      }

      if (
        token.startsWith('"') ||
        token.startsWith("{") ||
        token.startsWith("[")
      ) {
        return `:${token}${suffix}`;
      }

      if (/^(true|false|null)$/i.test(token)) {
        return `:${token}${suffix}`;
      }

      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) {
        return `:${token}${suffix}`;
      }

      const escaped = token.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `:"${escaped}"${suffix}`;
    });

  try {
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {
    return {};
  }

  return {};
};

const parseBareGemmaToolCalls = (response: string): Array<XMLToolSignature> => {
  const calls: Array<XMLToolSignature> = [];
  let cursor = 0;

  while (cursor < response.length) {
    const callStart = response.indexOf("call:", cursor);
    if (callStart === -1) {
      break;
    }

    const argsStart = response.indexOf("{", callStart);
    if (argsStart === -1) {
      cursor = callStart + 5;
      continue;
    }

    const functionName = response.slice(callStart + 5, argsStart).trim();
    if (!functionName) {
      cursor = argsStart + 1;
      continue;
    }

    let i = argsStart;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let argsEnd = -1;

    for (; i < response.length; i++) {
      const ch = response[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          argsEnd = i;
          break;
        }
      }
    }

    if (argsEnd === -1) {
      cursor = argsStart + 1;
      continue;
    }

    const rawArguments = response.slice(argsStart, argsEnd + 1);
    calls.push({
      functionName,
      parameters: parseGemmaArguments(rawArguments),
    });

    cursor = argsEnd + 1;
  }

  return calls;
};

export const parseGemmaToolCalls = (
  response: string
): Array<XMLToolSignature> => {
  const gemmaToolRegex = /<\|tool_call\>([\s\S]*?)<tool_call\|>/g;
  const calls: Array<XMLToolSignature> = [];
  let match: RegExpExecArray | null = null;

  while ((match = gemmaToolRegex.exec(response)) !== null) {
    const payload = match[1].trim();
    const nameMatch = payload.match(/^call:([^\{]+)\{/);
    const argsMatch = payload.match(/^call:[^\{]+(\{[\s\S]*\})$/);

    if (!nameMatch) {
      continue;
    }

    const functionName = nameMatch[1].trim();
    const parameters = argsMatch ? parseGemmaArguments(argsMatch[1]) : {};

    calls.push({
      functionName,
      parameters,
    });
  }

  return [...calls, ...parseBareGemmaToolCalls(response)];
};

export const mapToolsToOpenAIFunctions = (
  tools: Array<SerializableToolDefinition>
) =>
  tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema ?? {
        type: "object",
        properties: {},
      },
    },
  }));

export const dedupeToolCalls = (
  calls: Array<XMLToolSignature>
): Array<XMLToolSignature> => {
  const seen = new Set<string>();
  const deduped: Array<XMLToolSignature> = [];

  for (const call of calls) {
    const key = JSON.stringify(call);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(call);
  }

  return deduped;
};

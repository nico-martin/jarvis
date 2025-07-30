import { XMLToolSignature } from "@ai/types";

const isFullXMLToolCall = (snippet: string): XMLToolSignature => {
  const functionCallRegex =
    /<functionCall>\s*<name>([^<]+)<\/name>\s*<parameters>(.*?)<\/parameters>\s*<\/functionCall>/s;

  const match = functionCallRegex.exec(snippet);

  if (!match) {
    return null;
  }

  const functionName = match[1].trim();
  const parametersXml = match[2].trim();
  const parameters: Record<string, any> = {};

  const paramRegex = /<(\w+)\s+type="([^"]+)">([^<]*)<\/\1>/g;
  let paramMatch;

  while ((paramMatch = paramRegex.exec(parametersXml)) !== null) {
    const [, paramName, type, value] = paramMatch;
    parameters[paramName] = value;
  }

  return { functionName, parameters };
};

export default isFullXMLToolCall;

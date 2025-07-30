import { Tool } from "@modelcontextprotocol/sdk/types.js";

const createFunctionCallTemplate = (
  functionName: string,
  parameters: Array<{ name: string; type: string; value: string }>
) => {
  const parameterElements = parameters
    .map(
      (param) =>
        `    <${param.name} type="${param.type}">${param.value}</${param.name}>`
    )
    .join("\n");

  return `<functionCall>
  <name>${functionName}</name>
  <parameters>
${parameterElements}
  </parameters>
</functionCall>`;
};

const generateExampleCall = (tool: Tool) => {
  if (!tool.inputSchema?.properties) {
    return createFunctionCallTemplate(tool.name, []);
  }

  const properties = tool.inputSchema.properties;
  const required = tool.inputSchema.required || [];

  const exampleParams = Object.entries(properties).map(
    ([paramName, paramSchema]: [string, any]) => {
      const type = paramSchema.type || "string";
      let exampleValue = "";

      switch (type) {
        case "string":
          exampleValue = paramSchema.default || `example ${paramName}`;
          break;
        case "integer":
        case "number":
          exampleValue = paramSchema.default?.toString() || "10";
          break;
        case "boolean":
          exampleValue = paramSchema.default?.toString() || "true";
          break;
        default:
          exampleValue =
            paramSchema.default?.toString() || `example ${paramName}`;
      }

      return { name: paramName, type, value: exampleValue };
    }
  );

  return createFunctionCallTemplate(tool.name, exampleParams);
};

const toolsToSystemPrompt = (tools: Array<Tool>): string => {
  const toolDescriptions: Array<string> = tools.map((tool) => {
    let parameterText = "**Parameters:** None";

    if (tool.inputSchema?.properties) {
      const properties = tool.inputSchema.properties;
      const required = tool.inputSchema.required || [];

      const parameterList = Object.entries(properties).map(
        ([paramName, paramSchema]: [string, any]) => {
          const isRequired = required.includes(paramName);
          const type = paramSchema.type || "string";
          const description =
            paramSchema.description || "No description available";
          const defaultValue = paramSchema.default;

          let paramLine = `- ${paramName} (${type}`;
          if (isRequired) {
            paramLine += ", required";
          } else {
            paramLine += ", optional";
            if (defaultValue !== undefined) {
              paramLine += `, default: ${JSON.stringify(defaultValue)}`;
            }
          }
          paramLine += `): ${description}`;

          return paramLine;
        }
      );

      if (parameterList.length > 0) {
        parameterText = `**Parameters:**\n${parameterList.join("\n")}`;
      }
    }

    const exampleCall = generateExampleCall(tool);

    return `**Tool Name:** ${tool.name}
**Description:** ${tool.description}
${parameterText}
**Example:**
${exampleCall}`;
  });

  return `#Tool Calling

You have the ability to call tools to accomplish tasks or find context to answer questions. Use them when necessary to provide accurate, helpful responses.
Never tell the user you cant do something if there is a tool that could do it.
  
## Available Tools

${toolDescriptions.join("\n\n")}

## Usage Guidelines

- **When to use tools:** Use tools when you need to store information, retrieve stored information, or take photos to answer the user's question
- **When not to use tools:** Don't use tools for general knowledge questions you can answer directly
- **Always explain first:** Before calling any tool, briefly explain to the user why you're using that specific tool

## Format

Use this exact format for tool calls:

${createFunctionCallTemplate("{functionName}", [
  { name: "{paramName}", type: "{type}", value: "{value}" },
])}`;
};

export default toolsToSystemPrompt;

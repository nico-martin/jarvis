import { McpServer } from "@ai/mcp/McpServer";
import { Button, Message, Modal } from "@theme";
import React from "react";

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface CallToolProps {
  isOpen: boolean;
  onClose: () => void;
  server: McpServer;
  tool: Tool;
}

export function CallTool({ isOpen, onClose, server, tool }: CallToolProps) {
  const [parameters, setParameters] = React.useState<Record<string, any>>({});
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Generate form fields based on the tool's input schema
  const generateFormFields = () => {
    if (!tool.inputSchema?.properties) {
      return null;
    }

    const properties = tool.inputSchema.properties;
    const required = tool.inputSchema.required || [];

    return Object.entries(properties).map(([key, schema]: [string, any]) => {
      const isRequired = required.includes(key);

      return (
        <div key={key} className="mb-4">
          <label className="text-text mb-1 block text-sm font-medium uppercase">
            {key}
            {isRequired && <span className="ml-1 text-red-200">*</span>}
          </label>

          {schema.description && (
            <p className="text-primary-400/80 mb-2 text-xs">
              {schema.description}
            </p>
          )}

          {renderFormField(key, schema, parameters[key], (value) =>
            setParameters((prev) => ({ ...prev, [key]: value }))
          )}
        </div>
      );
    });
  };

  const renderFormField = (
    key: string,
    schema: any,
    value: any,
    onChange: (value: any) => void
  ) => {
    const commonClasses =
      "w-full px-3 py-2 border border-primary-400/50 bg-primary-950/20 backdrop-blur-sm text-text placeholder:text-primary-400/60  focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-300 shadow-[inset_0_0_10px_rgba(0,162,255,0.1)]";

    if (schema.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="text-text border-primary-400/50 bg-primary-950/20 focus:ring-primary-400/50 rounded focus:ring-2"
        />
      );
    }

    if (schema.type === "number" || schema.type === "integer") {
      return (
        <input
          type="number"
          value={value || ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : undefined)
          }
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === "integer" ? 1 : "any"}
          className={commonClasses}
          placeholder={`Enter ${key}...`}
        />
      );
    }

    if (schema.enum) {
      return (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={commonClasses}
        >
          <option value="">Select {key}...</option>
          {schema.enum.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (schema.type === "object" || schema.type === "array") {
      return (
        <textarea
          value={value ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => {
            try {
              const parsed = e.target.value
                ? JSON.parse(e.target.value)
                : undefined;
              onChange(parsed);
            } catch {
              // Invalid JSON, keep the string value for now
              onChange(e.target.value);
            }
          }}
          rows={4}
          className={commonClasses}
          placeholder={`Enter ${key} as JSON...`}
        />
      );
    }

    // Default to text input
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={commonClasses}
        placeholder={`Enter ${key}...`}
      />
    );
  };

  const handleCall = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const toolResult = await server.callTool(tool.name, parameters);
      setResult(toolResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setParameters({});
    setResult(null);
    setError(null);
    onClose();
  };

  const formatResult = (result: any) => {
    if (result?.content) {
      return result.content.map((item: any, index: number) => {
        if (item.type === "text") {
          return (
            <div key={index} className="mb-2">
              <div className="text-text mb-1 text-xs font-medium uppercase">
                TEXT_OUTPUT:
              </div>
              <div className="text-primary-200 text-sm whitespace-pre-wrap">
                {item.text}
              </div>
            </div>
          );
        }
        if (item.type === "image") {
          return (
            <div key={index} className="mb-2">
              <div className="text-text mb-1 text-xs font-medium uppercase">
                IMAGE_OUTPUT:
              </div>
              <img
                src={`data:${item.mimeType};base64,${item.data}`}
                alt="Tool result"
                className="border-primary-400/30 max-w-full border shadow-[0_0_10px_rgba(0,162,255,0.2)]"
              />
            </div>
          );
        }
        return (
          <div key={index} className="mb-2">
            <div className="text-text mb-1 text-xs font-medium uppercase">
              {item.type || "UNKNOWN"}_OUTPUT:
            </div>
            <pre className="text-text/80 border-primary-400/20 overflow-x-auto border bg-black/30 p-2 text-xs">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        );
      });
    }

    return (
      <pre className="text-text/80 border-primary-400/20 overflow-x-auto border bg-black/30 p-3 text-sm">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <Modal
      open={isOpen}
      setOpen={handleClose}
      title={`Call Tool: ${tool.name}`}
      subtitle={tool.description}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-text mb-3 text-sm font-medium uppercase">
            PARAMETERS
          </h3>
          {tool.inputSchema?.properties ? (
            <div className="space-y-3">{generateFormFields()}</div>
          ) : (
            <p className="text-primary-400/80 text-sm">
              NO_PARAMETERS_REQUIRED
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCall} disabled={isLoading}>
            {isLoading ? "EXECUTING..." : "EXECUTE_TOOL"}
          </Button>
        </div>

        {error && (
          <Message type="error" title="ERROR">
            {error}
          </Message>
        )}

        {result && (
          <Message type="success" title="RESULT">
            <div className="text-sm">{formatResult(result)}</div>
          </Message>
        )}
      </div>
    </Modal>
  );
}

export default CallTool;

import { McpServer } from "@ai/mcp/McpServer";
import { Button, Modal } from "@theme";
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
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {key}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </label>

          {schema.description && (
            <p className="mb-2 text-xs text-gray-500">{schema.description}</p>
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
      "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    if (schema.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
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
              <div className="mb-1 text-xs font-medium text-gray-600">
                Text:
              </div>
              <div className="text-sm whitespace-pre-wrap text-gray-800">
                {item.text}
              </div>
            </div>
          );
        }
        if (item.type === "image") {
          return (
            <div key={index} className="mb-2">
              <div className="mb-1 text-xs font-medium text-gray-600">
                Image:
              </div>
              <img
                src={`data:${item.mimeType};base64,${item.data}`}
                alt="Tool result"
                className="max-w-full rounded border"
              />
            </div>
          );
        }
        return (
          <div key={index} className="mb-2">
            <div className="mb-1 text-xs font-medium text-gray-600">
              {item.type || "Unknown"}:
            </div>
            <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-800">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        );
      });
    }

    return (
      <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-sm text-gray-800">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <Modal
      open={isOpen}
      setOpen={handleClose}
      title={`Call Tool: ${tool.name}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Tool Description */}
        {tool.description && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">{tool.description}</p>
          </div>
        )}

        {/* Parameters Form */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">Parameters</h3>
          {tool.inputSchema?.properties ? (
            <div className="space-y-3">{generateFormFields()}</div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              This tool takes no parameters
            </p>
          )}
        </div>

        {/* Call Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCall}
            disabled={isLoading}
            className="min-w-24"
          >
            {isLoading ? "Calling..." : "Call Tool"}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <h4 className="mb-1 text-sm font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <h4 className="mb-2 text-sm font-medium text-green-800">Result</h4>
            <div className="text-sm">{formatResult(result)}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CallTool;

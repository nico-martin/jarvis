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
          <label className="mb-1 block text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">
            {key}
            {isRequired && <span className="ml-1 text-red-400">*</span>}
          </label>

          {schema.description && (
            <p className="mb-2 text-xs text-blue-400/80 font-mono">{schema.description}</p>
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
      "w-full px-3 py-2 border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm text-blue-300 placeholder:text-blue-400/60 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-300 shadow-[inset_0_0_10px_rgba(0,162,255,0.1)]";

    if (schema.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-blue-400/50 bg-blue-950/20 focus:ring-2 focus:ring-blue-400/50 text-blue-300"
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
              <div className="mb-1 text-xs font-medium text-blue-300 font-mono uppercase tracking-wider">
                TEXT_OUTPUT:
              </div>
              <div className="text-sm whitespace-pre-wrap text-blue-200 font-mono">
                {item.text}
              </div>
            </div>
          );
        }
        if (item.type === "image") {
          return (
            <div key={index} className="mb-2">
              <div className="mb-1 text-xs font-medium text-blue-300 font-mono uppercase tracking-wider">
                IMAGE_OUTPUT:
              </div>
              <img
                src={`data:${item.mimeType};base64,${item.data}`}
                alt="Tool result"
                className="max-w-full border border-blue-400/30 shadow-[0_0_10px_rgba(0,162,255,0.2)]"
              />
            </div>
          );
        }
        return (
          <div key={index} className="mb-2">
            <div className="mb-1 text-xs font-medium text-blue-300 font-mono uppercase tracking-wider">
              {item.type || "UNKNOWN"}_OUTPUT:
            </div>
            <pre className="overflow-x-auto bg-black/30 border border-blue-400/20 p-2 text-xs text-blue-300/80 font-mono">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        );
      });
    }

    return (
      <pre className="overflow-x-auto bg-black/30 border border-blue-400/20 p-3 text-sm text-blue-300/80 font-mono">
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
          <div className="border border-blue-400/30 bg-blue-950/20 backdrop-blur-sm p-3 shadow-[0_0_15px_rgba(0,162,255,0.1)]">
            <p className="text-sm text-blue-300 font-mono">{tool.description}</p>
          </div>
        )}

        {/* Parameters Form */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">PARAMETERS</h3>
          {tool.inputSchema?.properties ? (
            <div className="space-y-3">{generateFormFields()}</div>
          ) : (
            <p className="text-sm text-blue-400/80 font-mono">
              NO_PARAMETERS_REQUIRED
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
            {isLoading ? "EXECUTING..." : "EXECUTE_TOOL"}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="border border-red-400/50 bg-red-950/20 backdrop-blur-sm p-3 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <h4 className="mb-1 text-sm font-medium text-red-400 font-mono uppercase tracking-wider">ERROR</h4>
            <p className="text-sm text-red-300 font-mono">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="border border-green-400/50 bg-green-950/20 backdrop-blur-sm p-3 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <h4 className="mb-2 text-sm font-medium text-green-400 font-mono uppercase tracking-wider">RESULT</h4>
            <div className="text-sm">{formatResult(result)}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CallTool;

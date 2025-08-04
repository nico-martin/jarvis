import { McpServer } from "@ai/mcp/McpServer";
import {
  Button,
  Checkbox,
  InputText,
  Message,
  Modal,
  Select,
  Textarea,
} from "@theme";
import type { SelectOption } from "@theme";
import { useState } from "preact/hooks";
import { JSX } from "preact";

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
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate form fields based on the tool's input schema
  const generateFormFields = () => {
    if (!tool.inputSchema?.properties) {
      return null;
    }

    const properties = tool.inputSchema.properties;
    const required = tool.inputSchema.required || [];

    return Object.entries(properties).map(([key, schema]: [string, any]) => {
      const isRequired = required.includes(key);

      return renderFormField(
        key,
        schema,
        parameters[key],
        isRequired,
        (value) => setParameters((prev) => ({ ...prev, [key]: value }))
      );
    });
  };

  const renderFormField = (
    key: string,
    schema: any,
    value: any,
    isRequired: boolean,
    onChange: (value: any) => void
  ) => {
    const fieldId = `tool-${tool.name}-${key}`;

    if (schema.type === "boolean") {
      return (
        <div key={key}>
          <div className="mb-1">
            <span className="text-primary-300 text-xs font-medium tracking-wider uppercase">
              {key.toUpperCase()}
              {isRequired && <span className="ml-1 text-red-400">*</span>}
            </span>
          </div>
          {schema.description && (
            <p className="text-primary-400/80 mb-2 text-xs">
              {schema.description}
            </p>
          )}
          <Checkbox
            id={fieldId}
            name={key}
            value={value ? "true" : "false"}
            label="Enable"
            checked={value || false}
            onChange={(checked) => onChange(checked)}
          />
        </div>
      );
    }

    if (schema.type === "number" || schema.type === "integer") {
      return (
        <InputText
          key={key}
          id={fieldId}
          name={key}
          type="number"
          label={key.toUpperCase()}
          description={schema.description}
          required={isRequired}
          value={value?.toString() || ""}
          placeholder={`Enter ${key}...`}
          onChange={(e) => {
            const numValue = e.target.value
              ? Number(e.target.value)
              : undefined;
            onChange(numValue);
          }}
        />
      );
    }

    if (schema.enum) {
      const options: SelectOption[] = schema.enum.map((option: string) => ({
        value: option,
        label: option,
      }));

      return (
        <Select
          key={key}
          id={fieldId}
          name={key}
          label={key.toUpperCase()}
          description={schema.description}
          required={isRequired}
          value={value || ""}
          options={options}
          placeholder={`Select ${key}...`}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    }

    if (schema.type === "object" || schema.type === "array") {
      return (
        <Textarea
          key={key}
          id={fieldId}
          name={key}
          label={key.toUpperCase()}
          description={
            schema.description
              ? `${schema.description} (JSON format)`
              : "Enter as JSON"
          }
          required={isRequired}
          value={value ? JSON.stringify(value, null, 2) : ""}
          rows={4}
          placeholder={`Enter ${key} as JSON...`}
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
        />
      );
    }

    // Default to text input
    return (
      <InputText
        key={key}
        id={fieldId}
        name={key}
        label={key.toUpperCase()}
        description={schema.description}
        required={isRequired}
        value={value || ""}
        placeholder={`Enter ${key}...`}
        onChange={(e) => onChange(e.target.value || undefined)}
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
            <div className="space-y-4">{generateFormFields()}</div>
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

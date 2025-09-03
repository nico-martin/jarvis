import useAgent from "@ai/agentContext/useAgent";
import { MessagePartTool, MessagePartType, MessageRole } from "@ai/types";
import cn from "@utils/classnames";
import { useMemo } from "preact/hooks";

interface ToolCallPopupProps {
  id: string;
}

export default function ToolCallPopup({ id }: ToolCallPopupProps) {
  const { messages } = useAgent();
  const toolCall = useMemo(
    () =>
      messages
        .filter((m) => m.role === MessageRole.ASSISTANT)
        .flatMap(
          (m) =>
            m.messageParts.filter(
              (mp) => mp.type === MessagePartType.TOOL_CALL
            ) as MessagePartTool[]
        )
        .find((tc) => tc.id === id),
    [id, messages]
  );

  if (!toolCall) {
    return null;
  }

  return (
    <div className={cn("w-[300px]")}>
      <div className="relative w-full rounded-lg border border-cyan-500/30 bg-slate-900/90 p-4 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-sm">
        {/* Connecting line to center */}
        <div className="absolute top-1/2 right-full h-px w-8 -translate-y-1/2 bg-gradient-to-l from-cyan-500/50 to-transparent" />

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <div className="font-mono text-xs tracking-wider text-cyan-400 uppercase">
              Tool Call
            </div>
          </div>

          <div className="font-mono text-sm text-white">
            {toolCall.functionName}
          </div>

          {Object.keys(toolCall.parameters).length > 0 && (
            <div className="font-mono text-xs text-slate-300">
              {Object.entries(toolCall.parameters).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="text-cyan-300">{key}:</span>{" "}
                  <span className="text-slate-400">
                    {typeof value === "string"
                      ? value.slice(0, 30)
                      : JSON.stringify(value).slice(0, 30)}
                    {(typeof value === "string"
                      ? value.length
                      : JSON.stringify(value).length) > 30 && "..."}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 border-t border-slate-700 pt-2 font-mono text-xs">
            <div className="mb-1 flex items-center space-x-2">
              <div
                className={`h-1.5 w-1.5 rounded-full ${toolCall.response ? "animate-pulse bg-green-400" : "bg-yellow-400"}`}
              />
              <div
                className={`tracking-wider uppercase ${toolCall.response ? "text-green-400" : "text-yellow-400"}`}
              >
                {toolCall.response ? "Result" : "Pending"}
              </div>
            </div>
            <div className="max-h-20 overflow-y-auto rounded bg-slate-800/50 p-2">
              {toolCall.response ? (
                <div className="overflow-hidden text-green-300">
                  {toolCall.response.length <= 100 ? (
                    toolCall.response
                  ) : (
                    <>
                      <div>{toolCall.response.slice(0, 100)}...</div>
                      <div className="mt-1 text-xs text-slate-400 italic">
                        ({toolCall.response.length} chars total)
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-yellow-300 italic">
                  Awaiting response...
                </div>
              )}
            </div>
          </div>

          {toolCall.responseMedia && (
            <div className="font-mono text-xs text-blue-300">
              <div className="flex items-center space-x-1">
                <div className="h-1 w-1 rounded-full bg-blue-400" />
                <span>{toolCall.responseMedia.type.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Prompt } from "@modelcontextprotocol/sdk/types.js";
import cn from "@utils/classnames";

function McpPrompts({
  className = "",
  prompts = [],
}: {
  className?: string;
  prompts: Array<Prompt>;
}) {
  return (
    <div className={cn("border-t border-blue-400/20 px-6 py-4", className)}>
      <h4 className="mb-3 text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">
        PROMPTS_AVAILABLE ({prompts.length})
      </h4>
      <div className="space-y-2">
        {prompts.map((prompt) => (
          <div
            key={prompt.name}
            className="border border-purple-400/30 bg-purple-950/10 backdrop-blur-sm p-2 text-sm shadow-[0_0_10px_rgba(147,51,234,0.1)]"
          >
            <div className="font-medium text-purple-300 font-mono uppercase tracking-wider">{prompt.name}</div>
            {prompt.description && (
              <div className="mt-1 text-purple-400/80 font-mono">{prompt.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default McpPrompts;

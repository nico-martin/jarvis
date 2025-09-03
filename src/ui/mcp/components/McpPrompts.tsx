import { Prompt } from "@modelcontextprotocol/sdk/types.js";
import { Checkbox } from "@theme";
import cn from "@utils/classnames";

function McpPrompts({
  className = "",
  prompts = [],
  activePrompts,
  serverId,
  handleTogglePrompt,
}: {
  className?: string;
  prompts: Array<Prompt>;
  activePrompts: Array<string>;
  serverId: string;
  handleTogglePrompt: (name: string, checked: boolean) => void;
}) {
  return (
    <div className={cn("border-t border-blue-400/20 px-6 py-4", className)}>
      <h4 className="mb-3 font-mono text-sm font-medium tracking-wider text-blue-300 uppercase">
        PROMPTS_AVAILABLE ({activePrompts.length}/{prompts.length} ACTIVE)
      </h4>
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <div
            key={prompt.name}
            className="border border-purple-400/30 bg-purple-950/10 p-4 text-sm shadow-[0_0_10px_rgba(147,51,234,0.1)] backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`prompt-${prompt.name}-${serverId}`}
                    name={`prompt-${prompt.name}`}
                    value={prompt.name}
                    label=""
                    checked={activePrompts.includes(prompt.name)}
                    onChange={(checked) =>
                      handleTogglePrompt(prompt.name, checked)
                    }
                  />
                  <h5 className="font-mono font-medium tracking-wider text-purple-300 uppercase">
                    {prompt.name}
                  </h5>
                  <span className="font-mono text-xs text-purple-400/80">
                    {activePrompts.includes(prompt.name)
                      ? "(ACTIVE)"
                      : "(INACTIVE)"}
                  </span>
                </div>
                {prompt.description && (
                  <p className="mt-1 font-mono text-purple-400/80">
                    {prompt.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default McpPrompts;

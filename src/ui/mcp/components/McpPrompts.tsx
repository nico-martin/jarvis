import { Prompt } from "@modelcontextprotocol/sdk/types.js";
import cn from "@utils/classnames";
import React from "react";

function McpPrompts({
  className = "",
  prompts = [],
}: {
  className?: string;
  prompts: Array<Prompt>;
}) {
  return (
    <div className={cn("border-t border-gray-200 px-6 py-4", className)}>
      <h4 className="mb-3 text-sm font-medium text-gray-700">
        Prompts ({prompts.length})
      </h4>
      <div className="space-y-2">
        {prompts.map((prompt) => (
          <div
            key={prompt.name}
            className="rounded border bg-purple-50 p-2 text-sm"
          >
            <div className="font-medium text-purple-900">{prompt.name}</div>
            {prompt.description && (
              <div className="mt-1 text-purple-700">{prompt.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default McpPrompts;

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import cn from "@utils/classnames";

function McpResources({
  className = "",
  resources = [],
}: {
  className?: string;
  resources: Array<Resource>;
}) {
  return (
    <div className={cn("border-t border-blue-400/20 px-6 py-4", className)}>
      <h4 className="mb-3 text-sm font-medium text-blue-300 font-mono uppercase tracking-wider">
        RESOURCES_AVAILABLE ({resources.length})
      </h4>
      <div className="space-y-2">
        {resources.map((resource) => (
          <div
            key={resource.uri}
            className="border border-blue-400/30 bg-blue-950/10 backdrop-blur-sm p-2 text-sm shadow-[0_0_10px_rgba(0,162,255,0.1)]"
          >
            <div className="font-medium text-blue-300 font-mono uppercase tracking-wider">
              {resource.name || resource.uri}
            </div>
            {resource.description && (
              <div className="mt-1 text-blue-400/80 font-mono">{resource.description}</div>
            )}
            <div className="mt-1 font-mono text-xs text-blue-400/60">
              {resource.uri}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default McpResources;

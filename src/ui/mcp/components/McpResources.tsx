import { Resource } from "@modelcontextprotocol/sdk/types.js";
import cn from "@utils/classnames";
import React from "react";

function McpResources({
  className = "",
  resources = [],
}: {
  className?: string;
  resources: Array<Resource>;
}) {
  return (
    <div className={cn("border-t border-gray-200 px-6 py-4", className)}>
      <h4 className="mb-3 text-sm font-medium text-gray-700">
        Resources ({resources.length})
      </h4>
      <div className="space-y-2">
        {resources.map((resource) => (
          <div
            key={resource.uri}
            className="rounded border bg-blue-50 p-2 text-sm"
          >
            <div className="font-medium text-blue-900">
              {resource.name || resource.uri}
            </div>
            {resource.description && (
              <div className="mt-1 text-blue-700">{resource.description}</div>
            )}
            <div className="mt-1 font-mono text-xs text-blue-600">
              {resource.uri}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default McpResources;

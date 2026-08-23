
"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { BotMessageSquare, Sparkles } from "lucide-react";

function AiAgentNode({ data, selected }: { data: any; selected: boolean }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl bg-card border-2 min-w-[220px] transition-all ${selected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-emerald-500/30"}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-emerald-500"
      />
      
      <div className="flex items-center">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-2 text-white mr-3 shadow-md shadow-emerald-500/20">
          <BotMessageSquare className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground flex items-center gap-1">
            AI Agent Node
            <Sparkles className="h-3 w-3 text-emerald-500" />
          </div>
          <div className="text-[11px] text-muted-foreground max-w-[150px] truncate">
            {data.promptOverride || "Runs ReAct Reasoning & Tools"}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-emerald-500"
      />
    </div>
  );
}

export default memo(AiAgentNode);

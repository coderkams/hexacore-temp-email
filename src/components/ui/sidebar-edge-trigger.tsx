"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SidebarEdgeTriggerProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function SidebarEdgeTrigger({
  isCollapsed,
  onToggle,
  className,
}: SidebarEdgeTriggerProps) {
  return (
    <Button
      variant="edge"
      size="edge"
      onClick={onToggle}
      className={cn(
        "hidden md:flex absolute -right-3.5 top-7 z-50 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer",
        className
      )}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <ChevronLeft
        className={cn(
          "w-4 h-4 text-white stroke-[2.5] transition-transform duration-300",
          isCollapsed && "rotate-180"
        )}
      />
    </Button>
  );
}

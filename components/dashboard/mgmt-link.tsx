"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MgmtLinkProps {
  href: string;
  label?: string;
  tooltip?: string;
  className?: string;
  iconOnly?: boolean;
}

export function MgmtLink({ href, label, tooltip, className, iconOnly = false }: MgmtLinkProps) {
  const content = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors",
        className
      )}
    >
      {!iconOnly && label && <span>{label}</span>}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

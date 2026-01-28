/**
 * Validation message component
 * Displays validation feedback with appropriate styling
 */

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ValidationMessageProps {
  /** Message to display */
  message: string | null;
  /** Message type for styling */
  type: "error" | "success" | "info";
}

export function ValidationMessage({ message, type }: ValidationMessageProps) {
  if (!message) return null;

  const Icon = type === "error" ? AlertCircle : type === "success" ? CheckCircle2 : Info;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        type === "error" && "text-red-600",
        type === "success" && "text-green-600",
        type === "info" && "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

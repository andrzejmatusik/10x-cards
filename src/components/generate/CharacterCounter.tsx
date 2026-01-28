/**
 * Character counter component
 * Displays current/max character count with color coding
 */

import { cn } from "@/lib/utils";

export interface CharacterCounterProps {
  /** Current character count */
  current: number;
  /** Maximum allowed characters */
  max: number;
  /** Whether the count is valid */
  isValid: boolean;
}

export function CharacterCounter({ current, max, isValid }: CharacterCounterProps) {
  const isTooLong = current > max;
  const isTooShort = current > 0 && current < 1000; // Hardcoded min for color

  return (
    <span
      className={cn(
        "text-sm font-medium",
        isTooLong && "text-red-600",
        isTooShort && "text-orange-500",
        isValid && "text-green-600",
        !isTooLong && !isTooShort && !isValid && "text-muted-foreground"
      )}
    >
      {current} / {max}
    </span>
  );
}

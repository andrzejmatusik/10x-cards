/**
 * Empty state component
 * Displayed when no flashcard proposals were generated
 */

import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  /** Callback when retry button is clicked */
  onRetry: () => void;
}

export function EmptyState({ onRetry }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Brak propozycji fiszek</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Model nie wygenerował żadnych fiszek. Spróbuj z dłuższym lub bardziej treściwym tekstem.
      </p>
      <Button onClick={onRetry} variant="outline">
        Spróbuj ponownie
      </Button>
    </div>
  );
}

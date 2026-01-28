/**
 * Action buttons component
 * Provides buttons to save accepted or all flashcards
 */

import { Save, SaveAll } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ActionButtonsProps {
  /** Number of accepted flashcards */
  acceptedCount: number;
  /** Total number of flashcards */
  totalCount: number;
  /** Callback when save accepted button is clicked */
  onSaveAccepted: () => void;
  /** Callback when save all button is clicked */
  onSaveAll: () => void;
  /** Whether save operation is in progress */
  isSaving: boolean;
}

export function ActionButtons({ acceptedCount, totalCount, onSaveAccepted, onSaveAll, isSaving }: ActionButtonsProps) {
  const canSaveAccepted = acceptedCount > 0 && !isSaving;
  const canSaveAll = totalCount > 0 && !isSaving;

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
      <Button onClick={onSaveAccepted} disabled={!canSaveAccepted} className="flex-1" size="lg">
        {isSaving ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Zapisywanie...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
            Zapisz zaakceptowane ({acceptedCount})
          </>
        )}
      </Button>

      <Button onClick={onSaveAll} disabled={!canSaveAll} variant="secondary" className="flex-1" size="lg">
        <SaveAll className="mr-2 h-5 w-5" />
        Zapisz wszystkie ({totalCount})
      </Button>
    </div>
  );
}

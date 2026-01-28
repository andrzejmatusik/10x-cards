/**
 * Flashcard edit modal component
 * Allows editing flashcard content before acceptance
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFlashcardValidation } from "@/hooks/useFlashcardValidation";
import type { ProposedFlashcard } from "@/types";

export interface FlashcardEditModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Flashcard data to edit */
  flashcard: ProposedFlashcard;
  /** Callback when save button is clicked */
  onSave: (data: { front: string; back: string }) => void;
  /** Callback when modal is closed/cancelled */
  onCancel: () => void;
}

export function FlashcardEditModal({ isOpen, flashcard, onSave, onCancel }: FlashcardEditModalProps) {
  const [front, setFront] = useState(flashcard.front);
  const [back, setBack] = useState(flashcard.back);

  const validation = useFlashcardValidation(front, back);

  // Reset form when flashcard changes
  useEffect(() => {
    setFront(flashcard.front);
    setBack(flashcard.back);
  }, [flashcard.front, flashcard.back]);

  const hasChanges = front !== flashcard.front || back !== flashcard.back;
  const canSave = validation.isValid && hasChanges;

  const handleSave = () => {
    if (canSave) {
      onSave({ front, back });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edytuj fiszkę</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="front">Przód fiszki</Label>
            <Textarea
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Pytanie lub pojęcie..."
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between text-sm">
              {validation.errors.front && <span className="text-red-600">{validation.errors.front}</span>}
              <span className={`ml-auto ${front.length > 200 ? "text-red-600" : "text-muted-foreground"}`}>
                {front.length} / 200
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="back">Tył fiszki</Label>
            <Textarea
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Odpowiedź lub definicja..."
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between text-sm">
              {validation.errors.back && <span className="text-red-600">{validation.errors.back}</span>}
              <span className={`ml-auto ${back.length > 500 ? "text-red-600" : "text-muted-foreground"}`}>
                {back.length} / 500
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

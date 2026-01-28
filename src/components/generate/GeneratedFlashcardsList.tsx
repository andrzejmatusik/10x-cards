/**
 * Generated flashcards list component
 * Displays list of flashcard proposals with summary
 */

import { FlashcardProposalItem } from "./FlashcardProposalItem";
import { EmptyState } from "./EmptyState";
import type { FlashcardProposalState } from "@/types";

export interface GeneratedFlashcardsListProps {
  /** Array of flashcard proposals with states */
  proposals: FlashcardProposalState[];
  /** Callback when accept button is clicked */
  onAccept: (index: number) => void;
  /** Callback when edit button is clicked */
  onEdit: (index: number) => void;
  /** Callback when reject button is clicked */
  onReject: (index: number) => void;
  /** Callback when empty state retry is clicked */
  onRetry: () => void;
}

export function GeneratedFlashcardsList({
  proposals,
  onAccept,
  onEdit,
  onReject,
  onRetry,
}: GeneratedFlashcardsListProps) {
  // Show empty state if no proposals
  if (proposals.length === 0) {
    return <EmptyState onRetry={onRetry} />;
  }

  // Calculate summary counts
  const acceptedCount = proposals.filter((p) => p.action === "accepted" || p.action === "edited").length;
  const editedCount = proposals.filter((p) => p.action === "edited").length;
  const rejectedCount = proposals.filter((p) => p.action === "rejected").length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold mb-2">Wygenerowane fiszki ({proposals.length})</h3>
        <p className="text-sm text-muted-foreground">
          Zaakceptowane: <span className="font-semibold">{acceptedCount}</span> | Edytowane:{" "}
          <span className="font-semibold">{editedCount}</span> | Odrzucone:{" "}
          <span className="font-semibold">{rejectedCount}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {proposals.map((proposal, index) => (
          <FlashcardProposalItem
            key={`${proposal.index}-${index}`}
            proposal={proposal}
            onAccept={() => onAccept(index)}
            onEdit={() => onEdit(index)}
            onReject={() => onReject(index)}
          />
        ))}
      </div>
    </div>
  );
}

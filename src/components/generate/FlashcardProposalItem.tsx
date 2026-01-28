/**
 * Flashcard proposal item component
 * Displays a single flashcard proposal with action buttons
 */

import { Check, Edit2, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FlashcardProposalState } from "@/types";

export interface FlashcardProposalItemProps {
  /** Proposal with state */
  proposal: FlashcardProposalState;
  /** Callback when accept button is clicked */
  onAccept: () => void;
  /** Callback when edit button is clicked */
  onEdit: () => void;
  /** Callback when reject button is clicked */
  onReject: () => void;
}

export function FlashcardProposalItem({ proposal, onAccept, onEdit, onReject }: FlashcardProposalItemProps) {
  const { current, action } = proposal;

  // Determine card styling based on action
  const isAccepted = action === "accepted";
  const isEdited = action === "edited";
  const isRejected = action === "rejected";

  const getBadgeVariant = () => {
    if (isAccepted) return "success";
    if (isEdited) return "info";
    if (isRejected) return "secondary";
    return "outline";
  };

  const getBadgeText = () => {
    if (isAccepted) return "Zaakceptowana";
    if (isEdited) return "Edytowana";
    if (isRejected) return "Odrzucona";
    return "Oczekująca";
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isAccepted && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
        isEdited && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
        isRejected && "opacity-50 border-gray-300"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={getBadgeVariant()}>{getBadgeText()}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">Przód:</h4>
          <p className={cn("text-sm", isRejected && "line-through")}>{current.front}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">Tył:</h4>
          <p className={cn("text-sm", isRejected && "line-through")}>{current.back}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant={isAccepted || isEdited ? "default" : "outline"}
            onClick={onAccept}
            disabled={isRejected}
          >
            <Check className="h-4 w-4 mr-1" />
            {isAccepted || isEdited ? "Zaakceptowano" : "Akceptuj"}
          </Button>

          <Button size="sm" variant="outline" onClick={onEdit} disabled={isRejected}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edytuj
          </Button>

          <Button size="sm" variant={isRejected ? "outline" : "destructive"} onClick={onReject}>
            <X className="h-4 w-4 mr-1" />
            {isRejected ? "Przywróć" : "Odrzuć"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

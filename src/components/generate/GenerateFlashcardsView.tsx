/**
 * Main Generate Flashcards View component
 * Orchestrates all child components and manages view state
 */

import { useCallback } from "react";
import { useGenerateFlashcards } from "@/hooks/useGenerateFlashcards";
import { useToast } from "@/hooks/use-toast";
import { TextInputSection } from "./TextInputSection";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { GeneratedFlashcardsList } from "./GeneratedFlashcardsList";
import { FlashcardEditModal } from "./FlashcardEditModal";
import { ActionButtons } from "./ActionButtons";
import { Toaster } from "@/components/ui/toaster";
import { ThemeToggle } from "@/components/ThemeToggle";

export function GenerateFlashcardsView() {
  const {
    state,
    acceptedCount,
    handleTextChange,
    handleGenerate,
    handleAccept,
    handleEdit,
    handleReject,
    handleSaveEdit,
    handleCancelEdit,
    handleSaveAccepted,
    handleSaveAll,
  } = useGenerateFlashcards();

  const { toast } = useToast();

  /**
   * Handle generate with toast notifications
   */
  const onGenerate = useCallback(async () => {
    try {
      await handleGenerate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd generowania",
        description: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd",
      });
    }
  }, [handleGenerate, toast]);

  /**
   * Handle save accepted with toast notifications
   */
  const onSaveAccepted = useCallback(async () => {
    try {
      const response = await handleSaveAccepted();
      if (response) {
        toast({
          variant: "success",
          title: "Sukces!",
          description: `Zapisano ${response.created_count} fiszek.`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd zapisu",
        description: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd",
      });
    }
  }, [handleSaveAccepted, toast]);

  /**
   * Handle save all with toast notifications
   */
  const onSaveAll = useCallback(async () => {
    try {
      const response = await handleSaveAll();
      if (response) {
        toast({
          variant: "success",
          title: "Sukces!",
          description: `Zapisano ${response.created_count} fiszek.`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd zapisu",
        description: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd",
      });
    }
  }, [handleSaveAll, toast]);

  /**
   * Handle retry - focus on textarea
   */
  const onRetry = useCallback(() => {
    const textarea = document.querySelector("textarea");
    textarea?.focus();
  }, []);

  // Get editing flashcard
  const editingFlashcard = state.editingIndex !== null ? state.proposals[state.editingIndex]?.current : null;

  return (
    <>
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Text Input Section */}
        <TextInputSection
          value={state.sourceText}
          onChange={handleTextChange}
          onGenerate={onGenerate}
          isLoading={state.isGenerating}
          error={state.generationError}
        />

        {/* Loading Skeleton */}
        {state.isGenerating && <LoadingSkeleton count={5} />}

        {/* Generated Flashcards List */}
        {!state.isGenerating && state.proposals.length > 0 && (
          <>
            <GeneratedFlashcardsList
              proposals={state.proposals}
              onAccept={handleAccept}
              onEdit={handleEdit}
              onReject={handleReject}
              onRetry={onRetry}
            />

            {/* Action Buttons */}
            <ActionButtons
              acceptedCount={acceptedCount}
              totalCount={state.proposals.length}
              onSaveAccepted={onSaveAccepted}
              onSaveAll={onSaveAll}
              isSaving={state.isSaving}
            />
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingFlashcard && (
        <FlashcardEditModal
          isOpen={state.editingIndex !== null}
          flashcard={editingFlashcard}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Toast Notifications */}
      <Toaster />
    </>
  );
}

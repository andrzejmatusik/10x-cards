/**
 * Main hook for Generate Flashcards view
 * Manages all state and business logic for the view
 */

import { useState, useCallback, useMemo } from "react";
import type {
  GenerateViewState,
  FlashcardProposalState,
  FlashcardActionType,
  CreateGenerationCommand,
  BatchFlashcardItem,
  CreateBatchFlashcardsCommand,
  CreateBatchFlashcardsResponse,
} from "@/types";
import { generateFlashcards } from "@/services/api/generations";
import { saveBatchFlashcards } from "@/services/api/flashcards";

/**
 * Return type of useGenerateFlashcards hook
 */
export interface UseGenerateFlashcardsReturn {
  // State
  state: GenerateViewState;

  // Computed values
  acceptedCount: number;
  editedCount: number;
  rejectedCount: number;

  // Text management
  handleTextChange: (text: string) => void;

  // Generation methods
  handleGenerate: () => Promise<void>;
  resetGeneration: () => void;

  // Flashcard action methods
  handleAccept: (index: number) => void;
  handleEdit: (index: number) => void;
  handleReject: (index: number) => void;
  handleSaveEdit: (data: { front: string; back: string }) => void;
  handleCancelEdit: () => void;

  // Save methods
  handleSaveAccepted: () => Promise<CreateBatchFlashcardsResponse | undefined>;
  handleSaveAll: () => Promise<CreateBatchFlashcardsResponse | undefined>;
}

/**
 * Initial state for the view
 */
const initialState: GenerateViewState = {
  sourceText: "",
  textLength: 0,
  isGenerating: false,
  generationId: null,
  generationError: null,
  proposals: [],
  isSaving: false,
  saveError: null,
  editingIndex: null,
};

/**
 * Custom hook for Generate Flashcards view
 * Encapsulates all business logic and state management
 */
export function useGenerateFlashcards(): UseGenerateFlashcardsReturn {
  const [state, setState] = useState<GenerateViewState>(initialState);

  // Computed values
  const acceptedCount = useMemo(() => {
    return state.proposals.filter((p) => p.action === "accepted" || p.action === "edited").length;
  }, [state.proposals]);

  const editedCount = useMemo(() => {
    return state.proposals.filter((p) => p.action === "edited").length;
  }, [state.proposals]);

  const rejectedCount = useMemo(() => {
    return state.proposals.filter((p) => p.action === "rejected").length;
  }, [state.proposals]);

  /**
   * Handle text change in textarea
   */
  const handleTextChange = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      sourceText: text,
      textLength: text.length,
      generationError: null, // Clear errors when text changes
    }));
  }, []);

  /**
   * Generate flashcards from text
   */
  const handleGenerate = useCallback(async () => {
    if (state.isGenerating) return;

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      generationError: null,
      proposals: [],
      generationId: null,
    }));

    try {
      const command: CreateGenerationCommand = {
        source_text: state.sourceText,
        model: "openai/gpt-4", // Default model
      };

      const response = await generateFlashcards(command);

      // Transform proposed flashcards to proposal states
      const proposals: FlashcardProposalState[] = response.proposed_flashcards.map((flashcard, index) => ({
        original: flashcard,
        current: { ...flashcard },
        action: "pending" as FlashcardActionType,
        index,
      }));

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        generationId: response.id,
        proposals,
        generationError: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas generowania fiszek.";
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        generationError: errorMessage,
      }));
      throw error; // Re-throw for toast handling
    }
  }, [state.sourceText, state.isGenerating]);

  /**
   * Reset generation state
   */
  const resetGeneration = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Accept flashcard proposal
   */
  const handleAccept = useCallback((index: number) => {
    setState((prev) => {
      const proposals = [...prev.proposals];
      const proposal = proposals[index];

      if (!proposal) return prev;

      // Toggle between accepted and pending
      if (proposal.action === "accepted") {
        proposal.action = "pending";
      } else {
        // Check if it was edited before changing action
        const wasEdited = proposal.action === "edited";
        proposal.action = "accepted";

        // Only reset to original if not edited - preserve edited content
        if (!wasEdited) {
          proposal.current = { ...proposal.original };
        }
      }

      return { ...prev, proposals };
    });
  }, []);

  /**
   * Open edit modal for flashcard
   */
  const handleEdit = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      editingIndex: index,
    }));
  }, []);

  /**
   * Save edited flashcard
   */
  const handleSaveEdit = useCallback((data: { front: string; back: string }) => {
    setState((prev) => {
      if (prev.editingIndex === null) return prev;

      const proposals = [...prev.proposals];
      const proposal = proposals[prev.editingIndex];

      if (!proposal) return prev;

      // Update current with edited data
      proposal.current = {
        front: data.front,
        back: data.back,
      };

      // Mark as edited
      proposal.action = "edited";

      return {
        ...prev,
        proposals,
        editingIndex: null, // Close modal
      };
    });
  }, []);

  /**
   * Cancel edit modal
   */
  const handleCancelEdit = useCallback(() => {
    setState((prev) => ({
      ...prev,
      editingIndex: null,
    }));
  }, []);

  /**
   * Reject flashcard proposal
   */
  const handleReject = useCallback((index: number) => {
    setState((prev) => {
      const proposals = [...prev.proposals];
      const proposal = proposals[index];

      if (!proposal) return prev;

      // Toggle between rejected and pending
      proposal.action = proposal.action === "rejected" ? "pending" : "rejected";

      return { ...prev, proposals };
    });
  }, []);

  /**
   * Save accepted flashcards
   */
  const handleSaveAccepted = useCallback(async () => {
    if (state.isSaving || !state.generationId) return;

    // Filter only accepted and edited proposals
    const toSave = state.proposals.filter((p) => p.action === "accepted" || p.action === "edited");

    if (toSave.length === 0) return;

    setState((prev) => ({
      ...prev,
      isSaving: true,
      saveError: null,
    }));

    try {
      // Prepare batch command
      const flashcards: BatchFlashcardItem[] = toSave.map((proposal) => ({
        front: proposal.current.front,
        back: proposal.current.back,
        source: proposal.action === "edited" ? "ai-edited" : "ai-full",
      }));

      const command: CreateBatchFlashcardsCommand = {
        generation_id: state.generationId,
        flashcards,
      };

      const response = await saveBatchFlashcards(command);

      // Success - reset state
      setState(initialState);

      return response; // Return for toast handling
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas zapisywania fiszek.";
      setState((prev) => ({
        ...prev,
        isSaving: false,
        saveError: errorMessage,
      }));
      throw error; // Re-throw for toast handling
    }
  }, [state.isSaving, state.generationId, state.proposals]);

  /**
   * Save all flashcards
   */
  const handleSaveAll = useCallback(async () => {
    if (state.isSaving || !state.generationId || state.proposals.length === 0) return;

    setState((prev) => ({
      ...prev,
      isSaving: true,
      saveError: null,
    }));

    try {
      // Prepare batch command with all proposals
      const flashcards: BatchFlashcardItem[] = state.proposals.map((proposal) => ({
        front: proposal.current.front,
        back: proposal.current.back,
        source: proposal.action === "edited" ? "ai-edited" : "ai-full",
      }));

      const command: CreateBatchFlashcardsCommand = {
        generation_id: state.generationId,
        flashcards,
      };

      const response = await saveBatchFlashcards(command);

      // Success - reset state
      setState(initialState);

      return response; // Return for toast handling
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas zapisywania fiszek.";
      setState((prev) => ({
        ...prev,
        isSaving: false,
        saveError: errorMessage,
      }));
      throw error; // Re-throw for toast handling
    }
  }, [state.isSaving, state.generationId, state.proposals]);

  return {
    state,
    acceptedCount,
    editedCount,
    rejectedCount,
    handleTextChange,
    handleGenerate,
    resetGeneration,
    handleAccept,
    handleEdit,
    handleReject,
    handleSaveEdit,
    handleCancelEdit,
    handleSaveAccepted,
    handleSaveAll,
  };
}

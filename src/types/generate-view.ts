/**
 * ViewModel types for Generate Flashcards View
 * These types are specific to the UI layer and manage component state
 */

import type { ProposedFlashcard } from "@/types";

/**
 * Type of action performed on a flashcard proposal
 */
export type FlashcardActionType = "pending" | "accepted" | "edited" | "rejected";

/**
 * State of a single flashcard proposal in the UI
 */
export interface FlashcardProposalState {
  /** Original proposal from API (unmodified) */
  original: ProposedFlashcard;
  /** Current version (may be edited) */
  current: ProposedFlashcard;
  /** User's decision on this proposal */
  action: FlashcardActionType;
  /** Index in original array (for identification) */
  index: number;
}

/**
 * Main state of the Generate Flashcards view
 */
export interface GenerateViewState {
  // Text input section
  /** Text pasted by user */
  sourceText: string;
  /** Text length (cached for optimization) */
  textLength: number;

  // Generation process
  /** Whether API generation call is in progress */
  isGenerating: boolean;
  /** ID of created generation */
  generationId: number | null;
  /** Error during generation */
  generationError: string | null;

  // Flashcard proposals
  /** List of proposals with their states */
  proposals: FlashcardProposalState[];

  // Save process
  /** Whether save to API is in progress */
  isSaving: boolean;
  /** Error during save */
  saveError: string | null;

  // Edit modal
  /** Index of flashcard being edited (null = modal closed) */
  editingIndex: number | null;
}

/**
 * Result of text input validation
 */
export interface TextInputValidation {
  /** Whether text meets requirements (1000-10000) */
  isValid: boolean;
  /** Whether text is too short (< 1000) */
  isTooShort: boolean;
  /** Whether text is too long (> 10000) */
  isTooLong: boolean;
  /** Message to display to user */
  message: string | null;
  /** Message type (for styling) */
  messageType: "error" | "success" | "info";
}

/**
 * Validation errors for flashcard fields
 */
export interface FlashcardValidationErrors {
  /** Error for front field (if any) */
  front?: string;
  /** Error for back field (if any) */
  back?: string;
}

/**
 * Result of flashcard validation
 */
export interface FlashcardValidationResult {
  /** Whether all fields are valid */
  isValid: boolean;
  /** Object with errors (empty when isValid=true) */
  errors: FlashcardValidationErrors;
}

/**
 * DTO (Data Transfer Object) and Command Model types for 10xCards API
 * These types are derived from database models and aligned with API requirements
 */

import type { Tables } from "./db/database.types";

// =============================================================================
// Database Entity Types (base types from database schema)
// =============================================================================

/**
 * Flashcard entity from database
 */
export type FlashcardEntity = Tables<"flashcards">;

/**
 * Generation entity from database
 */
export type GenerationEntity = Tables<"generations">;

/**
 * Generation error log entity from database
 */
export type GenerationErrorLogEntity = Tables<"generation_error_logs">;

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Source of flashcard creation
 */
export type FlashcardSource = "ai-full" | "ai-edited" | "manual";

/**
 * Review quality rating for spaced repetition (SM-2 algorithm)
 * 0: Complete blackout
 * 1: Incorrect response, correct one remembered
 * 2: Incorrect response, correct one seemed easy to recall
 * 3: Correct response, but difficult to recall
 * 4: Correct response, after some hesitation
 * 5: Perfect response
 */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Error codes for API responses
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "LLM_GENERATION_FAILED"
  | "INTERNAL_ERROR";

// =============================================================================
// Common/Shared DTOs
// =============================================================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  next_cursor?: number;
  has_more: boolean;
}

/**
 * Standard error response structure
 */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// Authentication DTOs (Supabase Auth)
// =============================================================================

/**
 * Sign up request payload
 */
export interface SignUpCommand {
  email: string;
  password: string;
}

/**
 * Login request payload
 */
export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * Refresh token request payload
 */
export interface RefreshTokenCommand {
  refresh_token: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token: string;
}

/**
 * Sign up response (includes user data)
 */
export interface SignUpResponse extends AuthResponse {
  user: UserDTO;
}

/**
 * User data transfer object
 */
export interface UserDTO {
  id: string;
  email: string;
  created_at: string;
  confirmed_at: string | null;
}

// =============================================================================
// Flashcard DTOs
// =============================================================================

/**
 * Flashcard data transfer object
 * Directly maps to flashcards table Row type
 * Includes: id, front, back, source, created_at, updated_at, generation_id, user_id
 */
export type FlashcardDTO = FlashcardEntity;

/**
 * Create single flashcard command (manual creation)
 */
export interface CreateFlashcardCommand {
  front: string; // max 200 characters
  back: string; // max 500 characters
}

/**
 * Single flashcard item for batch creation
 */
export interface BatchFlashcardItem {
  front: string; // max 200 characters
  back: string; // max 500 characters
  source: "ai-full" | "ai-edited";
}

/**
 * Create batch flashcards command (from AI generation)
 */
export interface CreateBatchFlashcardsCommand {
  generation_id: number;
  flashcards: BatchFlashcardItem[];
}

/**
 * Response for batch flashcard creation
 */
export interface CreateBatchFlashcardsResponse {
  created_count: number;
  flashcards: FlashcardDTO[];
}

/**
 * Update flashcard command
 */
export interface UpdateFlashcardCommand {
  front: string; // max 200 characters
  back: string; // max 500 characters
}

/**
 * Query parameters for listing flashcards
 */
export interface ListFlashcardsQuery {
  limit?: number; // default: 50, max: 100
  cursor?: number; // flashcard ID for pagination
  source?: FlashcardSource; // filter by source
  generation_id?: number; // filter by generation
}

/**
 * Response for listing flashcards
 */
export interface ListFlashcardsResponse {
  data: FlashcardDTO[];
  pagination: PaginationMeta;
}

// =============================================================================
// Generation DTOs
// =============================================================================

/**
 * Generation data transfer object
 * Directly maps to generations table Row type
 * Includes: id, user_id, model, generated_count, accepted_unedited_count,
 * accepted_edited_count, source_text_hash, source_text_length,
 * generation_duration, created_at, updated_at
 */
export type GenerationDTO = GenerationEntity;

/**
 * Proposed flashcard from AI (not yet saved to database)
 */
export interface ProposedFlashcard {
  front: string;
  back: string;
}

/**
 * Create generation command (generate flashcards from text)
 */
export interface CreateGenerationCommand {
  source_text: string; // min 1000, max 10000 characters
  model: string; // e.g., "openai/gpt-4"
}

/**
 * Response for generation creation (includes proposed flashcards)
 */
export interface CreateGenerationResponse extends GenerationDTO {
  proposed_flashcards: ProposedFlashcard[];
}

/**
 * Query parameters for listing generations
 */
export interface ListGenerationsQuery {
  limit?: number; // default: 20, max: 50
  cursor?: number; // generation ID for pagination
}

/**
 * Response for listing generations
 */
export interface ListGenerationsResponse {
  data: GenerationDTO[];
  pagination: PaginationMeta;
}

/**
 * Generation detail with associated flashcards
 */
export interface GenerationDetailDTO extends GenerationDTO {
  flashcards: FlashcardDTO[];
}

// =============================================================================
// Study Session DTOs (Spaced Repetition)
// =============================================================================

/**
 * Spaced repetition metadata for a flashcard (SM-2 algorithm)
 */
export interface RepetitionData {
  ease_factor: number; // difficulty factor (typically 1.3 - 2.5+)
  interval: number; // days until next review
  repetitions: number; // number of successful reviews
  next_review: string; // ISO 8601 timestamp
}

/**
 * Flashcard with spaced repetition data for study sessions
 */
export interface StudyFlashcardDTO extends FlashcardDTO {
  repetition_data: RepetitionData;
}

/**
 * Query parameters for getting study session
 */
export interface GetStudySessionQuery {
  limit?: number; // default: 20, max: 50
}

/**
 * Study session response
 */
export interface StudySessionDTO {
  session_id: string; // temporary session identifier
  total_due: number; // total flashcards due for review
  flashcards: StudyFlashcardDTO[];
}

/**
 * Record flashcard review command
 */
export interface RecordReviewCommand {
  quality: ReviewQuality; // 0-5 rating
}

/**
 * Response after recording flashcard review
 */
export interface RecordReviewResponse {
  id: number; // flashcard ID
  repetition_data: RepetitionData; // updated scheduling data
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if source is valid FlashcardSource
 */
export function isFlashcardSource(value: unknown): value is FlashcardSource {
  return value === "ai-full" || value === "ai-edited" || value === "manual";
}

/**
 * Type guard to check if quality is valid ReviewQuality
 */
export function isReviewQuality(value: unknown): value is ReviewQuality {
  return typeof value === "number" && value >= 0 && value <= 5 && Number.isInteger(value);
}

// =============================================================================
// Validation Constraints (for reference)
// =============================================================================

/**
 * Validation constraints for flashcard fields
 */
export const FlashcardConstraints = {
  FRONT_MAX_LENGTH: 200,
  BACK_MAX_LENGTH: 500,
} as const;

/**
 * Validation constraints for generation source text
 */
export const GenerationConstraints = {
  SOURCE_TEXT_MIN_LENGTH: 1000,
  SOURCE_TEXT_MAX_LENGTH: 10000,
} as const;

/**
 * Rate limiting constraints
 */
export const RateLimitConstraints = {
  GENERATIONS_PER_HOUR: 10,
  REQUESTS_PER_MINUTE: 100,
} as const;

/**
 * Pagination constraints
 */
export const PaginationConstraints = {
  FLASHCARDS_DEFAULT_LIMIT: 50,
  FLASHCARDS_MAX_LIMIT: 100,
  GENERATIONS_DEFAULT_LIMIT: 20,
  GENERATIONS_MAX_LIMIT: 50,
  STUDY_SESSION_DEFAULT_LIMIT: 20,
  STUDY_SESSION_MAX_LIMIT: 50,
} as const;

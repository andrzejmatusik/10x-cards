/**
 * Flashcards API client
 * Handles flashcard CRUD operations
 */

import type { CreateBatchFlashcardsCommand, CreateBatchFlashcardsResponse } from "@/types";
import { apiClient } from "./client";

/**
 * Save batch of flashcards from generation
 * @param command - Batch command with generation_id and flashcards array
 * @returns Response with created flashcards
 * @throws Error with message for UI display
 */
export async function saveBatchFlashcards(
  command: CreateBatchFlashcardsCommand
): Promise<CreateBatchFlashcardsResponse> {
  try {
    const response = await apiClient.post<CreateBatchFlashcardsResponse>("/api/flashcards/batch", command, {
      timeout: 10000, // 10 seconds for save
    });
    return response.data;
  } catch (error) {
    // Parse error and throw user-friendly message
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { error?: { code: string; message?: string } } } };
      const apiError = axiosError.response?.data?.error;

      if (apiError) {
        switch (apiError.code) {
          case "VALIDATION_ERROR":
            throw new Error("Niektóre fiszki zawierają nieprawidłowe dane. Sprawdź długość treści.");
          case "NOT_FOUND":
            throw new Error("Generacja nie istnieje lub nie należy do Ciebie.");
          case "UNAUTHORIZED":
            throw new Error("Sesja wygasła. Zaloguj się ponownie.");
          default:
            throw new Error(apiError.message || "Wystąpił błąd podczas zapisywania fiszek.");
        }
      }
    }

    // Network or timeout error
    if (error && typeof error === "object" && "code" in error && error.code === "ECONNABORTED") {
      throw new Error("Nie udało się zapisać fiszek. Sprawdź połączenie z internetem.");
    }

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("timeout")
    ) {
      throw new Error("Nie udało się zapisać fiszek. Sprawdź połączenie z internetem.");
    }

    if (error && typeof error === "object" && "response" in error && !error.response) {
      throw new Error("Nie udało się zapisać fiszek. Spróbuj ponownie.");
    }

    throw new Error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
  }
}

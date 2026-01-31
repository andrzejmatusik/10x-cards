/**
 * Authentication Service
 * Wrapper dla Supabase Auth z obsługą błędów i translacją komunikatów
 *
 * MVP: Email verification DISABLED - auto-login po rejestracji
 */

import { supabaseClient } from "@/db/supabase.client";
import type { User, Session, AuthError as SupabaseAuthError } from "@supabase/supabase-js";

/**
 * Custom error class dla błędów autentykacji
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/**
 * Rezultat operacji autentykacji
 */
export interface AuthResult {
  user: User;
  session: Session | null;
}

/**
 * AuthService - główny serwis autentykacji aplikacji
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthService {
  /**
   * Rejestracja nowego użytkownika
   * MVP: Auto-login po rejestracji (email verification wyłączona)
   *
   * @param email - Adres email użytkownika
   * @param password - Hasło (min. 8 znaków)
   * @returns Promise z danymi użytkownika i sesją
   * @throws AuthError jeśli rejestracja nie powiedzie się
   */
  static async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          // MVP: emailRedirectTo nie jest potrzebne (email verification wyłączone)
          // Dla przyszłości (gdy email verification będzie włączone):
          // emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw new AuthError(this.translateError(error), error.status?.toString() || "unknown");
      }

      if (!data.user) {
        throw new AuthError("Rejestracja nie powiodła się", "no-user");
      }

      // MVP: Session automatycznie utworzona (auto-login)
      if (data.session) {
        this.saveSession(data.session);
        // Ustaw sesję także na serwerze przez API endpoint
        await this.setServerSession(data.session.access_token, data.session.refresh_token);
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Wystąpił nieoczekiwany błąd podczas rejestracji", "unknown");
    }
  }

  /**
   * Logowanie użytkownika
   *
   * @param email - Adres email
   * @param password - Hasło
   * @returns Promise z danymi użytkownika i sesją
   * @throws AuthError jeśli logowanie nie powiedzie się
   */
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new AuthError(this.translateError(error), error.status?.toString() || "unknown");
      }

      if (!data.session || !data.user) {
        throw new AuthError("Logowanie nie powiodło się", "no-session");
      }

      // Zapisz session do localStorage
      this.saveSession(data.session);

      // Ustaw sesję także na serwerze przez API endpoint
      await this.setServerSession(data.session.access_token, data.session.refresh_token);

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Wystąpił nieoczekiwany błąd podczas logowania", "unknown");
    }
  }

  /**
   * Wylogowanie użytkownika
   * Czyści session z Supabase (client + server) i localStorage
   */
  static async signOut(): Promise<void> {
    try {
      // Wyloguj na kliencie
      await supabaseClient.auth.signOut();

      // Wyloguj na serwerze przez API endpoint
      await fetch("/api/auth/signout", {
        method: "POST",
      }).catch((err) => {
        console.error("Error calling server signout:", err);
        // Nie blokujemy procesu wylogowania jeśli server endpoint fail
      });

      // Wyczyść localStorage
      this.clearSession();
    } catch (error) {
      // Zawsze czyść localStorage nawet jeśli Supabase zwróci błąd
      this.clearSession();
      console.error("Error during sign out:", error);
    }
  }

  /**
   * Wysyła email z linkiem do resetowania hasła
   *
   * @param email - Adres email użytkownika
   * @throws AuthError jeśli wysłanie nie powiedzie się
   */
  static async resetPasswordRequest(email: string): Promise<void> {
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        throw new AuthError(this.translateError(error), error.status?.toString() || "unknown");
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Wystąpił nieoczekiwany błąd podczas wysyłania emaila", "unknown");
    }
  }

  /**
   * Aktualizuje hasło użytkownika
   * Wymaga ważnej sesji (po kliknięciu w link z emaila)
   *
   * @param newPassword - Nowe hasło (min. 8 znaków)
   * @throws AuthError jeśli aktualizacja nie powiedzie się
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new AuthError(this.translateError(error), error.status?.toString() || "unknown");
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Wystąpił nieoczekiwany błąd podczas zmiany hasła", "unknown");
    }
  }

  /**
   * Pobiera aktualną sesję użytkownika
   *
   * @returns Session object lub null jeśli niezalogowany
   */
  static async getSession(): Promise<Session | null> {
    try {
      const { data } = await supabaseClient.auth.getSession();
      return data.session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  /**
   * Odświeża wygasającą sesję używając refresh token
   *
   * @returns Promise z nową sesją
   * @throws AuthError jeśli refresh nie powiedzie się
   */
  static async refreshSession(): Promise<Session> {
    try {
      const { data, error } = await supabaseClient.auth.refreshSession();

      if (error || !data.session) {
        throw new AuthError("Nie udało się odświeżyć sesji", "refresh-failed");
      }

      this.saveSession(data.session);
      return data.session;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Wystąpił nieoczekiwany błąd podczas odświeżania sesji", "unknown");
    }
  }

  /**
   * Zapisuje sesję do localStorage
   * @private
   */
  private static saveSession(session: Session): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem("access_token", session.access_token);
      localStorage.setItem("refresh_token", session.refresh_token);
      if (session.expires_at) {
        localStorage.setItem("expires_at", session.expires_at.toString());
      }
    } catch (error) {
      console.error("Error saving session to localStorage:", error);
    }
  }

  /**
   * Czyści sesję z localStorage
   * @private
   */
  private static clearSession(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("expires_at");
    } catch (error) {
      console.error("Error clearing session from localStorage:", error);
    }
  }

  /**
   * Ustawia sesję na serwerze przez API endpoint
   * @private
   */
  private static async setServerSession(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const response = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set server session");
      }
    } catch (error) {
      console.error("Error setting server session:", error);
      // Nie rzucamy błędu, aby nie blokować logowania
      // Sesja w localStorage jest wystarczająca dla większości operacji
    }
  }

  /**
   * Tłumaczy błędy Supabase na komunikaty po polsku
   * @private
   */
  private static translateError(error: SupabaseAuthError): string {
    const errorMap: Record<string, string> = {
      // Authentication errors
      "Invalid login credentials": "Nieprawidłowy email lub hasło",
      "Email not confirmed": "Potwierdź swój adres email przed logowaniem",
      "User already registered": "Konto z tym adresem email już istnieje",
      "User not found": "Użytkownik o podanym adresie email nie istnieje",

      // Password errors
      "Password should be at least 8 characters": "Hasło musi mieć co najmniej 8 znaków",
      "Password is too weak": "Hasło jest zbyt słabe. Użyj min. 8 znaków",

      // Rate limiting
      "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie za chwilę",
      "Too many requests": "Zbyt wiele prób. Spróbuj ponownie za 15 minut",

      // Email errors
      "Invalid email": "Nieprawidłowy format adresu email",
      "Unable to validate email address": "Nie można zweryfikować adresu email",

      // Session errors
      "Invalid token": "Sesja wygasła. Zaloguj się ponownie",
      "Token has expired": "Sesja wygasła. Zaloguj się ponownie",
      "Invalid refresh token": "Sesja nieważna. Zaloguj się ponownie",
    };

    // Sprawdź czy jest dokładne dopasowanie
    if (error.message && errorMap[error.message]) {
      return errorMap[error.message];
    }

    // Sprawdź czy message zawiera któryś z kluczy
    if (error.message) {
      for (const [key, value] of Object.entries(errorMap)) {
        if (error.message.includes(key)) {
          return value;
        }
      }
    }

    // Fallback dla nieznanych błędów
    return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie";
  }
}

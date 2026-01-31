/**
 * Authentication Panel Component
 * Provides UI for login, registration, and password recovery
 * Integrated with AuthService for full functionality
 */

import { useState, type FormEvent } from "react";
import { LogIn, UserPlus, Mail, Lock, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthService, AuthError } from "@/services/auth-service";

type AuthMode = "login" | "register" | "forgot-password";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface Props {
  mode?: AuthMode;
  redirectTo?: string;
}

export function AuthPanel({ mode: initialMode = "login", redirectTo = "/generate" }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Client-side validation
   */
  const validateForm = (): string | null => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Nieprawidłowy format adresu email";
    }

    // Password validation dla login i register
    if (mode !== "forgot-password") {
      if (formData.password.length < 8) {
        return "Hasło musi mieć co najmniej 8 znaków";
      }

      // Confirm password validation dla register
      if (mode === "register") {
        if (formData.password !== formData.confirmPassword) {
          return "Hasła nie są identyczne";
        }

        // Terms & Conditions validation
        if (!agreedToTerms) {
          return "Musisz zaakceptować Regulamin i Politykę Prywatności";
        }
      }
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await handleLogin();
      } else if (mode === "register") {
        await handleRegister();
      } else if (mode === "forgot-password") {
        await handleForgotPassword();
      }
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle login
   */
  const handleLogin = async () => {
    await AuthService.signIn(formData.email, formData.password);

    // Session automatycznie zapisana do localStorage przez AuthService
    // Przekieruj użytkownika na główny widok aplikacji
    window.location.href = redirectTo;
  };

  /**
   * Handle registration
   * MVP: Auto-login po rejestracji (email verification wyłączona)
   */
  const handleRegister = async () => {
    await AuthService.signUp(formData.email, formData.password);

    // MVP: Auto-login (email verification wyłączona)
    // Session automatycznie zapisana do localStorage
    window.location.href = redirectTo;
  };

  /**
   * Handle forgot password
   */
  const handleForgotPassword = async () => {
    await AuthService.resetPasswordRequest(formData.email);

    // Pokaż success message
    setSuccessMessage(
      "Jeśli podany adres email jest zarejestrowany, wyślemy na niego link do resetowania hasła. Sprawdź swoją skrzynkę."
    );

    // Wyczyść formularz
    setFormData({ email: "", password: "", confirmPassword: "" });
  };

  /**
   * Handle input change
   */
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Wyczyść błąd gdy użytkownik zaczyna pisać
    if (error) setError(null);
  };

  /**
   * Switch mode and reset state
   */
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setFormData({ email: "", password: "", confirmPassword: "" });
    setAgreedToTerms(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              {mode === "login" ? (
                <LogIn className="w-8 h-8 text-primary-foreground" />
              ) : mode === "register" ? (
                <UserPlus className="w-8 h-8 text-primary-foreground" />
              ) : (
                <Mail className="w-8 h-8 text-primary-foreground" />
              )}
            </div>
          </div>

          <CardTitle className="text-2xl text-center font-bold">
            {mode === "login" && "Zaloguj się"}
            {mode === "register" && "Zarejestruj się"}
            {mode === "forgot-password" && "Przypomnij hasło"}
          </CardTitle>

          <CardDescription className="text-center">
            {mode === "login" && "Witaj ponownie! Wprowadź swoje dane."}
            {mode === "register" && "Stwórz nowe konto, aby rozpocząć naukę."}
            {mode === "forgot-password" && "Wyślemy Ci link do resetowania hasła."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert className="mb-4 border-green-500 text-green-700 dark:text-green-400">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "forgot-password" ? (
              // Password Recovery Form
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="twoj@email.com"
                      className="pl-10"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Wyślij link resetujący
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => switchMode("login")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrót do logowania
                </Button>
              </>
            ) : (
              // Login & Register Forms
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="twoj@email.com"
                      className="pl-10"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {mode === "register" && formData.password && formData.password.length < 8 && (
                    <p className="text-xs text-muted-foreground">Hasło musi mieć co najmniej 8 znaków</p>
                  )}
                </div>

                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Potwierdź hasło</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        required
                        minLength={8}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-destructive">Hasła nie są identyczne</p>
                    )}
                  </div>
                )}

                {/* Terms & Conditions Checkbox (tylko przy rejestracji) */}
                {mode === "register" && (
                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Zgadzam się na{" "}
                      <a href="/terms" className="underline hover:text-foreground">
                        Regulamin
                      </a>{" "}
                      i{" "}
                      <a href="/privacy" className="underline hover:text-foreground">
                        Politykę Prywatności
                      </a>
                    </label>
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot-password")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                      disabled={isLoading}
                    >
                      Zapomniałeś hasła?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "login" ? "Logowanie..." : "Rejestrowanie..."}
                    </>
                  ) : mode === "login" ? (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Zaloguj się
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Zarejestruj się
                    </>
                  )}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground -mt-2 mb-3">
                  {mode === "login" ? "Nie masz konta?" : "Masz już konto?"}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  disabled={isLoading}
                >
                  {mode === "login" ? "Utwórz nowe konto" : "Zaloguj się"}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

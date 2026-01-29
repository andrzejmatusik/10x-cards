/**
 * Authentication Panel Component
 * Provides UI for login, registration, and password recovery
 * No functionality - just UI for now
 */

import { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register" | "forgot-password";

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add authentication logic
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "forgot-password" ? (
              // Password Recovery Form
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="twoj@email.com" className="pl-10" required />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Wyślij link resetujący
                </Button>

                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
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
                    <Input id="email" type="email" placeholder="twoj@email.com" className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" className="pl-10" required />
                  </div>
                </div>

                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Potwierdź hasło</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="confirm-password" type="password" placeholder="••••••••" className="pl-10" required />
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode("forgot-password")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      Zapomniałeś hasła?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {mode === "login" ? (
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
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
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

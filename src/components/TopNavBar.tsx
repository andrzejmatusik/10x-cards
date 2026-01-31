/**
 * TopNavBar Component
 * Navigation bar with theme toggle and logout functionality
 * Used on authenticated pages
 */

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthService } from "@/services/auth-service";

export function TopNavBar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await AuthService.signOut();
      // Redirect to home page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect even if there's an error
      window.location.href = "/";
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-16 flex items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <a href="/generate" className="text-xl font-bold hover:opacity-80 transition-opacity">
            10x-cards
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2"
            title="Wyloguj się"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Wyloguj</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

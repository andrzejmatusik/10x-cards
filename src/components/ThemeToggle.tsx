/**
 * Theme Toggle Component
 * Allows switching between light and dark mode
 * Persists preference in localStorage
 */

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Get initial theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      applyTheme(stored);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      applyTheme(initialTheme);
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-10 h-10" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" className="w-10 h-10" onClick={toggleTheme} title="Przełącz motyw">
      {theme === "light" ? (
        <Moon className="h-5 w-5 transition-transform" />
      ) : (
        <Sun className="h-5 w-5 transition-transform" />
      )}
    </Button>
  );
}

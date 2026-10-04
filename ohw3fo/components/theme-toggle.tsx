"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  if (!theme) {
    return <div className="size-9" />; // Placeholder to avoid hydration mismatch
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-md active:scale-95"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
    </button>
  );
}

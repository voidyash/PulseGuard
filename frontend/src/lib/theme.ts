export type Theme = "light" | "dark";

export const THEME_KEY = "pulseguard.theme";

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function toggleTheme(theme: Theme): Theme {
  const next: Theme = theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  return next;
}

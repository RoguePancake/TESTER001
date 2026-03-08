export type ThemePreference = "light" | "dark" | "auto";
export type LayoutPreference = "mobile" | "desktop" | "auto";

export interface DisplayPreferences {
  theme: ThemePreference;
  layout_mode: LayoutPreference;
}

export const DISPLAY_PREFS_KEY = "jobsite-display-preferences";

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: "auto",
  layout_mode: "mobile",
};

function parseTheme(value: unknown): ThemePreference {
  if (value === "light" || value === "dark" || value === "auto") return value;
  return DEFAULT_DISPLAY_PREFERENCES.theme;
}

function parseLayout(value: unknown): LayoutPreference {
  if (value === "mobile" || value === "desktop" || value === "auto") return value;
  return DEFAULT_DISPLAY_PREFERENCES.layout_mode;
}

export function normalizeDisplayPreferences(
  raw?: Partial<DisplayPreferences> | Record<string, unknown> | null
): DisplayPreferences {
  return {
    theme: parseTheme(raw?.theme),
    layout_mode: parseLayout(raw?.layout_mode),
  };
}

export function loadDisplayPreferences(): DisplayPreferences {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_PREFERENCES;
  const raw = window.localStorage.getItem(DISPLAY_PREFS_KEY);
  if (!raw) return DEFAULT_DISPLAY_PREFERENCES;

  try {
    return normalizeDisplayPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

export function saveDisplayPreferences(preferences: DisplayPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(preferences));
}

export function applyDisplayPreferences(preferences: DisplayPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark =
    preferences.theme === "dark" ||
    (preferences.theme === "auto" && prefersDark);

  root.dataset.theme = useDark ? "dark" : "light";
  root.dataset.layoutMode = preferences.layout_mode;
}

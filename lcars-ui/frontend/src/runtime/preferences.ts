import type { Manifest, ManifestTheme } from "../types/contract";

export type MotionPreference = "system" | "full" | "reduced";

export interface WebUIPreferences {
  theme: ManifestTheme;
  soundEnabled: boolean;
  motion: MotionPreference;
  uppercase: boolean;
  lcarsFontText: boolean;
}

const STORAGE_PREFIX = "lcars.webui.preferences.v1:";
const THEMES = new Set<ManifestTheme>(["galaxy", "nemesis", "tng", "outpost", "cardassian"]);
const MOTION = new Set<MotionPreference>(["system", "full", "reduced"]);

export const preferenceKey = (appName: string): string =>
  `${STORAGE_PREFIX}${encodeURIComponent(appName)}`;

export const defaultPreferences = (meta: Manifest["meta"]): WebUIPreferences => ({
  theme: meta.theme,
  soundEnabled: meta.sound_enabled,
  motion: "system",
  uppercase: meta.force_uppercase,
  lcarsFontText: meta.lcars_font_text,
});

const storageOrNull = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const loadPreferences = (
  meta: Manifest["meta"],
  storage: Pick<Storage, "getItem"> | null = storageOrNull(),
): WebUIPreferences => {
  const fallback = defaultPreferences(meta);
  if (!storage) return fallback;

  try {
    const encoded = storage.getItem(preferenceKey(meta.app_name));
    if (!encoded) return fallback;
    const raw = JSON.parse(encoded) as Record<string, unknown>;
    return {
      theme: typeof raw.theme === "string" && THEMES.has(raw.theme as ManifestTheme)
        ? (raw.theme as ManifestTheme)
        : fallback.theme,
      soundEnabled:
        typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : fallback.soundEnabled,
      motion:
        typeof raw.motion === "string" && MOTION.has(raw.motion as MotionPreference)
          ? (raw.motion as MotionPreference)
          : fallback.motion,
      uppercase: typeof raw.uppercase === "boolean" ? raw.uppercase : fallback.uppercase,
      lcarsFontText:
        typeof raw.lcarsFontText === "boolean" ? raw.lcarsFontText : fallback.lcarsFontText,
    };
  } catch {
    return fallback;
  }
};

export const savePreferences = (
  appName: string,
  preferences: WebUIPreferences,
  storage: Pick<Storage, "setItem"> | null = storageOrNull(),
): void => {
  if (!storage) return;
  try {
    storage.setItem(preferenceKey(appName), JSON.stringify(preferences));
  } catch {
    // Storage can be disabled or full. Preferences still work for this session.
  }
};

export const clearPreferences = (
  appName: string,
  storage: Pick<Storage, "removeItem"> | null = storageOrNull(),
): void => {
  if (!storage) return;
  try {
    storage.removeItem(preferenceKey(appName));
  } catch {
    // See savePreferences: persistence is optional, UI state is not.
  }
};

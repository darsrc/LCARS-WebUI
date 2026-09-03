import type { Manifest, ManifestTheme } from "../types/contract";
import type { KeyBindingOverrides } from "./keybindings";
import { availableThemeIds } from "./themes";

export type MotionPreference = "system" | "full" | "reduced";

export interface WebUIPreferences {
  theme: ManifestTheme;
  soundEnabled: boolean;
  motion: MotionPreference;
  uppercase: boolean;
  lcarsFontText: boolean;
  keyBindings: KeyBindingOverrides;
}

const STORAGE_PREFIX = "lcars.webui.preferences.v1:";
const MOTION = new Set<MotionPreference>(["system", "full", "reduced"]);

type PreferenceReader = Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>;

export const preferenceKey = (appName: string): string =>
  `${STORAGE_PREFIX}${encodeURIComponent(appName)}`;

export const defaultPreferences = (meta: Manifest["meta"]): WebUIPreferences => ({
  theme: meta.theme,
  soundEnabled: meta.sound_enabled,
  motion: "system",
  uppercase: meta.force_uppercase,
  lcarsFontText: meta.lcars_font_text,
  keyBindings: {},
});

const parseKeyBindingOverrides = (value: unknown): KeyBindingOverrides => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | null] =>
      typeof entry[1] === "string" || entry[1] === null,
    ),
  );
};

const storageOrNull = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const loadPreferences = (
  meta: Manifest["meta"],
  storage: PreferenceReader | null = storageOrNull(),
): WebUIPreferences => {
  const fallback = defaultPreferences(meta);
  if (!storage) return fallback;

  try {
    const encoded = storage.getItem(preferenceKey(meta.app_name));
    if (!encoded) return fallback;
    const raw = JSON.parse(encoded) as Record<string, unknown>;
    const themeIds = availableThemeIds(meta);
    const preferences = {
      theme: typeof raw.theme === "string" && themeIds.has(raw.theme)
        ? raw.theme
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
      keyBindings: parseKeyBindingOverrides(raw.keyBindings),
    };
    if (typeof raw.theme === "string" && !themeIds.has(raw.theme)) {
      storage.setItem?.(preferenceKey(meta.app_name), JSON.stringify(preferences));
    }
    return preferences;
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

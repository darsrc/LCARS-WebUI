import type { WebUIPreferences } from "../runtime/preferences";

interface WebUISettingsProps {
  onChange?: (patch: Partial<WebUIPreferences>) => void;
  onReset?: () => void;
  preferences: WebUIPreferences;
}

const THEME_OPTIONS: Array<{ label: string; value: WebUIPreferences["theme"] }> = [
  { label: "Galaxy / 2357", value: "galaxy" },
  { label: "Nemesis / 2379", value: "nemesis" },
  { label: "TNG / 2364", value: "tng" },
  { label: "Outpost / 2375", value: "outpost" },
  { label: "Cardassian", value: "cardassian" },
  { label: "Klingon", value: "klingon" },
  { label: "Romulan", value: "romulan" },
  { label: "Ferengi", value: "ferengi" },
  { label: "Gruvbox", value: "gruvbox" },
];

const MOTION_OPTIONS: Array<{ label: string; value: WebUIPreferences["motion"] }> = [
  { label: "Follow system", value: "system" },
  { label: "Full motion", value: "full" },
  { label: "Reduced motion", value: "reduced" },
];

function PreferenceToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="lcars-btn lcars-preference-toggle"
      data-on={checked}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>{label}</span>
      <b className="lcars-control-value">{checked ? "ON" : "OFF"}</b>
    </button>
  );
}

export function WebUISettings({
  onChange,
  onReset,
  preferences,
}: WebUISettingsProps) {
  return (
    <div className="lcars-webui-settings">
      <p className="lcars-webui-settings-intro">
        These preferences are local to this browser and override the application defaults.
      </p>
      <div className="lcars-field lcars-field--stacked">
        <span id="webui-theme-label">Theme</span>
        <div aria-labelledby="webui-theme-label" className="lcars-option-stack" role="radiogroup">
          {THEME_OPTIONS.map((option) => {
            const selected = preferences.theme === option.value;
            return (
              <button
                aria-checked={selected}
                className="lcars-option-stack__option"
                data-on={selected}
                key={option.value}
                onClick={() => onChange?.({ theme: option.value })}
                role="radio"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="lcars-field lcars-field--stacked">
        <span id="webui-motion-label">Motion</span>
        <div aria-labelledby="webui-motion-label" className="lcars-segments" role="radiogroup">
          {MOTION_OPTIONS.map((option) => {
            const selected = preferences.motion === option.value;
            return (
              <button
                aria-checked={selected}
                className="lcars-segment"
                data-on={selected}
                key={option.value}
                onClick={() => onChange?.({ motion: option.value })}
                role="radio"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <PreferenceToggle
        checked={preferences.soundEnabled}
        label="Interface sound"
        onChange={(soundEnabled) => onChange?.({ soundEnabled })}
      />
      <PreferenceToggle
        checked={preferences.uppercase}
        label="Uppercase labels"
        onChange={(uppercase) => onChange?.({ uppercase })}
      />
      <PreferenceToggle
        checked={preferences.lcarsFontText}
        label="LCARS body type"
        onChange={(lcarsFontText) => onChange?.({ lcarsFontText })}
      />
      <button className="lcars-btn lcars-webui-reset" onClick={onReset} type="button">
        <span>Restore application defaults</span>
      </button>
    </div>
  );
}

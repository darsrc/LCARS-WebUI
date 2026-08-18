import type { WebUIPreferences } from "../runtime/preferences";

interface WebUISettingsProps {
  onChange?: (patch: Partial<WebUIPreferences>) => void;
  onReset?: () => void;
  preferences: WebUIPreferences;
}

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
      <label className="lcars-field">
        <span>Theme</span>
        <select
          onChange={(event) =>
            onChange?.({ theme: event.currentTarget.value as WebUIPreferences["theme"] })
          }
          value={preferences.theme}
        >
          <option value="galaxy">Galaxy / 2357</option>
          <option value="nemesis">Nemesis / 2379</option>
          <option value="tng">TNG / 2364</option>
          <option value="outpost">Outpost / 2375</option>
          <option value="cardassian">Cardassian</option>
          <option value="klingon">Klingon</option>
          <option value="romulan">Romulan</option>
          <option value="ferengi">Ferengi</option>
          <option value="gruvbox">Gruvbox</option>
        </select>
      </label>
      <label className="lcars-field">
        <span>Motion</span>
        <select
          onChange={(event) =>
            onChange?.({ motion: event.currentTarget.value as WebUIPreferences["motion"] })
          }
          value={preferences.motion}
        >
          <option value="system">Follow system</option>
          <option value="full">Full motion</option>
          <option value="reduced">Reduced motion</option>
        </select>
      </label>
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

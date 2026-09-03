import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { bindingChord, chordForEvent, chordsConflict, formatChord } from "../runtime/keybindings";
import type { WebUIPreferences } from "../runtime/preferences";
import type { KeyBinding, ThemeDefinition } from "../types/contract";

interface WebUISettingsProps {
  bindings: KeyBinding[];
  onChange?: (patch: Partial<WebUIPreferences>) => void;
  onReset?: () => void;
  preferences: WebUIPreferences;
  themes: ThemeDefinition[];
}

const MOTION_OPTIONS: Array<{ label: string; value: WebUIPreferences["motion"] }> = [
  { label: "Follow system", value: "system" },
  { label: "Full motion", value: "full" },
  { label: "Reduced motion", value: "reduced" },
];

const moveRadioFocus = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
  const direction = event.key === "ArrowRight" || event.key === "ArrowDown"
    ? 1
    : event.key === "ArrowLeft" || event.key === "ArrowUp"
      ? -1
      : 0;
  if (direction === 0 && event.key !== "Home" && event.key !== "End") return;
  const buttons = [...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
    "[role='radio']",
  ) ?? [])];
  if (buttons.length === 0) return;
  event.preventDefault();
  const current = buttons.indexOf(event.currentTarget);
  const next = event.key === "Home"
    ? 0
    : event.key === "End"
      ? buttons.length - 1
      : (current + direction + buttons.length) % buttons.length;
  buttons[next]?.focus();
  buttons[next]?.click();
};

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
  bindings,
  onChange,
  onReset,
  preferences,
  themes,
}: WebUISettingsProps) {
  const [capturing, setCapturing] = useState<string | null>(null);
  const [captureNote, setCaptureNote] = useState<string | null>(null);

  const updateBindings = (next: WebUIPreferences["keyBindings"]) => {
    onChange?.({ keyBindings: next });
  };

  const capture = (binding: KeyBinding, event: ReactKeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      setCapturing(null);
      setCaptureNote("Shortcut change cancelled.");
      return;
    }
    if ((event.key === "Backspace" || event.key === "Delete")
      && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      updateBindings({ ...preferences.keyBindings, [binding.id]: null });
      setCapturing(null);
      setCaptureNote(`${binding.label} disabled.`);
      return;
    }
    const chord = chordForEvent(event.nativeEvent);
    if (!chord) return;

    const conflict = bindings.find((candidate) =>
      candidate.id !== binding.id
      && candidate.scope === binding.scope
      && Boolean(bindingChord(candidate, preferences.keyBindings))
      && chordsConflict(bindingChord(candidate, preferences.keyBindings) ?? "", chord),
    );
    const next = { ...preferences.keyBindings, [binding.id]: chord };
    if (conflict) next[conflict.id] = null;
    updateBindings(next);
    setCapturing(null);
    setCaptureNote(
      conflict
        ? `${formatChord(chord)} moved from ${conflict.label} to ${binding.label}.`
        : `${binding.label} set to ${formatChord(chord)}.`,
    );
  };

  const resetBinding = (binding: KeyBinding) => {
    const next = { ...preferences.keyBindings };
    delete next[binding.id];
    updateBindings(next);
    setCaptureNote(`${binding.label} restored to its application default.`);
  };

  return (
    <div className="lcars-webui-settings">
      <p className="lcars-webui-settings-intro">
        These preferences are local to this browser and override the application defaults.
      </p>

      <section className="lcars-settings-section" aria-labelledby="webui-appearance-label">
        <div className="lcars-settings-section__head">
          <span aria-hidden="true">01</span>
          <h3 id="webui-appearance-label">Appearance</h3>
        </div>
        <div className="lcars-settings-section__body lcars-settings-grid">
          <div className="lcars-field lcars-field--stacked lcars-settings-theme">
            <span id="webui-theme-label">Theme</span>
            <div aria-labelledby="webui-theme-label" className="lcars-option-stack" role="radiogroup">
              {themes.map((theme) => {
                const selected = preferences.theme === theme.id;
                return (
                  <button
                    aria-checked={selected}
                    className="lcars-option-stack__option"
                    data-on={selected}
                    key={theme.id}
                    onClick={() => onChange?.({ theme: theme.id })}
                    onKeyDown={moveRadioFocus}
                    role="radio"
                    tabIndex={selected ? 0 : -1}
                    type="button"
                  >
                    {theme.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="lcars-settings-toggles">
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
          </div>
        </div>
      </section>

      <section className="lcars-settings-section" aria-labelledby="webui-behavior-label">
        <div className="lcars-settings-section__head">
          <span aria-hidden="true">02</span>
          <h3 id="webui-behavior-label">Behavior</h3>
        </div>
        <div className="lcars-settings-section__body lcars-settings-grid">
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
                    onKeyDown={moveRadioFocus}
                    role="radio"
                    tabIndex={selected ? 0 : -1}
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
        </div>
      </section>

      <section className="lcars-settings-section lcars-settings-section--keys" aria-labelledby="webui-keyboard-label">
        <div className="lcars-settings-section__head">
          <span aria-hidden="true">03</span>
          <h3 id="webui-keyboard-label">Keyboard</h3>
        </div>
        <div className="lcars-settings-section__body">
          <p className="lcars-keybinding-help">
            Select a binding, then press a new key combination. Escape cancels;
            Backspace or Delete disables it. Conflicting bindings are moved automatically.
          </p>
          <div className="lcars-keybinding-list">
            {bindings.map((binding) => {
              const chord = bindingChord(binding, preferences.keyBindings);
              const overridden = Object.prototype.hasOwnProperty.call(
                preferences.keyBindings,
                binding.id,
              );
              return (
                <div className="lcars-keybinding" data-disabled={!chord || undefined} key={binding.id}>
                  <span className="lcars-keybinding-scope">
                    {binding.scope === "global" ? "Interface" : "Graph"}
                  </span>
                  <span className="lcars-keybinding-label">{binding.label}</span>
                  <kbd>{capturing === binding.id ? "Press keys…" : formatChord(chord)}</kbd>
                  <button
                    aria-label={`${capturing === binding.id ? "Recording" : "Change"} ${binding.label}`}
                    className="lcars-btn lcars-keybinding-change"
                    data-on={capturing === binding.id || undefined}
                    onClick={() => {
                      setCapturing(binding.id);
                      setCaptureNote(null);
                    }}
                    onKeyDown={(event) => capturing === binding.id && capture(binding, event)}
                    type="button"
                  >
                    {capturing === binding.id ? "Recording" : "Change"}
                  </button>
                  <button
                    aria-label={`Disable ${binding.label}`}
                    className="lcars-keybinding-small"
                    disabled={!chord}
                    onClick={() => updateBindings({
                      ...preferences.keyBindings,
                      [binding.id]: null,
                    })}
                    type="button"
                  >
                    Off
                  </button>
                  <button
                    aria-label={`Reset ${binding.label}`}
                    className="lcars-keybinding-small"
                    disabled={!overridden}
                    onClick={() => resetBinding(binding)}
                    type="button"
                  >
                    Reset
                  </button>
                </div>
              );
            })}
          </div>
          <p aria-live="polite" className="lcars-keybinding-status">{captureNote}</p>
        </div>
      </section>

      <button className="lcars-btn lcars-webui-reset" onClick={onReset} type="button">
        <span>Restore all application defaults</span>
      </button>
    </div>
  );
}

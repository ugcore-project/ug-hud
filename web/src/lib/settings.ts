/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// The player's HUD settings. Saved as JSON in client KVP and shared as export codes, so every load is untrusted:
// parseSettings keeps only known keys with bounded values and fills the rest from the preset.

import { Minimap, Preset, SpeedUnit } from "@/types/protocol";

export const WIDGETS = ["status", "money", "identity", "voice", "speedometer", "compass", "clock", "weapon"] as const;
export type WidgetId = (typeof WIDGETS)[number];

/** English names, for when the locale has none. */
export const WIDGET_NAMES: Record<WidgetId, string> = {
  status: "Status",
  money: "Money",
  identity: "Identity",
  voice: "Voice",
  speedometer: "Speedometer",
  compass: "Compass",
  clock: "Clock",
  weapon: "Weapon",
};

/** Styles each widget offers. The first is the fallback. */
export const STYLES: Record<WidgetId, readonly string[]> = {
  status: ["rings", "bars", "pills", "minimal"],
  money: ["card", "plain"],
  identity: ["card", "plain"],
  voice: ["pill", "dots"],
  speedometer: ["arc", "digital", "bar"],
  compass: ["tape", "heading"],
  clock: ["card", "plain"],
  weapon: ["card", "plain"],
};

export interface WidgetSettings {
  /** Top-left corner, as a fraction of the screen. */
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
  style: string;
}

export interface StatusSettings {
  visible: boolean;
  color?: string;
}

export interface Settings {
  /** 2: positions are anchored edges. Version 1 positions were top-left corners and are dropped on load. */
  version: 2;
  preset: Preset;
  accent: string;
  scale: number;
  speedUnit: SpeedUnit;
  minimap: Minimap;
  clock24: boolean;
  /** Letterbox bars and only the essentials. */
  cinematic: boolean;
  /** Full bars hide themselves until they change. */
  smartHide: boolean;
  /** Low health vignette, heartbeat and warning pulses. */
  effects: boolean;
  sounds: boolean;
  snap: boolean;
  widgets: Record<WidgetId, WidgetSettings>;
  statuses: Record<string, StatusSettings>;
}

const MAX_STATUSES = 48;
const HEX = /^#[0-9a-f]{6}$/i;
const STATUS_NAME = /^[A-Za-z0-9_-]{1,32}$/;

export const STATUS_COLORS: Record<string, string> = {
  health: "#ef4444",
  armor: "#3b82f6",
  stamina: "#22c55e",
  oxygen: "#67e8f9",
  hunger: "#f59e0b",
  thirst: "#06b6d4",
  stress: "#a855f7",
};

/**
 * Default positions in the corners, for a 16:9 screen. Each value is the edge the widget hangs from (see lib/snap.ts):
 * * right-hand widgets give their right edge, bottom ones their bottom edge. The minimap is raised (`minimapLift`, 0.09 by
 * * default): status sits under it in the corner, voice above it.
 */
const POSITIONS: Record<WidgetId, { x: number; y: number }> = {
  clock: { x: 0.012, y: 0.02 },
  compass: { x: 0.5, y: 0.015 },
  money: { x: 0.988, y: 0.02 },
  identity: { x: 0.988, y: 0.115 },
  weapon: { x: 0.988, y: 0.2 },
  voice: { x: 0.012, y: 0.7 },
  status: { x: 0.012, y: 0.975 },
  speedometer: { x: 0.988, y: 0.975 },
};

interface PresetLook {
  accent: string;
  styles: Record<WidgetId, string>;
}

export const PRESETS: Record<Preset, PresetLook> = {
  [Preset.Neon]: {
    // ug-core purple, the primary color of the default ug-lib theme.
    accent: "#8b5cf6",
    styles: { status: "rings", money: "card", identity: "card", voice: "pill", speedometer: "arc", compass: "tape", clock: "card", weapon: "card" },
  },
  [Preset.Minimal]: {
    accent: "#e5e7eb",
    styles: { status: "minimal", money: "plain", identity: "plain", voice: "dots", speedometer: "digital", compass: "heading", clock: "plain", weapon: "plain" },
  },
  [Preset.Classic]: {
    accent: "#22c55e",
    styles: { status: "bars", money: "card", identity: "card", voice: "pill", speedometer: "bar", compass: "tape", clock: "card", weapon: "card" },
  },
  [Preset.Sport]: {
    accent: "#f97316",
    styles: { status: "pills", money: "plain", identity: "card", voice: "dots", speedometer: "arc", compass: "tape", clock: "plain", weapon: "card" },
  },
};

export const ACCENTS = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#e5e7eb"];

/** The owner's starting widget. `enabled = false` removes it for everyone. An empty style means the preset's. */
export interface OwnerWidget extends WidgetSettings {
  enabled: boolean;
}

export interface Alerts {
  /** Health at or below this shows the vignette and heartbeat. */
  lowHealth: number;
  lowStatus: number;
  highStatus: number;
  /** Statuses where a high value is the bad one. */
  inverted: string[];
  heartbeatInterval: number;
  chimeInterval: number;
  /** Unbuckled above this speed in km/h chimes. */
  chimeSpeed: number;
}

/** What players MAY change in the editor. */
export interface EditorRules {
  enabled: boolean;
  presets: Preset[];
  accents: string[];
  /** Position, size, opacity and HUD size. */
  move: boolean;
  /** Presets and widget styles. */
  styles: boolean;
  /** Accent and bar colors. */
  colors: boolean;
  /** Share and import codes. */
  codes: boolean;
}

/** The owner's look: config.lua's defaults, widgets, cinematicWidgets, statusColors, alerts and editor. */
export interface OwnerLook {
  defaults: {
    /** Hex, or empty for the preset's accent. */
    accent: string;
    scale: number;
    clock24: boolean;
    cinematic: boolean;
    smartHide: boolean;
    effects: boolean;
    sounds: boolean;
    snap: boolean;
  };
  widgets: Record<WidgetId, OwnerWidget>;
  cinematicWidgets: WidgetId[];
  statusColors: Record<string, string>;
  alerts: Alerts;
  editor: EditorRules;
}

function defaultWidgets(): Record<WidgetId, OwnerWidget> {
  const widgets = {} as Record<WidgetId, OwnerWidget>;

  for (const id of WIDGETS) {
    widgets[id] = { ...POSITIONS[id], scale: 1, opacity: 1, visible: true, style: "", enabled: true };
  }

  return widgets;
}

export const DEFAULT_LOOK: OwnerLook = {
  defaults: { accent: "", scale: 1, clock24: true, cinematic: false, smartHide: false, effects: true, sounds: true, snap: true },
  widgets: defaultWidgets(),
  cinematicWidgets: ["status", "speedometer"],
  statusColors: STATUS_COLORS,
  alerts: { lowHealth: 30, lowStatus: 20, highStatus: 80, inverted: ["stress"], heartbeatInterval: 1100, chimeInterval: 2000, chimeSpeed: 18 },
  editor: { enabled: true, presets: Object.values(Preset), accents: ACCENTS, move: true, styles: true, colors: true, codes: true },
};

export interface OwnerDefaults {
  preset: Preset;
  speedUnit: SpeedUnit;
  minimap: Minimap;
  /** DEFAULT_LOOK when left out. */
  look?: OwnerLook;
}

/**
 * A preset's widgets at the owner's places. The owner's styles apply to the owner's preset only: another preset
 * brings its own look.
 */
function presetWidgets(preset: Preset, owner: OwnerDefaults): Record<WidgetId, WidgetSettings> {
  const styles = PRESETS[preset].styles;
  const look = owner.look ?? DEFAULT_LOOK;
  const widgets = {} as Record<WidgetId, WidgetSettings>;

  for (const id of WIDGETS) {
    const own = look.widgets[id];
    const style = preset === owner.preset && STYLES[id].includes(own.style) ? own.style : styles[id];

    widgets[id] = { x: own.x, y: own.y, scale: own.scale, opacity: own.opacity, visible: own.enabled && own.visible, style };
  }

  return widgets;
}

export function defaultSettings(owner: OwnerDefaults): Settings {
  const look = (owner.look ?? DEFAULT_LOOK).defaults;

  return {
    version: 2,
    preset: owner.preset,
    accent: isHex(look.accent) ? look.accent : PRESETS[owner.preset].accent,
    scale: look.scale,
    speedUnit: owner.speedUnit,
    minimap: owner.minimap,
    clock24: look.clock24,
    cinematic: look.cinematic,
    smartHide: look.smartHide,
    effects: look.effects,
    sounds: look.sounds,
    snap: look.snap,
    widgets: presetWidgets(owner.preset, owner),
    statuses: {},
  };
}

/** Switches to a preset's look and keeps where the player put things. `keepAccent` when colors are locked. */
export function applyPreset(settings: Settings, preset: Preset, keepAccent = false): Settings {
  const look = PRESETS[preset];
  const widgets = { ...settings.widgets };

  for (const id of WIDGETS) {
    widgets[id] = { ...widgets[id], style: look.styles[id] };
  }

  return { ...settings, preset, accent: keepAccent ? settings.accent : look.accent, widgets };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The owner's look from Lua. Lua checked it; it is checked again, field by field, with DEFAULT_LOOK as fallback. */
export function readLook(input: unknown): OwnerLook {
  if (!isObject(input)) {
    return DEFAULT_LOOK;
  }

  const fallback = DEFAULT_LOOK;
  const defaults = isObject(input.defaults) ? input.defaults : {};
  const rawWidgets = isObject(input.widgets) ? input.widgets : {};
  const alerts = isObject(input.alerts) ? input.alerts : {};
  const editor = isObject(input.editor) ? input.editor : {};
  const widgets = {} as Record<WidgetId, OwnerWidget>;
  const names = (value: unknown, max: number): string[] | undefined =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && STATUS_NAME.test(entry)).slice(0, max) : undefined;

  for (const id of WIDGETS) {
    const value = rawWidgets[id];
    const widget = isObject(value) ? value : {};
    const base = fallback.widgets[id];

    widgets[id] = {
      enabled: bool(widget.enabled, base.enabled),
      visible: bool(widget.visible, base.visible),
      x: num(widget.x, 0, 1, base.x),
      y: num(widget.y, 0, 1, base.y),
      scale: num(widget.scale, 0.5, 2, base.scale),
      opacity: num(widget.opacity, 0.2, 1, base.opacity),
      style: oneOf(widget.style, STYLES[id], ""),
    };
  }

  const statusColors: Record<string, string> = {};
  const rawColors = isObject(input.statusColors) ? input.statusColors : fallback.statusColors;

  for (const [name, color] of Object.entries(rawColors).slice(0, MAX_STATUSES)) {
    if (STATUS_NAME.test(name) && isHex(color)) {
      statusColors[name] = color;
    }
  }

  const presets = Array.isArray(editor.presets) ? editor.presets.filter((entry): entry is Preset => oneOf(entry, Object.values(Preset), null) !== null) : [];
  const accents = Array.isArray(editor.accents) ? editor.accents.filter(isHex).slice(0, 24) : fallback.editor.accents;
  const cinematic = Array.isArray(input.cinematicWidgets)
    ? input.cinematicWidgets.filter((entry): entry is WidgetId => (WIDGETS as readonly unknown[]).includes(entry))
    : fallback.cinematicWidgets;

  return {
    defaults: {
      accent: isHex(defaults.accent) ? defaults.accent : "",
      scale: num(defaults.scale, 0.6, 1.6, fallback.defaults.scale),
      clock24: bool(defaults.clock24, fallback.defaults.clock24),
      cinematic: bool(defaults.cinematic, fallback.defaults.cinematic),
      smartHide: bool(defaults.smartHide, fallback.defaults.smartHide),
      effects: bool(defaults.effects, fallback.defaults.effects),
      sounds: bool(defaults.sounds, fallback.defaults.sounds),
      snap: bool(defaults.snap, fallback.defaults.snap),
    },
    widgets,
    cinematicWidgets: cinematic,
    statusColors,
    alerts: {
      lowHealth: num(alerts.lowHealth, 0, 100, fallback.alerts.lowHealth),
      lowStatus: num(alerts.lowStatus, 0, 100, fallback.alerts.lowStatus),
      highStatus: num(alerts.highStatus, 0, 100, fallback.alerts.highStatus),
      inverted: names(alerts.inverted, 16) ?? fallback.alerts.inverted,
      heartbeatInterval: num(alerts.heartbeatInterval, 300, 10000, fallback.alerts.heartbeatInterval),
      chimeInterval: num(alerts.chimeInterval, 300, 10000, fallback.alerts.chimeInterval),
      chimeSpeed: num(alerts.chimeSpeed, 0, 500, fallback.alerts.chimeSpeed),
    },
    editor: {
      enabled: bool(editor.enabled, true),
      presets: presets.length > 0 ? presets : fallback.editor.presets,
      accents,
      move: bool(editor.move, true),
      styles: bool(editor.styles, true),
      colors: bool(editor.colors, true),
      codes: bool(editor.codes, true),
    },
  };
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string, F extends T | "" | null>(value: unknown, values: readonly T[], fallback: F): T | F {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/**
 * Settings from untrusted JSON, over the owner's defaults. Never throws. What the owner locked in `editor` comes from
 * the defaults, whatever the JSON says, so an old save or an imported code cannot get around it.
 */
export function parseSettings(input: unknown, owner: OwnerDefaults): Settings {
  const base = defaultSettings(owner);
  const look = owner.look ?? DEFAULT_LOOK;
  const rules = look.editor;
  let raw: unknown = input;

  if (!rules.enabled) {
    return base;
  }

  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return base;
    }
  }

  if (!isObject(raw)) {
    return base;
  }

  const preset = rules.styles ? oneOf(raw.preset, rules.presets, base.preset) : base.preset;
  const fromPreset = presetWidgets(preset, owner);
  const widgets = {} as Record<WidgetId, WidgetSettings>;
  const rawWidgets = isObject(raw.widgets) ? raw.widgets : {};
  // Older layouts measured from another corner: their positions would land in the wrong place.
  const samePositions = raw.version === 2;

  for (const id of WIDGETS) {
    const value = rawWidgets[id];
    const fallback = fromPreset[id];
    const widget = isObject(value) ? value : {};

    const move = rules.move && samePositions;

    widgets[id] = {
      x: move ? num(widget.x, 0, 1, fallback.x) : fallback.x,
      y: move ? num(widget.y, 0, 1, fallback.y) : fallback.y,
      scale: rules.move ? num(widget.scale, 0.5, 2, fallback.scale) : fallback.scale,
      opacity: rules.move ? num(widget.opacity, 0.2, 1, fallback.opacity) : fallback.opacity,
      visible: look.widgets[id].enabled && bool(widget.visible, fallback.visible),
      style: rules.styles ? oneOf(widget.style, STYLES[id], fallback.style) : fallback.style,
    };
  }

  const statuses: Record<string, StatusSettings> = {};
  const rawStatuses = isObject(raw.statuses) ? raw.statuses : {};

  for (const [name, value] of Object.entries(rawStatuses).slice(0, MAX_STATUSES)) {
    if (STATUS_NAME.test(name) && isObject(value)) {
      const entry: StatusSettings = { visible: bool(value.visible, true) };

      if (rules.colors && isHex(value.color)) {
        entry.color = value.color;
      }

      statuses[name] = entry;
    }
  }

  return {
    version: 2,
    preset,
    accent: rules.colors && isHex(raw.accent) ? raw.accent : preset === base.preset || !rules.colors ? base.accent : PRESETS[preset].accent,
    scale: rules.move ? num(raw.scale, 0.6, 1.6, base.scale) : base.scale,
    speedUnit: oneOf(raw.speedUnit, Object.values(SpeedUnit), base.speedUnit),
    minimap: oneOf(raw.minimap, Object.values(Minimap), base.minimap),
    clock24: bool(raw.clock24, base.clock24),
    cinematic: bool(raw.cinematic, base.cinematic),
    smartHide: bool(raw.smartHide, base.smartHide),
    effects: bool(raw.effects, base.effects),
    sounds: bool(raw.sounds, base.sounds),
    snap: bool(raw.snap, base.snap),
    widgets,
    statuses,
  };
}

const CODE_PREFIX = "UGHUD1:";

/** A code players share: the settings as base64 JSON. */
export function exportCode(settings: Settings): string {
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return CODE_PREFIX + btoa(binary);
}

/** Settings from a shared code, or null when it is not one. Bounded like any load. */
export function importCode(code: string, owner: OwnerDefaults): Settings | null {
  const trimmed = code.trim();

  if (!trimmed.startsWith(CODE_PREFIX) || trimmed.length > 40000) {
    return null;
  }

  try {
    const binary = atob(trimmed.slice(CODE_PREFIX.length));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return isObject(parsed) ? parseSettings(parsed, owner) : null;
  } catch {
    return null;
  }
}

export const SPEED_FACTOR: Record<SpeedUnit, number> = { [SpeedUnit.Kmh]: 3.6, [SpeedUnit.Mph]: 2.236936 };

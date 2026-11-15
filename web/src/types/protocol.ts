/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import type { OwnerLook } from "@/lib/settings";

// Messages between Lua and the page. Enum values MUST match shared/enums.lua: tests/nui.lua compares them.

export const NuiAction = {
  Config: "config",
  Visible: "visible",
  Player: "player",
  Needs: "needs",
  Money: "money",
  Identity: "identity",
  Voice: "voice",
  Vehicle: "vehicle",
  Location: "location",
  Weapon: "weapon",
  Statuses: "statuses",
  Editor: "editor",
} as const;
export type NuiAction = (typeof NuiAction)[keyof typeof NuiAction];

export const NuiCallback = {
  Ready: "ready",
  Viewport: "viewport",
  Save: "save",
  Close: "close",
} as const;
export type NuiCallback = (typeof NuiCallback)[keyof typeof NuiCallback];

export const Minimap = {
  Always: "always",
  Vehicle: "vehicle",
  Never: "never",
} as const;
export type Minimap = (typeof Minimap)[keyof typeof Minimap];

export const SpeedUnit = {
  Kmh: "kmh",
  Mph: "mph",
} as const;
export type SpeedUnit = (typeof SpeedUnit)[keyof typeof SpeedUnit];

export const Preset = {
  Neon: "neon",
  Minimal: "minimal",
  Classic: "classic",
  Sport: "sport",
} as const;
export type Preset = (typeof Preset)[keyof typeof Preset];

export const VehicleKind = {
  Car: "car",
  Bike: "bike",
  Boat: "boat",
  Air: "air",
} as const;
export type VehicleKind = (typeof VehicleKind)[keyof typeof VehicleKind];

export interface NuiMessage {
  action: NuiAction;
  payload?: unknown;
}

export interface ThemeConfig {
  mode: string;
  colors: Record<string, string>;
  radius: string;
  font: string;
  scale: number;
}

/** What the server owner set. Players start from it and MAY change the look and units. */
export interface OwnerConfig {
  preset: Preset;
  speedUnit: SpeedUnit;
  minimap: Minimap;
  accounts: string[];
  fuel: boolean;
  seatbelt: boolean;
  cruise: boolean;
  voice: boolean;
  editorKey: string;
  /** Starting look, warnings and what players MAY change. */
  look: OwnerLook;
}

export interface PlayerData {
  health: number;
  armor: number;
  stamina: number;
  oxygen: number;
  underwater: boolean;
  deathState: string;
}

export interface Role {
  name: string;
  label: string;
  grade?: string;
  onDuty: boolean;
}

export interface IdentityData {
  id: number;
  job?: Role;
  gang?: Role;
}

export interface VoiceData {
  enabled: boolean;
  /** Talking at all, in proximity or on the radio. */
  talking: boolean;
  /** Talking on the radio. */
  radioTalking: boolean;
  /** pma-voice mode name, such as Whisper, Normal or Shouting. */
  mode?: string;
  /** Proximity from 1, the quietest, to 3, the loudest. */
  level?: number;
  /** Radio channel, when on one. */
  radio?: number;
}

export interface VehicleData {
  active: boolean;
  kind: VehicleKind;
  driver: boolean;
  /** m/s. */
  speed: number;
  /** 0 to 1. */
  rpm: number;
  gear: number;
  fuel?: number;
  engine: number;
  body: number;
  /** Undefined when the vehicle has no seatbelt or the server turned it off. */
  seatbelt?: boolean;
  cruise?: boolean;
  /** 0 off, 1 on, 2 high beams. */
  lights: number;
  altitude?: number;
}

export interface LocationData {
  /** Degrees, 0 is north, clockwise. */
  heading: number;
  street: string;
  crossing?: string;
  zone: string;
  hours: number;
  minutes: number;
}

export interface WeaponData {
  armed: boolean;
  clip: number;
  total: number;
}

export interface CustomStatus {
  name: string;
  label: string;
  icon: string;
  color: string;
  value: number;
}

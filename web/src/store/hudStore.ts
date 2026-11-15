/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Page state. Lua sends samples. Every message is checked here: a broken or hostile payload is dropped, never shown.

import { create } from "zustand";
import { flattenLabels } from "@/lib/labels";
import { DEFAULT_LOOK, defaultSettings, isHex, parseSettings, readLook, type OwnerDefaults, type Settings } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";
import {
  Minimap,
  NuiAction,
  Preset,
  SpeedUnit,
  VehicleKind,
  type CustomStatus,
  type IdentityData,
  type LocationData,
  type NuiMessage,
  type OwnerConfig,
  type PlayerData,
  type Role,
  type ThemeConfig,
  type VehicleData,
  type VoiceData,
  type WeaponData,
} from "@/types/protocol";

const MAX_TEXT = 64;
const MAX_ENTRIES = 16;

export const DEFAULT_OWNER: OwnerConfig = {
  preset: Preset.Neon,
  speedUnit: SpeedUnit.Kmh,
  minimap: Minimap.Vehicle,
  accounts: ["cash", "bank"],
  fuel: true,
  seatbelt: true,
  cruise: true,
  voice: true,
  editorKey: "I",
  look: DEFAULT_LOOK,
};

export interface HudState {
  ready: boolean;
  visible: boolean;
  editing: boolean;
  owner: OwnerConfig;
  labels: Record<string, string>;
  locale: string;
  accountLabels: Record<string, string>;
  needLabels: Record<string, string>;
  /** What the player saved. The editor edits a draft and replaces this on save. */
  settings: Settings;
  player: PlayerData | null;
  needs: Record<string, number>;
  money: Record<string, number>;
  identity: IdentityData | null;
  voice: VoiceData | null;
  vehicle: VehicleData | null;
  location: LocationData | null;
  weapon: WeaponData | null;
  statuses: CustomStatus[];
}

const initial = (): HudState => ({
  ready: false,
  visible: false,
  editing: false,
  owner: DEFAULT_OWNER,
  labels: {},
  locale: "en",
  accountLabels: {},
  needLabels: {},
  settings: defaultSettings(DEFAULT_OWNER),
  player: null,
  needs: {},
  money: {},
  identity: null,
  voice: null,
  vehicle: null,
  location: null,
  weapon: null,
  statuses: [],
});

export const useHud = create<HudState>(() => initial());

/** Back to the first state, for tests. */
export function resetHud(): void {
  useHud.setState(initial(), true);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function clamp(value: unknown, min: number, max: number): number | undefined {
  return isNumber(value) ? Math.min(Math.max(value, min), max) : undefined;
}

function text(value: unknown, max = MAX_TEXT): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** A name to number map with at most 16 entries, for needs and money. */
function numberMap(value: unknown, min: number, max: number): Record<string, number> | null {
  // Lua sends an empty table as an empty array.
  if (Array.isArray(value) && value.length === 0) {
    return {};
  }

  if (!isObject(value)) {
    return null;
  }

  const result: Record<string, number> = {};

  for (const [key, entry] of Object.entries(value).slice(0, MAX_ENTRIES)) {
    const clean = clamp(entry, min, max);

    if (key.length <= 32 && clean !== undefined) {
      result[key] = clean;
    }
  }

  return result;
}

function stringMap(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (isObject(value)) {
    for (const [key, entry] of Object.entries(value).slice(0, MAX_ENTRIES)) {
      const clean = text(entry, 32);

      if (key.length <= 32 && clean) {
        result[key] = clean;
      }
    }
  }

  return result;
}

function readRole(value: unknown): Role | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const name = text(value.name, 32);
  const label = text(value.label, 48);

  if (!name || !label) {
    return undefined;
  }

  const role: Role = { name, label, onDuty: value.onDuty === true };
  const grade = text(value.grade, 48);

  if (grade) {
    role.grade = grade;
  }

  return role;
}

function readOwner(value: unknown): OwnerConfig {
  if (!isObject(value)) {
    return DEFAULT_OWNER;
  }

  const accounts = Array.isArray(value.accounts)
    ? value.accounts.filter((entry): entry is string => typeof entry === "string" && entry.length <= 32).slice(0, 8)
    : DEFAULT_OWNER.accounts;

  return {
    preset: oneOf(value.preset, Object.values(Preset)) ?? DEFAULT_OWNER.preset,
    speedUnit: oneOf(value.speedUnit, Object.values(SpeedUnit)) ?? DEFAULT_OWNER.speedUnit,
    minimap: oneOf(value.minimap, Object.values(Minimap)) ?? DEFAULT_OWNER.minimap,
    accounts,
    fuel: value.fuel !== false,
    seatbelt: value.seatbelt !== false,
    cruise: value.cruise !== false,
    voice: value.voice !== false,
    editorKey: text(value.editorKey, 16) ?? DEFAULT_OWNER.editorKey,
    look: readLook(value.look),
  };
}

export const ownerDefaults = (owner: OwnerConfig): OwnerDefaults => ({ preset: owner.preset, speedUnit: owner.speedUnit, minimap: owner.minimap, look: owner.look });

function readPlayer(value: Record<string, unknown>): PlayerData {
  return {
    health: clamp(value.health, 0, 100) ?? 0,
    armor: clamp(value.armor, 0, 100) ?? 0,
    stamina: clamp(value.stamina, 0, 100) ?? 100,
    oxygen: clamp(value.oxygen, 0, 100) ?? 100,
    underwater: value.underwater === true,
    deathState: text(value.deathState, 16) ?? "Alive",
  };
}

function readVehicle(value: Record<string, unknown>): VehicleData | null {
  if (value.active !== true) {
    return null;
  }

  const vehicle: VehicleData = {
    active: true,
    kind: oneOf(value.kind, Object.values(VehicleKind)) ?? VehicleKind.Car,
    driver: value.driver === true,
    speed: clamp(value.speed, 0, 300) ?? 0,
    rpm: clamp(value.rpm, 0, 1) ?? 0,
    gear: Math.round(clamp(value.gear, 0, 12) ?? 0),
    engine: clamp(value.engine, 0, 100) ?? 100,
    body: clamp(value.body, 0, 100) ?? 100,
    lights: Math.round(clamp(value.lights, 0, 2) ?? 0),
  };
  const fuel = clamp(value.fuel, 0, 100);
  const altitude = clamp(value.altitude, -1000, 100000);

  if (fuel !== undefined) vehicle.fuel = fuel;
  if (altitude !== undefined) vehicle.altitude = altitude;
  if (typeof value.seatbelt === "boolean") vehicle.seatbelt = value.seatbelt;
  if (typeof value.cruise === "boolean") vehicle.cruise = value.cruise;

  return vehicle;
}

function readVoice(value: Record<string, unknown>): VoiceData {
  const voice: VoiceData = { enabled: value.enabled === true, talking: value.talking === true, radioTalking: value.radioTalking === true };
  const mode = text(value.mode, 24);
  const level = clamp(value.level, 1, 3);
  const radio = clamp(value.radio, 0, 100000);

  if (mode) voice.mode = mode;
  if (level !== undefined) voice.level = Math.round(level);
  if (radio !== undefined && radio > 0) voice.radio = Math.round(radio * 100) / 100;
  // Talking on a radio needs a radio.
  if (voice.radio === undefined) voice.radioTalking = false;

  return voice;
}

function readLocation(value: Record<string, unknown>): LocationData | null {
  const heading = clamp(value.heading, 0, 360);

  if (heading === undefined) {
    return null;
  }

  const location: LocationData = {
    heading,
    street: text(value.street) ?? "",
    zone: text(value.zone) ?? "",
    hours: Math.round(clamp(value.hours, 0, 23) ?? 0),
    minutes: Math.round(clamp(value.minutes, 0, 59) ?? 0),
  };
  const crossing = text(value.crossing);

  if (crossing) location.crossing = crossing;

  return location;
}

function readStatuses(value: unknown[]): CustomStatus[] {
  const statuses: CustomStatus[] = [];

  for (const entry of value.slice(0, MAX_ENTRIES)) {
    if (!isObject(entry)) continue;

    const name = text(entry.name, 32);
    const label = text(entry.label, 32);
    const amount = clamp(entry.value, 0, 100);

    if (name && /^[A-Za-z0-9_-]+$/.test(name) && label && amount !== undefined) {
      statuses.push({ name, label, icon: text(entry.icon, 48) ?? "circle", color: isHex(entry.color) ? entry.color : "#a78bfa", value: amount });
    }
  }

  return statuses;
}

export function handleMessage(message: NuiMessage): void {
  const payload = message.payload;

  switch (message.action) {
    case NuiAction.Config: {
      if (!isObject(payload)) return;

      const owner = readOwner(payload.owner);
      const labels = isObject(payload.labels) ? flattenLabels(payload.labels) : {};

      applyTheme(isObject(payload.theme) ? (payload.theme as unknown as ThemeConfig) : undefined);
      useHud.setState({
        ready: true,
        owner,
        labels,
        locale: text(payload.locale, 16) ?? "en",
        accountLabels: stringMap(payload.accounts),
        needLabels: stringMap(payload.needs),
        settings: parseSettings(typeof payload.settings === "string" ? payload.settings : null, ownerDefaults(owner)),
      });

      return;
    }
    case NuiAction.Visible:
      if (isObject(payload)) useHud.setState({ visible: payload.visible === true });
      return;
    case NuiAction.Editor:
      if (isObject(payload)) useHud.setState({ editing: payload.open === true });
      return;
    case NuiAction.Player:
      if (isObject(payload)) useHud.setState({ player: readPlayer(payload) });
      return;
    case NuiAction.Needs: {
      const needs = numberMap(payload, 0, 100);

      if (needs) useHud.setState({ needs });
      return;
    }
    case NuiAction.Money: {
      const money = numberMap(payload, -1e15, 1e15);

      if (money) useHud.setState({ money });
      return;
    }
    case NuiAction.Identity: {
      if (!isObject(payload)) return;

      const identity: IdentityData = { id: Math.round(clamp(payload.id, 0, 65535) ?? 0) };
      const job = readRole(payload.job);
      const gang = readRole(payload.gang);

      if (job) identity.job = job;
      if (gang) identity.gang = gang;

      useHud.setState({ identity });
      return;
    }
    case NuiAction.Voice:
      if (isObject(payload)) useHud.setState({ voice: readVoice(payload) });
      return;
    case NuiAction.Vehicle:
      if (isObject(payload)) useHud.setState({ vehicle: readVehicle(payload) });
      return;
    case NuiAction.Location:
      if (isObject(payload)) useHud.setState({ location: readLocation(payload) });
      return;
    case NuiAction.Weapon:
      if (isObject(payload)) {
        useHud.setState({
          weapon: payload.armed === true ? { armed: true, clip: Math.round(clamp(payload.clip, 0, 9999) ?? 0), total: Math.round(clamp(payload.total, 0, 99999) ?? 0) } : null,
        });
      }
      return;
    case NuiAction.Statuses:
      if (Array.isArray(payload)) useHud.setState({ statuses: readStatuses(payload) });
      else if (isObject(payload) && Object.keys(payload).length === 0) useHud.setState({ statuses: [] });
      return;
    default:
      return;
  }
}

export function installMessages(): () => void {
  const onMessage = (event: MessageEvent) => {
    if (isObject(event.data) && typeof event.data.action === "string") {
      handleMessage(event.data as unknown as NuiMessage);
    }
  };

  window.addEventListener("message", onMessage);

  return () => window.removeEventListener("message", onMessage);
}

/** A label from the locale, or the fallback. */
export function label(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

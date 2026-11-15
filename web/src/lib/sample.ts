/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Stand-in data. The editor shows every widget, even one with nothing to show yet, so the player can place it.

import { VehicleKind, type IdentityData, type LocationData, type PlayerData, type VehicleData, type VoiceData, type WeaponData } from "@/types/protocol";

export const SAMPLE_PLAYER: PlayerData = { health: 82, armor: 45, stamina: 64, oxygen: 100, underwater: false, deathState: "Alive" };

export const SAMPLE_NEEDS: Record<string, number> = { hunger: 71, thirst: 38, stress: 12 };

export const SAMPLE_MONEY: Record<string, number> = { cash: 2450, bank: 48210 };

export const SAMPLE_IDENTITY: IdentityData = {
  id: 12,
  job: { name: "police", label: "Police", grade: "Sergeant", onDuty: true },
  gang: { name: "ballas", label: "Ballas", grade: "Member", onDuty: false },
};

export const SAMPLE_VOICE: VoiceData = { enabled: true, talking: true, radioTalking: false, mode: "Normal", level: 2, radio: 101 };

export const SAMPLE_VEHICLE: VehicleData = {
  active: true,
  kind: VehicleKind.Car,
  driver: true,
  speed: 31,
  rpm: 0.62,
  gear: 3,
  fuel: 54,
  engine: 92,
  body: 88,
  seatbelt: false,
  cruise: false,
  lights: 1,
};

export const SAMPLE_LOCATION: LocationData = { heading: 312, street: "Vinewood Blvd", crossing: "Alta St", zone: "Downtown Vinewood", hours: 21, minutes: 47 };

export const SAMPLE_WEAPON: WeaponData = { armed: true, clip: 17, total: 120 };

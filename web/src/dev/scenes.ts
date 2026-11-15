/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Showcase scenes: what the page shows for the README. The preview plays them, and `npm run capture` saves each one
// to .github/assets/<id>.webp, animated when `animated` is set. Add a scene for every screen worth showing.

import * as Sample from "@/lib/sample";
import { NuiAction, type NuiMessage } from "@/types/protocol";

/** One step: a message as Lua would send it, or a click on an element, then a pause. */
export interface SceneStep {
  send?: NuiMessage;
  /** CSS selector of the element to click. */
  click?: string;
  /** Milliseconds before the next step. */
  wait?: number;
}

export interface Scene {
  /** File name of the capture: lowercase, digits and dashes. */
  id: string;
  title: string;
  steps: SceneStep[];
  /** Captured as an animated image of the whole run, instead of a still of the end. */
  animated?: boolean;
  /** CSS selector of the element the capture is cropped to, with a margin. The whole screen when unset. */
  crop?: string;
}

/** A screen area in CSS pixels. */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const msg = (action: NuiAction, payload: unknown): NuiMessage => ({ action, payload }) as NuiMessage;

/** What Lua sends once the player is loaded and driving. */
export const SETUP: SceneStep[] = [
  { send: msg(NuiAction.Visible, { visible: true }) },
  { send: msg(NuiAction.Identity, Sample.SAMPLE_IDENTITY) },
  { send: msg(NuiAction.Voice, Sample.SAMPLE_VOICE) },
  { send: msg(NuiAction.Money, Sample.SAMPLE_MONEY) },
  { send: msg(NuiAction.Statuses, [{ name: "drunk", label: "Drunk", icon: "beer", color: "#facc15", value: 35 }]) },
  { send: msg(NuiAction.Player, Sample.SAMPLE_PLAYER) },
  { send: msg(NuiAction.Needs, Sample.SAMPLE_NEEDS) },
  { send: msg(NuiAction.Location, Sample.SAMPLE_LOCATION) },
  { send: msg(NuiAction.Weapon, { armed: false }) },
  { send: msg(NuiAction.Vehicle, Sample.SAMPLE_VEHICLE), wait: 900 },
];

/** A car speeding up through the gears, one sample every 120 ms. */
const DRIVE: SceneStep[] = Array.from({ length: 30 }, (_, index) => {
  const wave = index / 29;

  return {
    send: msg(NuiAction.Vehicle, { ...Sample.SAMPLE_VEHICLE, speed: 4 + wave * 52, rpm: 0.25 + ((index % 10) / 10) * 0.7, gear: 1 + Math.floor(index / 10) }),
    wait: 120,
  };
});

export const SCENES: Scene[] = [
  { id: "hud-driving", title: "Driving", steps: SETUP },
  {
    id: "hud-on-foot",
    title: "On foot, armed",
    steps: [...SETUP, { send: msg(NuiAction.Vehicle, { active: false }) }, { send: msg(NuiAction.Weapon, Sample.SAMPLE_WEAPON), wait: 900 }],
  },
  {
    id: "hud-low-health",
    title: "Low health",
    steps: [...SETUP, { send: msg(NuiAction.Player, { ...Sample.SAMPLE_PLAYER, health: 18 }), wait: 1200 }],
  },
  { id: "hud-editor", title: "Editor", steps: [...SETUP, { send: msg(NuiAction.Editor, { open: true }), wait: 900 }] },
  {
    id: "hud-presets",
    title: "Switching presets",
    animated: true,
    steps: [
      ...SETUP,
      { send: msg(NuiAction.Editor, { open: true }), wait: 900 },
      { click: '[data-tab="look"]', wait: 900 },
      { click: '[data-preset="sport"]', wait: 1100 },
      { click: '[data-preset="classic"]', wait: 1100 },
      { click: '[data-preset="minimal"]', wait: 1100 },
      { click: '[data-preset="neon"]', wait: 1100 },
    ],
  },
  { id: "hud-drive", title: "Speeding up", animated: true, steps: [...SETUP, ...DRIVE, { wait: 600 }] },
];


/**
 * Plays a scene through `send`. Resolves after the last step's pause, with the area the crop element covered after
 * any step, or null without a crop or when it never showed.
 */
export async function playScene(scene: Scene, send: (message: NuiMessage) => void): Promise<Area | null> {
  let area: Area | null = null;

  for (const step of scene.steps) {
    if (step.send) {
      send(step.send);
    }

    if (step.click) {
      document.querySelector<HTMLElement>(step.click)?.click();
    }

    await new Promise((resolve) => setTimeout(resolve, step.wait ?? 0));

    const box = scene.crop ? document.querySelector(scene.crop)?.getBoundingClientRect() : undefined;

    if (box && box.width > 0) {
      const left = Math.min(area?.x ?? box.left, box.left);
      const top = Math.min(area?.y ?? box.top, box.top);
      const right = Math.max(area ? area.x + area.width : box.right, box.right);
      const bottom = Math.max(area ? area.y + area.height : box.bottom, box.bottom);

      area = { x: left, y: top, width: right - left, height: bottom - top };
    }
  }

  return area;
}

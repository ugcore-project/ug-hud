/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Editor snapping and widget anchors. Positions and sizes are fractions of the screen.
//
// A widget hangs from the screen edge it is closest to, so it grows away from that edge when it gets wider:
// x below 0.5 is its left edge, above 0.5 its right edge, exactly 0.5 its center. Same for y with top and bottom.

export interface Guides {
  x?: number;
  y?: number;
}

export type Anchor = "start" | "center" | "end";

const GRID = 0.005;
const SNAP = 0.012;

export function anchorOf(value: number): Anchor {
  if (value === 0.5) return "center";

  return value < 0.5 ? "start" : "end";
}

/** Snaps a top-left position: the widget's center to the screen's center, then to the grid. */
export function snapPosition(x: number, y: number, width: number, height: number): { x: number; y: number; guides: Guides } {
  const guides: Guides = {};
  let nextX = Math.round(x / GRID) * GRID;
  let nextY = Math.round(y / GRID) * GRID;

  if (Math.abs(x + width / 2 - 0.5) < SNAP) {
    nextX = 0.5 - width / 2;
    guides.x = 0.5;
  }

  if (Math.abs(y + height / 2 - 0.5) < SNAP) {
    nextY = 0.5 - height / 2;
    guides.y = 0.5;
  }

  return { x: nextX, y: nextY, guides };
}

/** The stored value for a widget whose near edge sits at `start`: its start edge, its end edge, or 0.5 when centered. */
export function toAnchored(start: number, size: number, centered: boolean): number {
  if (centered) {
    return 0.5;
  }

  return start + size / 2 < 0.5 ? Math.min(start, 0.499) : Math.max(start + size, 0.501);
}


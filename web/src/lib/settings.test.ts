/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { describe, expect, it } from "vitest";
import { clock, delta, direction, gear, speed } from "@/lib/format";
import { iconFor } from "@/lib/icons";
import { DEFAULT_LOOK, PRESETS, WIDGETS, applyPreset, defaultSettings, exportCode, importCode, parseSettings, readLook, type OwnerLook } from "@/lib/settings";
import { anchorOf, snapPosition, toAnchored } from "@/lib/snap";
import { collectStatuses, type StatusSources } from "@/lib/statuses";
import { Minimap, Preset, SpeedUnit } from "@/types/protocol";

const OWNER = { preset: Preset.Neon, speedUnit: SpeedUnit.Kmh, minimap: Minimap.Vehicle };

describe("settings", () => {
  it("falls back to the owner's defaults on broken input", () => {
    const base = defaultSettings(OWNER);

    expect(parseSettings("{not json", OWNER)).toEqual(base);
    expect(parseSettings("[1,2]", OWNER)).toEqual(base);
    expect(parseSettings(null, OWNER)).toEqual(base);
    expect(parseSettings(42, OWNER)).toEqual(base);
  });

  it("clamps numbers and drops unknown values", () => {
    const parsed = parseSettings(
      {
        version: 2,
        preset: "hacker",
        accent: "red; background:url(x)",
        scale: 99,
        speedUnit: "lightyears",
        widgets: { status: { x: -5, y: 7, scale: 0, opacity: 3, visible: "yes", style: "evil" }, nope: { x: 0.5 } },
        statuses: { "bad name!": { visible: false }, drunk: { visible: false, color: "#zzzzzz" } },
        extra: "kept?",
      },
      OWNER,
    );

    expect(parsed.preset).toBe(Preset.Neon);
    expect(parsed.accent).toBe(PRESETS[Preset.Neon].accent);
    expect(parsed.scale).toBe(1.6);
    expect(parsed.speedUnit).toBe(SpeedUnit.Kmh);
    expect(parsed.widgets.status).toMatchObject({ x: 0, y: 1, scale: 0.5, opacity: 1, visible: true, style: "rings" });
    expect(Object.keys(parsed.widgets)).toEqual([...WIDGETS]);
    expect(parsed.statuses).toEqual({ drunk: { visible: false } });
    expect("extra" in parsed).toBe(false);
  });

  it("drops positions of older layouts and keeps the rest", () => {
    const old = parseSettings({ version: 1, accent: "#123456", widgets: { money: { x: 0.8, y: 0.03, style: "plain" } } }, OWNER);
    const base = defaultSettings(OWNER);

    expect(old.version).toBe(2);
    expect(old.accent).toBe("#123456");
    expect(old.widgets.money).toMatchObject({ x: base.widgets.money.x, y: base.widgets.money.y, style: "plain" });
  });

  it("defaults to the ug-core blue and hangs widgets from their corner", () => {
    const base = defaultSettings(OWNER);

    expect(base.accent).toBe("#8b5cf6");
    expect(base.widgets.money.x).toBeGreaterThan(0.5);
    expect(base.widgets.speedometer.y).toBeGreaterThan(0.5);
    expect(base.widgets.clock.x).toBeLessThan(0.5);
    expect(base.widgets.compass.x).toBe(0.5);
  });

  it("caps the number of statuses", () => {
    const statuses: Record<string, unknown> = {};

    for (let index = 0; index < 500; index++) statuses[`s${index}`] = { visible: false };

    expect(Object.keys(parseSettings({ statuses }, OWNER).statuses)).toHaveLength(48);
  });

  it("keeps positions when the preset changes", () => {
    const base = defaultSettings(OWNER);
    const moved = { ...base, widgets: { ...base.widgets, money: { ...base.widgets.money, x: 0.1, y: 0.2 } } };
    const sport = applyPreset(moved, Preset.Sport);

    expect(sport.widgets.money).toMatchObject({ x: 0.1, y: 0.2, style: PRESETS[Preset.Sport].styles.money });
    expect(sport.accent).toBe(PRESETS[Preset.Sport].accent);
  });

  it("round trips export codes and rejects anything else", () => {
    const settings = { ...defaultSettings(OWNER), accent: "#123456", clock24: false };

    expect(importCode(exportCode(settings), OWNER)).toEqual(settings);
    expect(importCode("hello", OWNER)).toBeNull();
    expect(importCode("UGHUD1:!!!", OWNER)).toBeNull();
    expect(importCode(`UGHUD1:${btoa("[1]")}`, OWNER)).toBeNull();
    expect(importCode(`UGHUD1:${"A".repeat(50000)}`, OWNER)).toBeNull();
  });
});

describe("statuses", () => {
  const sources = (change: Partial<StatusSources> = {}): StatusSources => ({
    player: { health: 100, armor: 0, stamina: 100, oxygen: 100, underwater: false, deathState: "Alive" },
    needs: { stress: 90, thirst: 100, hunger: 15 },
    statuses: [{ name: "drunk", label: "Drunk", icon: "beer", color: "#facc15", value: 40 }],
    labels: {},
    needLabels: { hunger: "Hunger" },
    ...change,
  });

  it("lists core statuses, needs and custom ones, with oxygen only underwater", () => {
    const names = collectStatuses(sources(), defaultSettings(OWNER)).map((entry) => entry.name);

    expect(names).toEqual(["health", "armor", "stamina", "hunger", "thirst", "stress", "drunk"]);
  });

  it("warns low, or high for stress", () => {
    const entries = collectStatuses(sources(), defaultSettings(OWNER));

    expect(entries.find((entry) => entry.name === "hunger")?.warn).toBe(true);
    expect(entries.find((entry) => entry.name === "stress")?.warn).toBe(true);
    expect(entries.find((entry) => entry.name === "thirst")?.warn).toBe(false);
  });

  it("smart hide drops full bars and empty armor, hidden ones stay out, colors apply", () => {
    const settings = { ...defaultSettings(OWNER), smartHide: true, statuses: { drunk: { visible: false }, hunger: { visible: true, color: "#000000" } } };
    const entries = collectStatuses(sources(), settings);

    expect(entries.map((entry) => entry.name)).toEqual(["hunger", "stress"]);
    expect(entries[0]?.color).toBe("#000000");
    expect(collectStatuses(sources(), settings, true)).toHaveLength(8);
  });
});

describe("owner config", () => {
  const look = (change: Partial<OwnerLook> = {}, editor: Partial<OwnerLook["editor"]> = {}): OwnerLook => ({
    ...DEFAULT_LOOK,
    ...change,
    editor: { ...DEFAULT_LOOK.editor, ...editor },
  });
  const owned = (value: OwnerLook) => ({ ...OWNER, look: value });

  it("starts players on the owner's look", () => {
    const widgets = { ...DEFAULT_LOOK.widgets, clock: { ...DEFAULT_LOOK.widgets.clock, x: 0.3, scale: 1.4, style: "plain" }, weapon: { ...DEFAULT_LOOK.widgets.weapon, enabled: false } };
    const base = defaultSettings(owned(look({ defaults: { ...DEFAULT_LOOK.defaults, accent: "#123456", clock24: false, scale: 1.2 }, widgets })));

    expect(base).toMatchObject({ accent: "#123456", clock24: false, scale: 1.2 });
    expect(base.widgets.clock).toMatchObject({ x: 0.3, scale: 1.4, style: "plain" });
    expect(base.widgets.weapon.visible).toBe(false);
    // The owner's style is for the owner's preset only.
    expect(applyPreset(base, Preset.Sport).widgets.clock.style).toBe(PRESETS[Preset.Sport].styles.clock);
  });

  it("enforces locks on saved settings and imported codes", () => {
    const saved = { version: 2, preset: Preset.Sport, accent: "#ffffff", scale: 1.5, widgets: { money: { x: 0.2, y: 0.4, scale: 2, style: "plain" } }, statuses: { hunger: { visible: false, color: "#000000" } } };
    const base = defaultSettings(owned(look({}, { move: false, styles: false, colors: false })));
    const parsed = parseSettings(saved, owned(look({}, { move: false, styles: false, colors: false })));

    expect(parsed.preset).toBe(Preset.Neon);
    expect(parsed.accent).toBe(base.accent);
    expect(parsed.scale).toBe(base.scale);
    expect(parsed.widgets.money).toEqual(base.widgets.money);
    expect(parsed.statuses.hunger).toEqual({ visible: false });

    expect(parseSettings(saved, owned(look({}, { presets: [Preset.Neon, Preset.Classic] }))).preset).toBe(Preset.Neon);
    expect(parseSettings(saved, owned(look({}, { enabled: false })))).toEqual(defaultSettings(owned(look({}, { enabled: false }))));
    expect(importCode(exportCode(parseSettings(saved, OWNER)), owned(look({}, { styles: false })))?.preset).toBe(Preset.Neon);
  });

  it("keeps a disabled widget hidden, whatever the save says", () => {
    const widgets = { ...DEFAULT_LOOK.widgets, compass: { ...DEFAULT_LOOK.widgets.compass, enabled: false } };

    expect(parseSettings({ version: 2, widgets: { compass: { visible: true } } }, owned(look({ widgets }))).widgets.compass.visible).toBe(false);
  });

  it("reads the look from Lua and falls back per field", () => {
    expect(readLook(null)).toEqual(DEFAULT_LOOK);

    const read = readLook({
      defaults: { accent: "red", scale: 9 },
      widgets: { status: { x: 2, style: "nope", enabled: false } },
      cinematicWidgets: ["compass", "<b>"],
      statusColors: { health: "#000000", "bad name": "#111111", armor: "blue" },
      alerts: { lowHealth: 50, inverted: ["drunk", 5] },
      editor: { presets: ["sport", "x"], accents: ["#ffffff", "x"], codes: false },
    });

    expect(read.defaults).toMatchObject({ accent: "", scale: 1.6 });
    expect(read.widgets.status).toMatchObject({ x: 1, style: "", enabled: false });
    expect(read.cinematicWidgets).toEqual(["compass"]);
    expect(read.statusColors).toEqual({ health: "#000000" });
    expect(read.alerts).toMatchObject({ lowHealth: 50, lowStatus: 20, inverted: ["drunk"] });
    expect(read.editor).toMatchObject({ presets: [Preset.Sport], accents: ["#ffffff"], codes: false, move: true });
  });

  it("uses the owner's colors and warning levels for bars", () => {
    const player = { health: 40, armor: 0, stamina: 100, oxygen: 100, underwater: false, deathState: "Alive" };
    const sources = { player, needs: { drunk: 90 }, statuses: [], labels: {}, needLabels: {}, colors: { health: "#010101" }, alerts: { ...DEFAULT_LOOK.alerts, lowStatus: 50, inverted: ["drunk"] } };
    const entries = collectStatuses(sources, defaultSettings(OWNER));

    expect(entries.find((entry) => entry.name === "health")).toMatchObject({ color: "#010101", warn: true });
    expect(entries.find((entry) => entry.name === "drunk")?.warn).toBe(true);
  });
});

describe("helpers", () => {
  it("formats speed, time, direction and gears", () => {
    expect(speed(10, SpeedUnit.Kmh)).toBe(36);
    expect(speed(10, SpeedUnit.Mph)).toBe(22);
    expect(clock(0, 5, false)).toBe("12:05 AM");
    expect(clock(13, 30, false)).toBe("1:30 PM");
    expect(clock(7, 3, true)).toBe("07:03");
    expect(direction(0)).toBe("N");
    expect(direction(359)).toBe("N");
    expect(direction(90)).toBe("E");
    expect(direction(225)).toBe("SW");
    expect(gear(0, 3)).toBe("R");
    expect(gear(1, 0)).toBe("N");
    expect(gear(4, 20)).toBe("4");
    expect(delta(-40, "en")).toBe("-$40");
  });

  it("snaps to the center and the grid", () => {
    expect(snapPosition(0.45, 0.2013, 0.1, 0.1)).toEqual({ x: 0.45, y: 0.2, guides: { x: 0.5 } });
    expect(snapPosition(0.1013, 0.3, 0.1, 0.1).x).toBeCloseTo(0.1);
  });

  it("stores the edge nearest to the screen side", () => {
    expect(toAnchored(0.1, 0.1, false)).toBe(0.1);
    expect(toAnchored(0.8, 0.1, false)).toBeCloseTo(0.9);
    expect(toAnchored(0.3, 0.2, true)).toBe(0.5);
    expect(anchorOf(toAnchored(0.45, 0.04, false))).toBe("start");
    expect(anchorOf(toAnchored(0.47, 0.1, false))).toBe("end");
    expect(anchorOf(0.5)).toBe("center");
  });

  it("finds icons and falls back to a dot", () => {
    expect(iconFor("hunger")).toBe(iconFor("utensils"));
    expect(iconFor("fa-solid fa-beer")).toBe(iconFor("beer"));
    expect(iconFor("unknown")).toBe(iconFor(undefined));
  });
});

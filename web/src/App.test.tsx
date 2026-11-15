/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { flattenLabels } from "@/lib/labels";
import { exportCode, parseSettings } from "@/lib/settings";
import { handleMessage, resetHud, useHud } from "@/store/hudStore";
import { Minimap, NuiAction, Preset, SpeedUnit } from "@/types/protocol";

MotionGlobalConfig.skipAnimations = true;

const nui = vi.hoisted(() => ({
  isEnvBrowser: () => false,
  sendReady: vi.fn(),
  sendViewport: vi.fn(),
  sendSave: vi.fn(async (_settings: string) => true),
  sendClose: vi.fn(),
}));

vi.mock("@/lib/nui", () => nui);

const readLocale = (code: string) => JSON.parse(readFileSync(`../locales/${code}.json`, "utf8")) as Record<string, unknown>;
const LABELS = flattenLabels(readLocale("en").page as Record<string, unknown>);
const OWNER = { preset: Preset.Neon, speedUnit: SpeedUnit.Kmh, minimap: Minimap.Vehicle };

const send = (action: string, payload?: unknown) => act(() => handleMessage({ action: action as NuiAction, payload }));

function configure(settings?: string, owner: Record<string, unknown> = {}) {
  send(NuiAction.Config, {
    owner: { preset: "neon", speedUnit: "kmh", minimap: "vehicle", accounts: ["cash", "bank"], fuel: true, seatbelt: true, cruise: true, voice: true, editorKey: "I", ...owner },
    labels: readLocale("en").page,
    locale: "en",
    accounts: { cash: "Cash", bank: "Bank" },
    needs: { hunger: "Hunger" },
    ...(settings ? { settings } : {}),
  });
  send(NuiAction.Visible, { visible: true });
}

const widget = (id: string) => document.querySelector(`[data-widget="${id}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  act(() => resetHud());
});

describe("hud", () => {
  it("renders nothing until configured, then signals ready once", () => {
    render(<App />);

    expect(nui.sendViewport).toHaveBeenCalledTimes(1);
    expect(nui.sendReady).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-visible]")).toBeNull();
  });

  it("shows widgets only when they have data", () => {
    render(<App />);
    configure();
    send(NuiAction.Player, { health: 80, armor: 10, stamina: 50, oxygen: 100, underwater: false, deathState: "Alive" });

    expect(widget("status")).not.toBeNull();
    expect(widget("speedometer")).toBeNull();
    expect(widget("weapon")).toBeNull();

    send(NuiAction.Vehicle, { active: true, kind: "car", driver: true, speed: 10, rpm: 0.5, gear: 2, fuel: 40, engine: 100, body: 100, lights: 0, seatbelt: false });
    send(NuiAction.Weapon, { armed: true, clip: 12, total: 60 });

    expect(document.querySelector("[data-speed]")?.textContent).toBe("36");
    expect(document.querySelector('[data-indicator="seatbelt"]')?.getAttribute("data-on")).toBe("false");
    expect(widget("weapon")?.querySelector("[data-clip]")?.getAttribute("data-clip")).toBe("12");

    send(NuiAction.Vehicle, { active: false });
    send(NuiAction.Weapon, { armed: false });

    expect(widget("speedometer")).toBeNull();
    expect(widget("weapon")).toBeNull();
  });

  it("follows the saved layout: hidden widgets, styles and units", () => {
    const settings = parseSettings({ speedUnit: "mph", widgets: { status: { visible: false }, speedometer: { style: "digital" } } }, OWNER);

    render(<App />);
    configure(JSON.stringify(settings));
    send(NuiAction.Player, { health: 80, armor: 10, stamina: 50, oxygen: 100, underwater: false, deathState: "Alive" });
    send(NuiAction.Vehicle, { active: true, kind: "car", driver: true, speed: 10, rpm: 0.5, gear: 2, engine: 100, body: 100, lights: 0 });

    expect(widget("status")).toBeNull();
    expect(document.querySelector("[data-speed]")?.textContent).toBe("022");
  });

  it("shows the voice range, talking and the radio", () => {
    render(<App />);
    configure();
    send(NuiAction.Voice, { enabled: true, talking: false, radioTalking: false, mode: "Whisper", level: 1 });

    const voice = () => widget("voice");

    expect(voice()?.querySelector("[data-level]")?.getAttribute("data-level")).toBe("1");
    expect(voice()?.querySelectorAll('[data-on="true"]')).toHaveLength(1);
    expect(voice()?.querySelector("[data-talking]")?.getAttribute("data-talking")).toBe("false");
    expect(voice()?.querySelector("[data-radio]")).toBeNull();
    expect(voice()?.querySelector("[data-mode-color]")).toBeNull();

    send(NuiAction.Voice, { enabled: true, talking: true, radioTalking: false, mode: "Whispering", level: 1 });

    // Talking colors the mode text by range: whisper sky, shouting orange.
    expect(voice()?.querySelector("[data-mode-color]")?.getAttribute("style")).toContain("rgb(56, 189, 248)");

    send(NuiAction.Voice, { enabled: true, talking: true, radioTalking: false, mode: "Shouting", level: 9, radio: 101.456 });

    expect(voice()?.querySelector("[data-mode-color]")?.getAttribute("data-mode-color")).toBe("3");
    expect(voice()?.querySelector("[data-mode-color]")?.getAttribute("style")).toContain("rgb(249, 115, 22)");

    expect(voice()?.querySelector("[data-level]")?.getAttribute("data-level")).toBe("3");
    expect(voice()?.querySelector("[data-talking]")?.getAttribute("data-talking")).toBe("true");
    expect(voice()?.querySelectorAll(".ug-hud-ripple").length).toBeGreaterThan(0);
    expect(voice()?.querySelector("[data-radio]")?.getAttribute("data-radio")).toBe("101.46");
    expect(voice()?.querySelector("[data-radio]")?.getAttribute("data-live")).toBe("false");

    send(NuiAction.Voice, { enabled: true, talking: true, radioTalking: true, level: 2, radio: 101 });

    expect(voice()?.querySelector("[data-talking]")?.getAttribute("data-talking")).toBe("false");
    expect(voice()?.querySelector("[data-radio]")?.getAttribute("data-live")).toBe("true");

    send(NuiAction.Voice, { enabled: true, talking: false, radioTalking: true, radio: 0 });

    expect(voice()?.querySelector("[data-radio]")).toBeNull();
  });

  it("shows money changes as floaters", async () => {
    render(<App />);
    configure();
    send(NuiAction.Money, { cash: 100, bank: 500 });
    send(NuiAction.Money, { cash: 350, bank: 500 });

    await waitFor(() => expect(document.querySelector('[data-floater="250"]')).not.toBeNull());
    expect(screen.getByText("+$250")).toBeTruthy();
  });

  it("shows the low health vignette and hides everything when dead", () => {
    render(<App />);
    configure();
    send(NuiAction.Player, { health: 12, armor: 0, stamina: 100, oxygen: 100, underwater: false, deathState: "Alive" });

    expect(document.querySelector('[data-effect="vignette"]')).not.toBeNull();

    send(NuiAction.Player, { health: 0, armor: 0, stamina: 100, oxygen: 100, underwater: false, deathState: "Dead" });

    expect(widget("status")).toBeNull();
  });

  it("cinematic mode adds bars and keeps only the essentials", () => {
    render(<App />);
    configure(JSON.stringify(parseSettings({ cinematic: true }, OWNER)));
    send(NuiAction.Player, { health: 80, armor: 10, stamina: 50, oxygen: 100, underwater: false, deathState: "Alive" });
    send(NuiAction.Identity, { id: 3 });

    expect(document.querySelector('[data-effect="letterbox"]')).not.toBeNull();
    expect(widget("status")).not.toBeNull();
    expect(widget("identity")).toBeNull();
  });
});

describe("editor", () => {
  function openEditor(settings?: string) {
    render(<App />);
    configure(settings);
    send(NuiAction.Editor, { open: true });
  }

  it("shows every widget with sample data, even without game data", () => {
    openEditor();

    for (const id of ["status", "money", "identity", "voice", "speedometer", "compass", "clock", "weapon"]) {
      expect(widget(id)).not.toBeNull();
    }

    expect(screen.getByText(LABELS["editor.title"] ?? "")).toBeTruthy();
  });

  it("edits a draft and saves it as JSON", async () => {
    openEditor();
    fireEvent.click(document.querySelector('[data-row="money"] [aria-pressed]') as Element);

    expect(useHud.getState().settings.widgets.money.visible).toBe(true);

    fireEvent.click(document.querySelector('[data-action="save"]') as Element);

    await waitFor(() => expect(nui.sendClose).toHaveBeenCalled());
    const saved = JSON.parse(nui.sendSave.mock.calls[0]?.[0] ?? "{}") as { widgets: { money: { visible: boolean } } };

    expect(saved.widgets.money.visible).toBe(false);
    expect(useHud.getState().settings.widgets.money.visible).toBe(false);
    expect(useHud.getState().editing).toBe(false);
  });

  it("keeps the editor open when Lua refuses the save", async () => {
    nui.sendSave.mockResolvedValueOnce(false);
    openEditor();
    fireEvent.click(document.querySelector('[data-action="save"]') as Element);

    await waitFor(() => expect(document.querySelector('[data-notice="false"]')).not.toBeNull());
    expect(nui.sendClose).not.toHaveBeenCalled();
  });

  it("Escape cancels without saving", () => {
    openEditor();
    fireEvent.click(document.querySelector('[data-row="clock"] [aria-pressed]') as Element);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(nui.sendSave).not.toHaveBeenCalled();
    expect(nui.sendClose).toHaveBeenCalled();
    expect(useHud.getState().settings.widgets.clock.visible).toBe(true);
  });

  it("arrows nudge the selected widget", () => {
    openEditor();
    const before = useHud.getState().settings.widgets.clock.x;

    fireEvent.click(screen.getByRole("button", { name: LABELS["widget.clock"] ?? "" }));
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    fireEvent.click(document.querySelector('[data-action="save"]') as Element);

    const saved = JSON.parse(nui.sendSave.mock.calls[0]?.[0] ?? "{}") as { widgets: { clock: { x: number } } };

    expect(saved.widgets.clock.x).toBeCloseTo(before + 0.025);
  });

  it("arrows never push a widget across the middle", () => {
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: LABELS["widget.money"] ?? "" }));

    for (let index = 0; index < 40; index++) fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });

    fireEvent.click(document.querySelector('[data-action="save"]') as Element);

    const saved = JSON.parse(nui.sendSave.mock.calls[0]?.[0] ?? "{}") as { widgets: { money: { x: number } } };

    expect(saved.widgets.money.x).toBe(0.501);
  });

  it("applies presets and imports codes, and rejects bad ones", () => {
    openEditor();
    fireEvent.click(document.querySelector('[data-tab="look"]') as Element);
    fireEvent.click(document.querySelector(`[data-preset="${Preset.Sport}"]`) as Element);

    expect(document.querySelector(`[data-preset="${Preset.Sport}"]`)?.className).toContain("border-[var(--hud-accent)]");

    fireEvent.click(document.querySelector('[data-tab="options"]') as Element);
    const box = screen.getByPlaceholderText(LABELS["editor.codePlaceholder"] ?? "");

    fireEvent.change(box, { target: { value: "garbage" } });
    fireEvent.click(screen.getByText(LABELS["editor.import"] ?? ""));
    expect(document.querySelector('[data-notice="false"]')).not.toBeNull();

    fireEvent.change(box, { target: { value: exportCode(parseSettings({ clock24: false }, OWNER)) } });
    fireEvent.click(screen.getByText(LABELS["editor.import"] ?? ""));
    expect(document.querySelector('[data-notice="true"]')).not.toBeNull();
  });
});

describe("owner config", () => {
  const look = (editor: Record<string, unknown>, widgets: Record<string, unknown> = {}) => ({ editor, widgets });

  it("never shows a widget the owner turned off, not even in the editor", () => {
    render(<App />);
    configure(undefined, { look: look({}, { compass: { enabled: false } }) });
    send(NuiAction.Location, { heading: 90, street: "A", zone: "B", hours: 10, minutes: 5 });

    expect(widget("compass")).toBeNull();
    expect(widget("clock")).not.toBeNull();

    send(NuiAction.Editor, { open: true });

    expect(widget("compass")).toBeNull();
    expect(document.querySelector('[data-row="compass"]')).toBeNull();
  });

  it("hides the editor controls the owner locked", () => {
    render(<App />);
    configure(undefined, { look: look({ presets: ["neon", "classic"], accents: ["#ffffff"], colors: false, codes: false }) });
    send(NuiAction.Editor, { open: true });
    fireEvent.click(document.querySelector('[data-tab="look"]') as Element);

    expect(document.querySelectorAll("[data-preset]")).toHaveLength(2);
    expect(screen.queryByText(LABELS["editor.accent"] ?? "")).toBeNull();

    fireEvent.click(document.querySelector('[data-tab="options"]') as Element);

    expect(screen.queryByText(LABELS["editor.share"] ?? "")).toBeNull();
  });

  it("drops the look tab when players may change nothing there", () => {
    render(<App />);
    configure(undefined, { look: look({ move: false, styles: false, colors: false }) });
    send(NuiAction.Editor, { open: true });

    expect(document.querySelector('[data-tab="look"]')).toBeNull();
    expect(document.querySelector('[data-tab="layout"]')).not.toBeNull();
  });
});

describe("messages", () => {
  it("drops hostile payloads", () => {
    send(NuiAction.Config, { owner: "x", labels: [], settings: 5 });
    send(NuiAction.Player, "nope");
    send(NuiAction.Player, { health: 1e9, armor: Number.NaN, stamina: -50 });
    send(NuiAction.Needs, { hunger: "full", thirst: 500, ["x".repeat(64)]: 5 });
    send(NuiAction.Statuses, [{ name: "<script>", label: "x", value: 5 }, { name: "ok", label: "Ok", value: 50, color: "url(x)" }, 7]);
    send(NuiAction.Identity, { id: -5, job: { name: "x" } });
    send("unknown", {});

    const state = useHud.getState();

    expect(state.owner.preset).toBe(Preset.Neon);
    expect(state.player).toMatchObject({ health: 100, armor: 0, stamina: 0 });
    expect(state.needs).toEqual({ thirst: 100 });
    expect(state.statuses).toEqual([{ name: "ok", label: "Ok", icon: "circle", color: "#a78bfa", value: 50 }]);
    expect(state.identity).toEqual({ id: 0 });
  });

  it("treats Lua's empty arrays as empty maps", () => {
    send(NuiAction.Needs, { hunger: 5 });
    send(NuiAction.Needs, []);
    send(NuiAction.Statuses, {});

    expect(useHud.getState().needs).toEqual({});
    expect(useHud.getState().statuses).toEqual([]);
  });

  it("locales have the same keys", () => {
    const keys = (code: string) => Object.keys(flattenLabels(readLocale(code))).sort();

    expect(keys("pt")).toEqual(keys("en"));
  });
});

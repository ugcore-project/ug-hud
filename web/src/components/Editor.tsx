/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// The layout editor. It edits a draft: nothing changes for the player until Save.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { ArrowLeftRight, Check, Eye, EyeOff, RotateCcw, Sparkles, X } from "lucide-react";
import { Section, Segmented, Slider, Toggle } from "@/components/Controls";
import { Hud } from "@/components/Hud";
import { cn } from "@/lib/cn";
import { sendClose, sendSave } from "@/lib/nui";
import { SAMPLE_NEEDS, SAMPLE_PLAYER } from "@/lib/sample";
import {
  PRESETS,
  STYLES,
  WIDGET_NAMES,
  WIDGETS,
  applyPreset,
  defaultSettings,
  exportCode,
  importCode,
  isHex,
  type Settings,
  type WidgetId,
  type WidgetSettings,
} from "@/lib/settings";
import { collectStatuses } from "@/lib/statuses";
import { ownerDefaults, useHud } from "@/store/hudStore";
import { Minimap, SpeedUnit } from "@/types/protocol";

const TABS = ["layout", "look", "statuses", "options"] as const;
type Tab = (typeof TABS)[number];
const NUDGE = 0.005;

/** Moves a position without crossing the middle, where it would switch the edge it hangs from. Centered stays centered. */
function nudge(value: number, step: number): number {
  if (value === 0.5) return value;

  return value < 0.5 ? Math.min(Math.max(value + step, 0), 0.499) : Math.min(Math.max(value + step, 0.501), 1);
}

export function Editor() {
  const saved = useHud((state) => state.settings);
  const owner = useHud((state) => state.owner);
  const labels = useHud((state) => state.labels);
  const player = useHud((state) => state.player);
  const needs = useHud((state) => state.needs);
  const statuses = useHud((state) => state.statuses);
  const needLabels = useHud((state) => state.needLabels);
  const [draft, setDraft] = useState<Settings>(saved);
  const [tab, setTab] = useState<Tab>("layout");
  const [selected, setSelected] = useState<WidgetId | null>(null);
  const [side, setSide] = useState<"left" | "right">("right");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const t = useCallback((key: string, fallback: string) => labels[key] ?? fallback, [labels]);
  // What the owner lets players change. parseSettings enforces it too, so a hidden control is never the only guard.
  const rules = owner.look.editor;
  const widgets = WIDGETS.filter((id) => owner.look.widgets[id].enabled);
  const tabs = TABS.filter((id) => id !== "look" || rules.styles || rules.colors || rules.move);

  const patchWidget = useCallback((id: WidgetId, patch: Partial<WidgetSettings>) => {
    setDraft((current) => ({ ...current, widgets: { ...current.widgets, [id]: { ...current.widgets[id], ...patch } } }));
  }, []);

  const move = useCallback((id: WidgetId, x: number, y: number) => patchWidget(id, { x, y }), [patchWidget]);

  const close = useCallback(() => {
    useHud.setState({ editing: false });
    void sendClose();
  }, []);

  const save = async () => {
    const ok = await sendSave(JSON.stringify(draft));

    if (!ok) {
      setNotice({ ok: false, text: t("editor.saveFailed", "Could not save. Try again.") });
      return;
    }

    useHud.setState({ settings: draft });
    close();
  };

  // Escape cancels, arrows nudge the selected widget, Shift for bigger steps.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "Escape") {
        close();
        return;
      }

      const step = event.shiftKey ? NUDGE * 5 : NUDGE;
      const offset: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const delta = offset[event.key];

      if (selected && delta && rules.move) {
        event.preventDefault();
        setDraft((current) => {
          const widget = current.widgets[selected];
          const x = nudge(widget.x, delta[0]);
          const y = nudge(widget.y, delta[1]);

          return { ...current, widgets: { ...current.widgets, [selected]: { ...widget, x, y } } };
        });
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [close, selected, rules.move]);

  const allStatuses = useMemo(
    () =>
      collectStatuses(
        {
          player: player ?? SAMPLE_PLAYER,
          needs: Object.keys(needs).length > 0 ? needs : SAMPLE_NEEDS,
          statuses,
          labels,
          needLabels,
          colors: owner.look.statusColors,
          alerts: owner.look.alerts,
        },
        draft,
        true,
      ),
    [player, needs, statuses, labels, needLabels, draft, owner.look],
  );

  const widgetName = (id: WidgetId) => t(`widget.${id}`, WIDGET_NAMES[id]);

  return (
    <>
      <Hud settings={draft} editing selected={selected} onSelect={setSelected} onMove={rules.move ? move : undefined} />
      <div className="pointer-events-none fixed inset-0 bg-black/25" />
      <motion.aside
        key={side}
        initial={{ opacity: 0, x: side === "right" ? 24 : -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        style={{ "--hud-accent": draft.accent } as MotionStyle}
        className={cn(
          "fixed top-4 bottom-4 flex w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-background/90 text-white shadow-ug-lg backdrop-blur-xl",
          side === "right" ? "right-4" : "left-4",
        )}
      >
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Sparkles className="h-4 w-4 text-[var(--hud-accent)]" />
          <div className="flex flex-1 flex-col">
            <h2 className="text-sm font-bold">{t("editor.title", "Customize your HUD")}</h2>
            <p className="text-[11px] text-white/45">{t("editor.hint", "Drag widgets to move them. Arrows nudge.")}</p>
          </div>
          <button
            type="button"
            title={t("editor.side", "Move panel")}
            onClick={() => setSide(side === "right" ? "left" : "right")}
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </header>

        <nav className="flex gap-1 border-b border-white/10 p-1.5">
          {tabs.map((id) => (
            <button
              key={id}
              type="button"
              data-tab={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors",
                tab === id ? "bg-white/10 text-white" : "text-white/50 hover:text-white",
              )}
            >
              {t(`editor.tab.${id}`, id[0]?.toUpperCase() + id.slice(1))}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-2">
          {tab === "layout" && (
            <>
              <Section title={t("editor.widgets", "Widgets")}>
                {widgets.map((id) => {
                  const widget = draft.widgets[id];

                  return (
                    <div
                      key={id}
                      data-row={id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5",
                        selected === id ? "bg-white/10 ring-1 ring-[var(--hud-accent)]" : "hover:bg-white/5",
                      )}
                    >
                      <button type="button" className="flex-1 text-left text-sm font-medium" onClick={() => setSelected(id)}>
                        {widgetName(id)}
                      </button>
                      <button
                        type="button"
                        aria-label={t("editor.visible", "Visible")}
                        aria-pressed={widget.visible}
                        onClick={() => patchWidget(id, { visible: !widget.visible })}
                        className={cn("rounded-md p-1", widget.visible ? "text-[var(--hud-accent)]" : "text-white/30")}
                      >
                        {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
              </Section>
              {selected && (
                <Section title={widgetName(selected)}>
                  {rules.styles && (
                    <Segmented
                      label={t("editor.style", "Style")}
                      options={STYLES[selected].map((style) => ({ value: style, label: t(`style.${style}`, style) }))}
                      value={draft.widgets[selected].style}
                      onChange={(style) => patchWidget(selected, { style })}
                    />
                  )}
                  {rules.move && (
                  <>
                  <Slider
                    label={t("editor.size", "Size")}
                    value={draft.widgets[selected].scale}
                    min={0.5}
                    max={2}
                    step={0.05}
                    onChange={(scale) => patchWidget(selected, { scale })}
                  />
                  <Slider
                    label={t("editor.opacity", "Opacity")}
                    value={draft.widgets[selected].opacity}
                    min={0.2}
                    max={1}
                    step={0.05}
                    onChange={(opacity) => patchWidget(selected, { opacity })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = defaultSettings(ownerDefaults(owner)).widgets[selected];

                      patchWidget(selected, { x: fresh.x, y: fresh.y, scale: fresh.scale, opacity: fresh.opacity });
                    }}
                    className="mx-2 mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("editor.resetWidget", "Reset this widget")}
                  </button>
                  </>
                  )}
                </Section>
              )}
            </>
          )}

          {tab === "look" && (
            <>
              {rules.styles && (
              <Section title={t("editor.preset", "Preset")}>
                <div className="grid grid-cols-2 gap-2 px-2">
                  {rules.presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      data-preset={preset}
                      onClick={() => setDraft((current) => applyPreset(current, preset, !rules.colors))}
                      className={cn(
                        "flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all hover:scale-[1.02]",
                        draft.preset === preset ? "border-[var(--hud-accent)] bg-white/10" : "border-white/10 bg-white/5",
                      )}
                    >
                      <span className="h-1.5 w-10 rounded-full" style={{ background: PRESETS[preset].accent, boxShadow: `0 0 10px ${PRESETS[preset].accent}` }} />
                      <span className="text-sm font-bold">{t(`preset.${preset}`, preset[0]?.toUpperCase() + preset.slice(1))}</span>
                    </button>
                  ))}
                </div>
              </Section>
              )}
              {rules.colors && (
              <Section title={t("editor.accent", "Accent color")}>
                <div className="flex flex-wrap gap-2 px-2">
                  {rules.accents.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={color}
                      onClick={() => setDraft((current) => ({ ...current, accent: color }))}
                      className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", draft.accent === color && "ring-2 ring-white ring-offset-2 ring-offset-background")}
                      style={{ background: color }}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label={t("editor.customColor", "Custom color")}
                    value={draft.accent}
                    onChange={(event) => isHex(event.target.value) && setDraft((current) => ({ ...current, accent: event.target.value }))}
                    className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                </div>
              </Section>
              )}
              {rules.move && (
              <Section title={t("editor.scale", "HUD size")}>
                <Slider label={t("editor.scale", "HUD size")} value={draft.scale} min={0.6} max={1.6} step={0.05} onChange={(scale) => setDraft((current) => ({ ...current, scale }))} />
              </Section>
              )}
            </>
          )}

          {tab === "statuses" && (
            <Section title={t("editor.statuses", "Statuses")}>
              {allStatuses.map((status) => {
                const own = draft.statuses[status.name];
                const visible = own?.visible !== false;

                return (
                  <div key={status.name} data-status-row={status.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
                    {rules.colors && (
                    <input
                      type="color"
                      aria-label={status.label}
                      value={status.color}
                      onChange={(event) => {
                        const color = event.target.value;

                        if (isHex(color)) {
                          setDraft((current) => ({ ...current, statuses: { ...current.statuses, [status.name]: { visible, color } } }));
                        }
                      }}
                      className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    />
                    )}
                    <span className="flex-1 text-sm font-medium">{status.label}</span>
                    <button
                      type="button"
                      aria-label={t("editor.visible", "Visible")}
                      aria-pressed={visible}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          statuses: { ...current.statuses, [status.name]: { ...current.statuses[status.name], visible: !visible } },
                        }))
                      }
                      className={cn("rounded-md p-1", visible ? "text-[var(--hud-accent)]" : "text-white/30")}
                    >
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </Section>
          )}

          {tab === "options" && (
            <>
              <Section title={t("editor.display", "Display")}>
                <Segmented
                  label={t("editor.speedUnit", "Speed unit")}
                  options={[
                    { value: SpeedUnit.Kmh, label: "km/h" },
                    { value: SpeedUnit.Mph, label: "mph" },
                  ]}
                  value={draft.speedUnit}
                  onChange={(speedUnit) => setDraft((current) => ({ ...current, speedUnit }))}
                />
                <Segmented
                  label={t("editor.minimap", "Minimap")}
                  options={Object.values(Minimap).map((value) => ({ value, label: t(`minimap.${value}`, value) }))}
                  value={draft.minimap}
                  onChange={(minimap) => setDraft((current) => ({ ...current, minimap }))}
                />
                <Toggle label={t("editor.clock24", "24-hour clock")} checked={draft.clock24} onChange={(clock24) => setDraft((current) => ({ ...current, clock24 }))} />
                <Toggle
                  label={t("editor.cinematic", "Cinematic mode")}
                  hint={t("editor.cinematicHint", "Letterbox bars, only the essentials")}
                  checked={draft.cinematic}
                  onChange={(cinematic) => setDraft((current) => ({ ...current, cinematic }))}
                />
                <Toggle
                  label={t("editor.smartHide", "Smart hide")}
                  hint={t("editor.smartHideHint", "Full bars hide until they change")}
                  checked={draft.smartHide}
                  onChange={(smartHide) => setDraft((current) => ({ ...current, smartHide }))}
                />
                <Toggle
                  label={t("editor.effects", "Effects")}
                  hint={t("editor.effectsHint", "Low health vignette and warning pulses")}
                  checked={draft.effects}
                  onChange={(effects) => setDraft((current) => ({ ...current, effects }))}
                />
                <Toggle label={t("editor.sounds", "Sounds")} checked={draft.sounds} onChange={(sounds) => setDraft((current) => ({ ...current, sounds }))} />
                <Toggle label={t("editor.snap", "Snap to grid")} checked={draft.snap} onChange={(snap) => setDraft((current) => ({ ...current, snap }))} />
              </Section>
              {rules.codes && (
              <Section title={t("editor.share", "Share layout")}>
                <div className="flex flex-col gap-2 px-2">
                  <textarea
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t("editor.codePlaceholder", "Paste a code here, or export yours")}
                    rows={3}
                    maxLength={40000}
                    spellCheck={false}
                    className="resize-none rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-white/80 outline-none focus:border-[var(--hud-accent)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCode(exportCode(draft));
                        setNotice({ ok: true, text: t("editor.exported", "Code ready. Select it and copy it.") });
                      }}
                      className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/15"
                    >
                      {t("editor.export", "Export")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const imported = importCode(code, ownerDefaults(owner));

                        if (imported) {
                          setDraft(imported);
                          setNotice({ ok: true, text: t("editor.imported", "Layout imported. Save to keep it.") });
                        } else {
                          setNotice({ ok: false, text: t("editor.badCode", "That is not a HUD code.") });
                        }
                      }}
                      className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/15"
                    >
                      {t("editor.import", "Import")}
                    </button>
                  </div>
                </div>
              </Section>
              )}
            </>
          )}
        </div>

        {notice && (
          <p data-notice={notice.ok} className={cn("px-4 pb-1 text-xs font-medium", notice.ok ? "text-success" : "text-destructive")}>
            {notice.text}
          </p>
        )}

        <footer className="flex gap-2 border-t border-white/10 p-3">
          <button
            type="button"
            title={t("editor.reset", "Reset everything")}
            onClick={() => {
              setDraft(defaultSettings(ownerDefaults(owner)));
              setNotice({ ok: true, text: t("editor.wasReset", "Back to the server's defaults. Save to keep it.") });
            }}
            className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={close} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 text-sm font-semibold hover:bg-white/15">
            <X className="h-4 w-4" />
            {t("editor.cancel", "Cancel")}
          </button>
          <button
            type="button"
            data-action="save"
            onClick={() => void save()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--hud-accent)] py-2 text-sm font-bold text-black hover:brightness-110"
          >
            <Check className="h-4 w-4" />
            {t("editor.save", "Save")}
          </button>
        </footer>
      </motion.aside>
    </>
  );
}

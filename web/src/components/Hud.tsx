/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { useState, type ReactNode } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { Effects } from "@/components/Effects";
import { Frame } from "@/components/Frame";
import type { Guides } from "@/lib/snap";
import { Compass } from "@/components/widgets/Compass";
import { Identity } from "@/components/widgets/Identity";
import { Money } from "@/components/widgets/Money";
import { Clock, Weapon } from "@/components/widgets/Small";
import { Speedometer } from "@/components/widgets/Speedometer";
import { Status } from "@/components/widgets/Status";
import { Voice } from "@/components/widgets/Voice";
import * as Sample from "@/lib/sample";
import { WIDGETS, WIDGET_NAMES, type Settings, type WidgetId } from "@/lib/settings";
import { collectStatuses } from "@/lib/statuses";
import { useHud } from "@/store/hudStore";

interface HudProps {
  settings: Settings;
  editing: boolean;
  selected?: WidgetId | null;
  onSelect?: ((id: WidgetId) => void) | undefined;
  onMove?: ((id: WidgetId, x: number, y: number) => void) | undefined;
}

export function Hud({ settings, editing, selected = null, onSelect, onMove }: HudProps) {
  const state = useHud();
  const look = state.owner.look;
  const cinematicWidgets: ReadonlySet<WidgetId> = new Set(look.cinematicWidgets);
  const [guides, setGuides] = useState<Guides>({});
  // In the editor every widget has something to show, so it can be placed.
  const sample = <T,>(value: T | null, fallback: T): T | null => value ?? (editing ? fallback : null);
  const player = sample(state.player, Sample.SAMPLE_PLAYER);
  const vehicle = sample(state.vehicle, Sample.SAMPLE_VEHICLE);
  const location = sample(state.location, Sample.SAMPLE_LOCATION);
  const identity = sample(state.identity, Sample.SAMPLE_IDENTITY);
  const weapon = sample(state.weapon, Sample.SAMPLE_WEAPON);
  const voice = state.owner.voice ? sample(state.voice, Sample.SAMPLE_VOICE) : null;
  const needs = Object.keys(state.needs).length > 0 || !editing ? state.needs : Sample.SAMPLE_NEEDS;
  const money = Object.keys(state.money).length > 0 || !editing ? state.money : Sample.SAMPLE_MONEY;
  const entries = collectStatuses(
    { player, needs, statuses: state.statuses, labels: state.labels, needLabels: state.needLabels, colors: look.statusColors, alerts: look.alerts },
    settings,
  );
  const dead = !editing && player !== null && player.deathState !== "Alive";

  const content: Record<WidgetId, ReactNode> = {
    status: entries.length > 0 && <Status entries={entries} style={settings.widgets.status.style} effects={settings.effects} />,
    money: state.owner.accounts.some((account) => money[account] !== undefined) && (
      <Money accounts={state.owner.accounts} values={money} labels={state.accountLabels} locale={state.locale} style={settings.widgets.money.style} />
    ),
    identity: identity && <Identity identity={identity} labels={state.labels} style={settings.widgets.identity.style} />,
    voice: voice && <Voice voice={voice} labels={state.labels} style={settings.widgets.voice.style} />,
    speedometer: vehicle && (
      <Speedometer vehicle={vehicle} unit={settings.speedUnit} style={settings.widgets.speedometer.style} fuel={state.owner.fuel} effects={settings.effects} />
    ),
    compass: location && <Compass location={location} style={settings.widgets.compass.style} />,
    clock: location && <Clock hours={location.hours} minutes={location.minutes} use24={settings.clock24} style={settings.widgets.clock.style} />,
    weapon: weapon && <Weapon weapon={weapon} style={settings.widgets.weapon.style} />,
  };

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ "--hud-accent": settings.accent } as MotionStyle}
      initial={false}
      animate={{ opacity: state.visible || editing ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      data-visible={state.visible || editing}
    >
      <Effects player={player} vehicle={vehicle} effects={settings.effects && !editing} sounds={settings.sounds && !editing} cinematic={settings.cinematic && !editing} alerts={look.alerts} />
      {WIDGETS.map((id) => {
        const widget = settings.widgets[id];
        const body = content[id];

        // A widget the owner turned off never shows, not even in the editor.
        if (!body || !look.widgets[id].enabled || (!editing && (!widget.visible || dead || (settings.cinematic && !cinematicWidgets.has(id))))) {
          return null;
        }

        return (
          <div key={id} className={editing ? "pointer-events-auto" : undefined}>
            <Frame
              id={id}
              widget={widget}
              scale={settings.scale}
              editing={editing}
              selected={selected === id}
              snap={settings.snap}
              name={state.labels[`widget.${id}`] ?? WIDGET_NAMES[id]}
              onSelect={onSelect}
              onMove={onMove}
              onGuides={setGuides}
            >
              {body}
            </Frame>
          </div>
        );
      })}
      {guides.x !== undefined && <div className="absolute inset-y-0 w-px opacity-70" style={{ background: "var(--hud-accent)", left: `${guides.x * 100}%` }} />}
      {guides.y !== undefined && <div className="absolute inset-x-0 h-px opacity-70" style={{ background: "var(--hud-accent)", top: `${guides.y * 100}%` }} />}
    </motion.div>
  );
}

/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Places a widget on the screen. In the editor it is a drag handle with snapping.

import { useRef, type CSSProperties, type ReactNode, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { anchorOf, snapPosition, toAnchored, type Anchor, type Guides } from "@/lib/snap";
import type { WidgetId, WidgetSettings } from "@/lib/settings";

interface FrameProps {
  id: WidgetId;
  widget: WidgetSettings;
  scale: number;
  editing: boolean;
  selected: boolean;
  snap: boolean;
  name: string;
  onSelect?: ((id: WidgetId) => void) | undefined;
  onMove?: ((id: WidgetId, x: number, y: number) => void) | undefined;
  onGuides?: ((guides: Guides) => void) | undefined;
  children: ReactNode;
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(max, 0));
const ORIGIN: Record<Anchor, string> = { start: "0%", center: "50%", end: "100%" };

/** CSS that pins the widget's anchor to its position, so scaling and growing keep that edge in place. */
function placement(x: number, y: number, scale: number): CSSProperties {
  const ax = anchorOf(x);
  const ay = anchorOf(y);
  const style: CSSProperties = {
    transformOrigin: `${ORIGIN[ax]} ${ORIGIN[ay]}`,
    transform: `translate(${ax === "center" ? "-50%" : "0"}, ${ay === "center" ? "-50%" : "0"}) scale(${scale})`,
  };

  if (ax === "end") style.right = `${(1 - x) * 100}%`;
  else style.left = `${x * 100}%`;

  if (ay === "end") style.bottom = `${(1 - y) * 100}%`;
  else style.top = `${y * 100}%`;

  return style;
}

/** The widget's name in the editor: above it, or beside it near the top edge, where the screen would cut it. */
function labelPlace(x: number, y: number): string {
  const right = anchorOf(x) === "end";

  if (anchorOf(y) === "start" && y < 0.05) {
    return right ? "right-full top-0 mr-3" : "left-full top-0 ml-3";
  }

  return right ? "-top-6 right-0" : "-top-6 left-0";
}

export function Frame({ id, widget, scale, editing, selected, snap, name, onSelect, onMove, onGuides, children }: FrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Where the drag started: the pointer, and the widget's top-left corner on screen.
  const drag = useRef<{ pointerX: number; pointerY: number; left: number; top: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!editing || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const rect = event.currentTarget.getBoundingClientRect();

    drag.current = { pointerX: event.clientX, pointerY: event.clientY, left: rect.left / window.innerWidth, top: rect.top / window.innerHeight };
    onSelect?.(id);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;

    if (!start || !ref.current) {
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width / window.innerWidth;
    const height = rect.height / window.innerHeight;
    let left = start.left + (event.clientX - start.pointerX) / window.innerWidth;
    let top = start.top + (event.clientY - start.pointerY) / window.innerHeight;
    let guides: Guides = {};

    if (snap) {
      ({ x: left, y: top, guides } = snapPosition(left, top, width, height));
    }

    onGuides?.(guides);
    onMove?.(id, toAnchored(clamp(left, 1 - width), width, guides.x !== undefined), toAnchored(clamp(top, 1 - height), height, guides.y !== undefined));
  };

  const onPointerUp = () => {
    drag.current = null;
    onGuides?.({});
  };

  return (
    <div
      ref={ref}
      data-widget={id}
      className={cn(
        "absolute",
        editing && "cursor-move select-none rounded-xl outline-dashed outline-1 outline-offset-4",
        editing && (selected ? "outline-[var(--hud-accent)]" : "outline-white/30 hover:outline-white/60"),
      )}
      style={{ ...placement(widget.x, widget.y, scale * widget.scale), opacity: editing && !widget.visible ? 0.3 : widget.opacity }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {editing && (
        <span
          className={cn(
            "pointer-events-none absolute whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            labelPlace(widget.x, widget.y),
            selected ? "bg-[var(--hud-accent)] text-black" : "bg-black/70 text-white/70",
          )}
        >
          {name}
        </span>
      )}
      <div className={cn(editing && "pointer-events-none")}>{children}</div>
    </div>
  );
}

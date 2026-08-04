import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MindNode } from "@/lib/mindmap-types";

const NODE_W = 200;
const ROW_H = 46;
const GAP_X = 250;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

const LEVEL_STYLES = [
  { background: "#2563EB", color: "#FFFFFF" },
  { background: "#BFDBFE", color: "#1E3A8A" },
  { background: "#4FD1AE", color: "#0B3B31" },
];

type Placed = {
  node: MindNode;
  depth: number;
  x: number;
  y: number;
  parent: { x: number; y: number } | null;
};

function layout(root: MindNode, collapsed: Set<string>) {
  const placed: Placed[] = [];
  let cursor = 0;

  const walk = (node: MindNode, depth: number): Placed => {
    const x = depth * GAP_X;
    const kids = node.children ?? [];
    if (kids.length > 0 && !collapsed.has(node.id)) {
      const laid = kids.map((k) => walk(k, depth + 1));
      const y = (laid[0]!.y + laid[laid.length - 1]!.y) / 2;
      const self: Placed = { node, depth, x, y, parent: null };
      laid.forEach((l) => {
        l.parent = { x, y };
      });
      placed.push(self);
      return self;
    }
    const self: Placed = { node, depth, x, y: cursor++ * ROW_H, parent: null };
    placed.push(self);
    return self;
  };

  walk(root, 0);
  const width = Math.max(...placed.map((p) => p.x)) + NODE_W + 40;
  const height = Math.max(ROW_H, cursor * ROW_H) + 40;
  return { placed, width, height };
}

function curve(from: { x: number; y: number }, to: { x: number; y: number }) {
  const x1 = from.x + NODE_W;
  const y1 = from.y + ROW_H / 2 - 6;
  const x2 = to.x;
  const y2 = to.y + ROW_H / 2 - 6;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

export function MindMapCanvas({
  root,
  editing,
  onRename,
  onAddChild,
  onDelete,
}: {
  root: MindNode;
  editing: boolean;
  onRename?: (id: string, label: string) => void;
  onAddChild?: (id: string) => void;
  onDelete?: (node: MindNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 24, y: 24 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const { placed, width, height } = useMemo(() => layout(root, collapsed), [root, collapsed]);

  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: z, offset: o } = stateRef.current;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-dy * 0.0015)));
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const k = next / z;
      setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
      setZoom(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    const { zoom: z, offset: o } = stateRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    const px = (el?.clientWidth ?? 0) / 2;
    const py = (el?.clientHeight ?? 0) / 2;
    const k = next / z;
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
    setZoom(next);
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border bg-muted/30">
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-node-ui]")) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width,
            height,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
        >
          <svg width={width} height={height} className="pointer-events-none absolute inset-0">
            {placed
              .filter((p) => p.parent)
              .map((p) => (
                <path
                  key={`edge-${p.node.id}`}
                  d={curve(p.parent!, p)}
                  fill="none"
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={2}
                />
              ))}
          </svg>

          {placed.map((p) => {
            const style = LEVEL_STYLES[Math.min(p.depth, LEVEL_STYLES.length - 1)]!;
            const kids = p.node.children ?? [];
            const isOpen = kids.length > 0 && !collapsed.has(p.node.id);
            return (
              <div
                key={p.node.id}
                data-node-ui
                className="absolute flex items-center gap-1"
                style={{ left: p.x, top: p.y, width: NODE_W + 70 }}
              >
                <div
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium shadow-soft"
                  style={{ ...style, width: NODE_W }}
                >
                  {editing && editingId === p.node.id ? (
                    <input
                      autoFocus
                      defaultValue={p.node.label}
                      onBlur={(e) => {
                        onRename?.(p.node.id, e.target.value.trim() || p.node.label);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded bg-white/85 px-1.5 py-0.5 text-xs text-foreground outline-none"
                    />
                  ) : (
                    <span
                      className={cn("min-w-0 flex-1 truncate", editing && "cursor-text")}
                      title={p.node.label}
                      onClick={() => editing && setEditingId(p.node.id)}
                    >
                      {p.node.label}
                    </span>
                  )}
                  {kids.length > 0 && (
                    <button
                      type="button"
                      aria-label={isOpen ? "Recolher ramo" : "Expandir ramo"}
                      onClick={() => toggle(p.node.id)}
                      className="shrink-0 rounded-full p-0.5 hover:bg-black/10"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
                {editing && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    {p.depth < 2 && (
                      <button
                        type="button"
                        aria-label="Adicionar filho"
                        onClick={() => onAddChild?.(p.node.id)}
                        className="rounded-full border bg-card p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="size-3" />
                      </button>
                    )}
                    {p.depth > 0 && (
                      <button
                        type="button"
                        aria-label="Excluir nó"
                        onClick={() => onDelete?.(p.node)}
                        className="rounded-full border bg-card p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg border bg-card shadow-soft">
        <button
          type="button"
          aria-label="Aumentar zoom"
          className="p-1.5 hover:bg-muted"
          onClick={() => zoomBy(1.2)}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Diminuir zoom"
          className="border-t p-1.5 hover:bg-muted"
          onClick={() => zoomBy(1 / 1.2)}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Redefinir zoom"
          className="border-t px-1.5 py-1 text-[10px] font-semibold hover:bg-muted"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 24, y: 24 });
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  );
}

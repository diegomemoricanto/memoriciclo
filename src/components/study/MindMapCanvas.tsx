import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils";
import type { MindNode } from "@/lib/mindmap-types";

const ROW_H = 58;
const PILL_H = 38;
const COL_GAP = 96;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

const LEVEL_STYLES = [
  { background: "#C7C9F7", color: "#26265C" },
  { background: "#BBD3F0", color: "#12315C" },
  { background: "#D6E6FA", color: "#12315C" },
];

const EDGE_COLOR = "#8E92E8";

type Placed = {
  node: MindNode;
  depth: number;
  x: number;
  y: number;
  w: number;
  parentId: string | null;
};

const pillWidth = (label: string) => Math.min(420, Math.max(110, label.length * 8.2 + 34));

function layout(root: MindNode, collapsed: Set<string>) {
  const placed: Placed[] = [];
  let cursor = 0;

  const walk = (node: MindNode, depth: number, parentId: string | null): Placed => {
    const kids = node.children ?? [];
    const w = pillWidth(node.label);
    if (kids.length > 0 && !collapsed.has(node.id)) {
      const laid = kids.map((k) => walk(k, depth + 1, node.id));
      const y = (laid[0]!.y + laid[laid.length - 1]!.y) / 2;
      const self: Placed = { node, depth, x: 0, y, w, parentId };
      placed.push(self);
      return self;
    }
    const self: Placed = { node, depth, x: 0, y: cursor++ * ROW_H, w, parentId };
    placed.push(self);
    return self;
  };

  walk(root, 0, null);

  const colMax: number[] = [];
  placed.forEach((p) => {
    colMax[p.depth] = Math.max(colMax[p.depth] ?? 0, p.w);
  });
  const colX: number[] = [];
  colMax.forEach((w, i) => {
    colX[i] = i === 0 ? 0 : colX[i - 1]! + colMax[i - 1]! + COL_GAP;
  });
  placed.forEach((p) => {
    p.x = colX[p.depth]!;
  });

  const width = Math.max(...placed.map((p) => p.x + p.w)) + 120;
  const height = Math.max(ROW_H, cursor * ROW_H) + 80;
  return { placed, width, height };
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

export function MindMapCanvas({
  root,
  editing,
  onRename,
  onAddChild,
  onDelete,
  className,
  fileName = "mapa-mental",
}: {
  root: MindNode;
  editing: boolean;
  onRename?: (id: string, label: string) => void;
  onAddChild?: (id: string) => void;
  onDelete?: (node: MindNode) => void;
  className?: string;
  fileName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 32, y: 24 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const panDrag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const nodeDrag = useRef<{ id: string; x: number; y: number; ox: number; oy: number } | null>(null);

  const { placed, width, height } = useMemo(() => layout(root, collapsed), [root, collapsed]);

  const pos = useMemo(() => {
    const map = new Map<string, Placed & { fx: number; fy: number }>();
    placed.forEach((p) => {
      const off = nodeOffsets[p.node.id] ?? { x: 0, y: 0 };
      map.set(p.node.id, { ...p, fx: p.x + off.x, fy: p.y + off.y });
    });
    return map;
  }, [placed, nodeOffsets]);

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

  const recenter = useCallback(() => {
    const el = containerRef.current;
    const cw = el?.clientWidth ?? width;
    const ch = el?.clientHeight ?? height;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(cw / width, ch / height, 1)));
    setZoom(next);
    setOffset({ x: (cw - width * next) / 2, y: (ch - height * next) / 2 });
  }, [width, height]);

  const download = async () => {
    const el = stageRef.current;
    if (!el) return;
    const url = await toPng(el, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      width,
      height,
      style: { transform: "none", left: "0", top: "0" },
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.png`;
    a.click();
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rootKids = root.children ?? [];
  const rootPos = pos.get(root.id);
  const rootCollapsed = collapsed.has(root.id);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-background",
        className ?? "h-[420px]",
      )}
    >
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-node-ui]")) return;
          panDrag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const nd = nodeDrag.current;
          if (nd) {
            const k = stateRef.current.zoom;
            setNodeOffsets((prev) => ({
              ...prev,
              [nd.id]: {
                x: nd.ox + (e.clientX - nd.x) / k,
                y: nd.oy + (e.clientY - nd.y) / k,
              },
            }));
            return;
          }
          const d = panDrag.current;
          if (!d) return;
          setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
        }}
        onPointerUp={() => {
          panDrag.current = null;
          nodeDrag.current = null;
        }}
      >
        <div
          ref={stageRef}
          className="relative origin-top-left"
          style={{
            width,
            height,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
        >
          <svg width={width} height={height} className="pointer-events-none absolute inset-0">
            {placed.map((p) => {
              if (!p.parentId) return null;
              const parent = pos.get(p.parentId);
              const self = pos.get(p.node.id);
              if (!parent || !self) return null;
              const x1 = parent.fx + parent.w + 26;
              const y1 = parent.fy + PILL_H / 2;
              return (
                <path
                  key={`edge-${p.node.id}`}
                  d={curve(x1, y1, self.fx, self.fy + PILL_H / 2)}
                  fill="none"
                  stroke={EDGE_COLOR}
                  strokeWidth={1.6}
                />
              );
            })}
          </svg>

          {rootPos && rootKids.length > 0 && (
            <button
              type="button"
              data-node-ui
              aria-label={rootCollapsed ? "Expandir todos os ramos" : "Recolher todos os ramos"}
              onClick={() => toggle(root.id)}
              className="absolute grid size-5 place-items-center rounded-full text-[#3E42A8] shadow-sm transition hover:brightness-95"
              style={{
                background: "#C9D8F2",
                left: rootPos.fx + rootPos.w + 8,
                top: rootPos.fy + PILL_H / 2 - 10,
              }}
            >
              {rootCollapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronLeft className="size-3.5" />
              )}
            </button>
          )}

          {placed.map((p) => {
            const self = pos.get(p.node.id)!;
            const style = LEVEL_STYLES[Math.min(p.depth, LEVEL_STYLES.length - 1)]!;
            const kids = p.node.children ?? [];
            const isOpen = kids.length > 0 && !collapsed.has(p.node.id);
            const isRoot = p.depth === 0;
            return (
              <div
                key={p.node.id}
                data-node-ui
                className="absolute flex items-center gap-2"
                style={{ left: self.fx, top: self.fy }}
              >
                <div
                  className="flex items-center gap-1.5 rounded-lg px-4 text-sm font-normal"
                  style={{ ...style, width: self.w, height: PILL_H }}
                  onPointerDown={(e) => {
                    if (editingId === p.node.id) return;
                    e.stopPropagation();
                    const off = nodeOffsets[p.node.id] ?? { x: 0, y: 0 };
                    nodeDrag.current = {
                      id: p.node.id,
                      x: e.clientX,
                      y: e.clientY,
                      ox: off.x,
                      oy: off.y,
                    };
                    (e.currentTarget.closest("[data-node-ui]")?.parentElement
                      ?.parentElement as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
                  }}
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
                      className="min-w-0 flex-1 rounded bg-white/85 px-1.5 py-0.5 text-sm text-foreground outline-none"
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
                </div>

                {!isRoot && kids.length > 0 && (
                  <button
                    type="button"
                    aria-label={isOpen ? "Recolher ramo" : "Expandir ramo"}
                    onClick={() => toggle(p.node.id)}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-[#12315C] shadow-sm transition hover:brightness-95"
                    style={{ background: "#C9D8F2" }}
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                )}

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

      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Centralizar visão"
          onClick={recenter}
          className="grid size-9 place-items-center rounded-full border bg-card text-muted-foreground shadow-soft hover:text-foreground"
        >
          <ChevronsUpDown className="size-4" />
        </button>
        <div className="flex flex-col overflow-hidden rounded-full border bg-card shadow-soft">
          <button
            type="button"
            aria-label="Aumentar zoom"
            className="grid size-9 place-items-center hover:bg-muted"
            onClick={() => zoomBy(1.2)}
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Diminuir zoom"
            className="grid size-9 place-items-center border-t hover:bg-muted"
            onClick={() => zoomBy(1 / 1.2)}
          >
            <Minus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Baixar mapa como PNG"
          onClick={download}
          className="grid size-9 place-items-center rounded-full border bg-card text-muted-foreground shadow-soft hover:text-foreground"
        >
          <Download className="size-4" />
        </button>
      </div>
    </div>
  );
}

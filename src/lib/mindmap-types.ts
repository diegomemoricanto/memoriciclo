export type MindNode = {
  id: string;
  label: string;
  children?: MindNode[];
};

export const mindUid = () => Math.random().toString(36).slice(2, 10);

/** normaliza a árvore vinda da IA (ids ausentes, campos extras, profundidade > 3) */
export function normalizeMindNode(raw: unknown, depth = 0): MindNode | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { id?: unknown; label?: unknown; name?: unknown; children?: unknown };
  const label = String(obj.label ?? obj.name ?? "").trim();
  if (!label) return null;
  const children =
    depth < 2 && Array.isArray(obj.children)
      ? obj.children
          .map((c) => normalizeMindNode(c, depth + 1))
          .filter((c): c is MindNode => c !== null)
      : [];
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : mindUid(),
    label: label.slice(0, 160),
    ...(children.length ? { children } : {}),
  };
}

export function mapNode(
  node: MindNode,
  fn: (n: MindNode) => MindNode,
): MindNode {
  const next = fn(node);
  if (!next.children?.length) return next;
  return { ...next, children: next.children.map((c) => mapNode(c, fn)) };
}

export function removeNode(node: MindNode, id: string): MindNode {
  if (!node.children?.length) return node;
  const children = node.children.filter((c) => c.id !== id).map((c) => removeNode(c, id));
  return { ...node, children };
}

export function nodeDepth(node: MindNode): number {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(nodeDepth));
}
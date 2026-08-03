import type { MindNode } from "./mindmap-types";
import { normalizeMindNode } from "./mindmap-types";

const SYSTEM_PROMPT = `Você é um assistente que transforma conteúdo de estudo em mapas mentais.
Responda SOMENTE com um JSON válido, sem markdown, sem crases, sem nenhum texto antes ou depois.
Formato exato: { "id": string, "label": string, "children": [ { "id": string, "label": string, "children": [ { "id": string, "label": string } ] } ] }
Regras: árvore de no máximo 3 níveis (tópico principal -> subtópicos -> detalhes).
O nó raiz é o tema central. De 4 a 8 subtópicos. Cada subtópico com 2 a 5 detalhes curtos.
Rótulos curtos (no máximo 8 palavras), em português. ids curtos e únicos.`;

/** chama o Lovable AI Gateway e devolve a árvore do mapa mental */
export async function generateMindMapTree(content: string, subject?: string): Promise<MindNode> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA não configurada neste projeto.");

  const text = content.slice(0, 60000);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Disciplina: ${subject ?? "Estudos"}\n\nConteúdo:\n${text}`,
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Muitas requisições de IA. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Os créditos de IA do projeto acabaram.");
  if (!res.ok) throw new Error(`Falha na geração do mapa mental (${res.status}).`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("A IA não retornou um mapa válido.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("A IA não retornou um JSON válido.");
  }
  const tree = normalizeMindNode(parsed);
  if (!tree) throw new Error("A IA não retornou um mapa válido.");
  return tree;
}
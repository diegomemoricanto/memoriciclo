import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  content: z.string().min(20, "Conteúdo muito curto para gerar um mapa mental."),
  subject: z.string().optional(),
});

export const generateMindMap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateMindMapTree } = await import("./mindmap.server");
    const tree = await generateMindMapTree(data.content, data.subject);
    return { tree };
  });

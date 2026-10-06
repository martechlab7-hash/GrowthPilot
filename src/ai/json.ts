import { z } from "zod";
import { AIOutputError } from "./types";

/** Extract the first JSON object from a model response (tolerates fences/prose). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AIOutputError("Model response did not contain valid JSON");
  }
}

export function parseStructured<T extends z.ZodType>(text: string, schema: T): z.infer<T> {
  const raw = extractJson(text);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new AIOutputError(`Response failed schema validation: ${issues}`);
  }
  return result.data;
}

export function schemaForPrompt(schema: z.ZodType): string {
  return JSON.stringify(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }));
}

import { z } from "zod";

export const compareSchema = z.object({
  prompt: z.string().min(1),
  selectedModels: z.array(z.string().min(1)).min(1),
  mockMode: z.boolean(),
  allowFallback: z.boolean().optional()
});

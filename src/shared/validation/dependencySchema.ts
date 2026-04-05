import { z } from "zod";

export const dependencySchema = z.object({
  packageJsonText: z.string().min(2),
  simulateMaliciousInstall: z.boolean().optional()
});

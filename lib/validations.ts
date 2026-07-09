import { z } from "zod";

export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  category: z.string().trim().min(1).max(48),
  completed: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  deadlineAt: z.string().datetime().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  history: z
    .array(
      z.object({
        startedAt: z.string().datetime(),
        completedAt: z.string().datetime(),
      })
    )
    .optional(),
  order: z.number().optional(),
});

export const taskUpdateSchema = taskInputSchema.partial().extend({
  highlight: z.boolean().optional(),
});

export const sprintUpdateSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  reflection: z
    .object({
      wentWell: z.string().max(1000).optional(),
      distracted: z.string().max(1000).optional(),
      improve: z.string().max(1000).optional(),
    })
    .optional(),
  highlightTaskIds: z.array(z.string()).optional(),
});

export const reorderSchema = z.object({
  taskIds: z.array(z.string()).min(1),
});

export const categoryInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
});

export const categoryUpdateSchema = z.object({
  label: z.string().trim().min(1).max(40),
});

import { z } from "zod";

export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(1000).optional(),
  plan: z.string().max(4000).optional(),
  category: z.string().trim().min(1).max(48),
  estimatedTimeMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  favorite: z.boolean().optional(),
  coverImage: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  recurringStartDate: z.string().datetime().nullable().optional(),
  recurringEndDate: z.string().datetime().nullable().optional(),
  untilComplete: z.boolean().optional(),
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
  calories: z.number().min(0).max(10000).nullable().optional(),
  protein: z.number().min(0).max(1000).nullable().optional(),
  fat: z.number().min(0).max(1000).nullable().optional(),
  carbs: z.number().min(0).max(1000).nullable().optional(),
});

export const taskUpdateSchema = taskInputSchema.partial().extend({
  highlight: z.boolean().optional(),
});

export const planUpdateSchema = z.object({
  overview: z.string().max(2000).optional(),
  estimatedTimeMinutes: z.number().int().min(0).max(10080).nullable().optional(),
});

export const planStepInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(0).max(1440).optional(),
  icon: z.string().trim().min(1).max(48).optional(),
  isCompleted: z.boolean().optional(),
  isCollapsed: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const planStepUpdateSchema = planStepInputSchema.partial();

export const reorderStepsSchema = z.object({
  stepIds: z.array(z.string().min(1)).min(1),
});


export const checklistInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  orderIndex: z.number().int().min(0).optional(),
});

export const checklistUpdateSchema = checklistInputSchema.partial();

export const checklistItemInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  completed: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const checklistItemUpdateSchema = checklistItemInputSchema.partial();

export const noteUpdateSchema = z.object({
  content: z.string().max(50000),
});

export const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1).max(260),
  storageUrl: z.string().trim().min(1).max(2000),
  mimeType: z.string().max(120).optional(),
  size: z.number().int().min(0).optional(),
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

export const reorderCategoriesSchema = z.object({
  categoryKeys: z.array(z.string().min(1)).min(1),
});

export const categoryInputSchema = z.object({
  label: z.string().trim().min(1).max(30),
  tagline: z.string().max(80).optional(),
  icon: z.string().max(50).optional(),
  themeId: z.string().max(50).optional(),
  isBrainDump: z.boolean().optional(),
  isCaloriesTracker: z.boolean().optional(),
  targetCalories: z.number().min(0).max(10000).nullable().optional(),
  targetProtein: z.number().min(0).max(1000).nullable().optional(),
  targetFat: z.number().min(0).max(1000).nullable().optional(),
  targetCarbs: z.number().min(0).max(1000).nullable().optional(),
});

export const categoryUpdateSchema = z.object({
  label: z.string().trim().min(1).max(40),
  tagline: z.string().max(80).optional(),
  icon: z.string().max(50).optional(),
  themeId: z.string().max(50).optional(),
  isBrainDump: z.boolean().optional(),
  isCaloriesTracker: z.boolean().optional(),
  targetCalories: z.number().min(0).max(10000).nullable().optional(),
  targetProtein: z.number().min(0).max(1000).nullable().optional(),
  targetFat: z.number().min(0).max(1000).nullable().optional(),
  targetCarbs: z.number().min(0).max(1000).nullable().optional(),
});

export const ruleInputSchema = z.object({
  text: z.string().trim().min(1).max(100),
  icon: z.string().max(50).optional(),
  themeId: z.string().max(50).optional(),
});

export const ruleUpdateSchema = ruleInputSchema.partial();

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const categoryFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(30, "Max 30 characters"),
  tagline: z.string().max(80, "Max 80 characters").optional(),
  icon: z.string().min(1, "Please select an icon"),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function useCategoryForm() {
  return useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      label: "",
      tagline: "",
      icon: "",
    },
  });
}

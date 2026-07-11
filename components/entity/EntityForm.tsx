"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Tag, PenLine, Smile, AlertCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconPicker } from "./IconPicker";
import { ModalFooter } from "./ModalFooter";

export const categorySchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(30, "Max 30 characters"),
  tagline: z.string().max(80, "Max 80 characters").optional(),
  icon: z.string().min(1, "Please select an icon"),
  isBrainDump: z.boolean().optional(),
});

export const ruleSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Rule description is required")
    .max(100, "Max 100 characters"),
  tagline: z.string().optional(),
  icon: z.string().optional(),
});

export type EntityFormValues = {
  label: string;
  tagline?: string;
  icon?: string;
  isBrainDump?: boolean;
};

interface EntityFormProps {
  entityType: "category" | "rule";
  onSubmit: (data: EntityFormValues) => Promise<void>;
  accentBg?: string;
  accentText?: string;
  form: UseFormReturn<EntityFormValues>;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
  submitLabel?: string;
}

export function EntityForm({
  entityType,
  onSubmit,
  accentBg,
  accentText,
  form,
  nameInputRef,
  submitLabel,
}: EntityFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const labelValue = watch("label") || "";
  const taglineValue = watch("tagline") || "";

  const labelCount = labelValue.length;
  const taglineCount = taglineValue.length;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-5">
      {/* Name / Rule Text Input */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <Tag className="size-3.5 text-zinc-400" />
          {entityType === "category" ? "Category Name" : "Rule"}
          <span className="text-red-500 ml-0.5" aria-hidden>*</span>
        </label>
        <div className="relative">
          <input
            {...register("label")}
            ref={(el) => {
              register("label").ref(el);
              if (nameInputRef) {
                (nameInputRef as unknown as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }
            }}
            placeholder={
              entityType === "category"
                ? "e.g. Work Projects, Health, Learning…"
                : "e.g. Meditate before opening charts…"
            }
            maxLength={entityType === "category" ? 30 : 100}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none transition pr-12",
              "bg-white dark:bg-zinc-900",
              "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
              "text-zinc-900 dark:text-zinc-100",
              errors.label
                ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-200"
                : "border-zinc-200 dark:border-zinc-800 focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:border-violet-600 dark:focus:ring-violet-900/30",
            )}
            aria-describedby={errors.label ? "label-error" : undefined}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 tabular-nums">
            {labelCount}/{entityType === "category" ? 30 : 100}
          </span>
        </div>
        {errors.label && (
          <p id="label-error" className="flex items-center gap-1 text-xs text-red-500 mt-1">
            <AlertCircle className="size-3" />
            {errors.label.message}
          </p>
        )}
      </div>

      {/* Tagline Input (only for Categories) */}
      {entityType === "category" && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            <PenLine className="size-3.5 text-zinc-400" />
            Tagline
            <span className="text-xs font-normal text-zinc-400 ml-0.5">(Optional)</span>
          </label>
          <div className="relative">
            <input
              {...register("tagline")}
              placeholder="e.g. Open when you feel bored and want to do admin work"
              maxLength={80}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none transition pr-14",
                "bg-white dark:bg-zinc-900",
                "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                "text-zinc-900 dark:text-zinc-100",
                "border-zinc-200 dark:border-zinc-800 focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:border-violet-600 dark:focus:ring-violet-900/30",
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 tabular-nums">
              {taglineCount}/80
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            A short line that reminds you when to open this category.
          </p>
        </div>
      )}

      {/* Icon Picker Field */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <Smile className="size-3.5 text-zinc-400" />
          Choose Icon
          {entityType === "category" ? (
            <span className="text-red-500 ml-0.5" aria-hidden>*</span>
          ) : (
            <span className="text-xs font-normal text-zinc-400 ml-0.5">(Optional)</span>
          )}
        </label>
        <Controller
          name="icon"
          control={control}
          render={({ field }) => (
            <IconPicker
              value={field.value || ""}
              onChange={field.onChange}
              accentBg={accentBg}
              accentText={accentText}
            />
          )}
        />
        {errors.icon && (
          <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
            <AlertCircle className="size-3" />
            {errors.icon.message}
          </p>
        )}
      </div>

      {/* Brain Dump Toggle (only for Categories) */}
      {entityType === "category" && (
        <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <input
            type="checkbox"
            id="isBrainDump"
            {...register("isBrainDump")}
            className="mt-1 size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 cursor-pointer"
          />
          <div className="space-y-1">
            <label
              htmlFor="isBrainDump"
              className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <Brain className="size-4 text-violet-500" />
              Brain Dump Category
            </label>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Tasks in this category will belong to the global Brain Dump workspace instead of today&apos;s sprint.
            </p>
          </div>
        </div>
      )}

      <ModalFooter
        isSubmitting={isSubmitting}
        submitLabel={submitLabel || (entityType === "category" ? "Create Category" : "Create Rule")}
        submittingLabel={submitLabel ? "Saving…" : (entityType === "category" ? "Creating…" : "Creating…")}
      />
    </form>
  );
}

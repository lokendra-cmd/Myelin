"use client";

import { useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ModalHeader } from "./ModalHeader";
import { EntityForm, categorySchema, ruleSchema, type EntityFormValues } from "./EntityForm";
import { THEMES } from "@/lib/themes";

interface EntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "category" | "rule";
  onSubmit: (data: EntityFormValues) => Promise<void>;
  title: string;
  description?: string;
  defaultIconName?: string;
  defaultIcon?: React.ComponentType<{ className?: string }>;
  initialValues?: EntityFormValues | null;
  submitLabel?: string;
}

export function EntityModal({
  open,
  onOpenChange,
  entityType,
  onSubmit,
  title,
  description,
  defaultIconName,
  defaultIcon,
  initialValues,
  submitLabel,
}: EntityModalProps) {
  const schema = entityType === "category" ? categorySchema : ruleSchema;
  
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      tagline: "",
      icon: "",
      isBrainDump: false,
      isCaloriesTracker: false,
      targetCalories: undefined,
      targetProtein: undefined,
      targetFat: undefined,
      targetCarbs: undefined,
    },
  });

  const { watch, reset } = form;

  const labelValue = watch("label");
  const taglineValue = watch("tagline");
  const iconValue = watch("icon");

  const previewTheme = THEMES[0]; // Header preview colors
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form when modal opens or entityType/initialValues change
  useEffect(() => {
    if (open) {
      reset(
        initialValues || {
          label: "",
          tagline: "",
          icon: "",
          isBrainDump: false,
          isCaloriesTracker: false,
          targetCalories: undefined,
          targetProtein: undefined,
          targetFat: undefined,
          targetCarbs: undefined,
        }
      );
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
    }
  }, [open, entityType, initialValues, reset]);

  const handleOpenAutoFocus = (e: Event) => {
    e.preventDefault();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              {/* Overlay */}
              <Dialog.Overlay asChild>
                <motion.div
                  key="overlay"
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
              </Dialog.Overlay>

              {/* Content Card */}
              <Dialog.Content asChild onOpenAutoFocus={handleOpenAutoFocus}>
                <motion.div
                  key="content"
                  className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,520px)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/10 dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
                  role="dialog"
                  aria-modal="true"
                >
                  {/* Header with live preview */}
                  <ModalHeader
                    title={labelValue || title}
                    description={
                      entityType === "category"
                        ? taglineValue || description || "Organize your tasks and focus better."
                        : description || "Create a guiding principle for your daily routine."
                    }
                    iconName={iconValue || defaultIconName}
                    defaultIcon={defaultIcon}
                    accentBg={previewTheme.accentBg}
                    accentText={previewTheme.accentText}
                  />

                  {/* Form */}
                  <div className="max-h-[calc(92vh-140px)] overflow-y-auto overscroll-contain">
                    <EntityForm
                      entityType={entityType}
                      onSubmit={onSubmit}
                      form={form}
                      accentBg={previewTheme.accentBg}
                      accentText={previewTheme.accentText}
                      nameInputRef={nameInputRef}
                      submitLabel={submitLabel}
                    />
                  </div>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

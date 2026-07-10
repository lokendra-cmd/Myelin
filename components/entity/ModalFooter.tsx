"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModalFooterProps {
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

export function ModalFooter({
  isSubmitting,
  submitLabel = "Create",
  submittingLabel = "Creating…",
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
      <Dialog.Close asChild>
        <Button type="button" variant="subtle" size="sm">
          Cancel
        </Button>
      </Dialog.Close>
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5 shadow-sm"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            {submittingLabel}
          </span>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            {submitLabel}
          </>
        )}
      </Button>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";

import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  action: (formData: FormData) => Promise<void> | void;
  children: React.ReactNode;
  buttonClassName?: string;
  buttonLabel: React.ReactNode;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
};

export function ConfirmActionForm({
  action,
  children,
  buttonClassName,
  buttonLabel,
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
  variant = "primary",
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setOpen(false);
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  };

  return (
    <>
      <form ref={formRef} action={action}>
        {children}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={isPending}
          className={buttonClassName}
        >
          {buttonLabel}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        variant={variant}
        isPending={isPending}
      />
    </>
  );
}

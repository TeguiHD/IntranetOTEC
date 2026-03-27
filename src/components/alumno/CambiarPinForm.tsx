"use client";

import { useState, useTransition } from "react";

import { Lock } from "lucide-react";
import { toast } from "sonner";

import { cambiarPinAlumnoAction } from "@/actions/usuarios";

export function CambiarPinForm() {
  const [pinActual, setPinActual] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  const pinInputClass =
    "h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-center text-lg font-mono tracking-[0.5em] text-text-primary placeholder:text-gray-400 placeholder:tracking-[0.3em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pinNuevo !== pinConfirm) {
      toast.error("La nueva clave y su confirmación no coinciden.");
      return;
    }

    if (pinNuevo === pinActual) {
      toast.error("La nueva clave debe ser distinta a la actual.");
      return;
    }

    startTransition(async () => {
      const result = await cambiarPinAlumnoAction({ pinActual, pinNuevo });

      if (result.ok) {
        toast.success("Clave actualizada correctamente.");
        setPinActual("");
        setPinNuevo("");
        setPinConfirm("");
      } else {
        toast.error(result.message ?? "No fue posible cambiar la clave.");
      }
    });
  };

  const isValid =
    /^\d{4}$/.test(pinActual) &&
    /^\d{4}$/.test(pinNuevo) &&
    /^\d{4}$/.test(pinConfirm);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="pin-actual" className="block text-sm font-medium text-text-primary dark:text-gray-200">
          Clave actual
        </label>
        <input
          id="pin-actual"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pinActual}
          disabled={isPending}
          onChange={(e) => setPinActual(e.currentTarget.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className={pinInputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pin-nuevo" className="block text-sm font-medium text-text-primary dark:text-gray-200">
          Nueva clave (4 dígitos)
        </label>
        <input
          id="pin-nuevo"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pinNuevo}
          disabled={isPending}
          onChange={(e) => setPinNuevo(e.currentTarget.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className={pinInputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pin-confirm" className="block text-sm font-medium text-text-primary dark:text-gray-200">
          Confirmar nueva clave
        </label>
        <input
          id="pin-confirm"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pinConfirm}
          disabled={isPending}
          onChange={(e) => setPinConfirm(e.currentTarget.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className={pinInputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !isValid}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
      >
        <Lock className="h-4 w-4" />
        {isPending ? "Guardando…" : "Cambiar Clave"}
      </button>
    </form>
  );
}

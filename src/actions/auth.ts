"use server";

import { signIn, signOut } from "@/auth";

export async function iniciarSesionAlumnoAction(rut: string) {
  await signIn("alumno-rut", {
    rut,
    redirectTo: "/",
  });
}

export async function iniciarSesionStaffAction(email: string, password: string) {
  await signIn("staff-credentials", {
    email,
    password,
    redirectTo: "/",
  });
}

export async function cerrarSesionAction() {
  await signOut({
    redirectTo: "/login",
  });
}

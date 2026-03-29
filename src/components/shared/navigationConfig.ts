import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Download,
  FileCheck,
  FileText,
  GraduationCap,
  Home,
  IdCard,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Shield,
  Star,
  TrendingUp,
  Upload,
  User,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import type { AppRole } from "@/lib/authz";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  gradient: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const GRADIENT_COLORS: Record<string, string> = {
  "grad-purple": "#8B3A9E",
  "grad-blue": "#3B82F6",
  "grad-cyan": "#06B6D4",
  "grad-amber": "#F5A623",
  "grad-emerald": "#10B981",
  "grad-pink": "#EC4899",
  "grad-violet": "#8B5CF6",
  "grad-gold": "#F5A623",
  "grad-slate": "#64748B",
  "grad-indigo": "#6366F1",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  docente: "Docente",
  alumno: "Alumno",
};

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/admin", label: "Panel", Icon: LayoutDashboard, gradient: "grad-purple" },
    ],
  },
  {
    title: "Academico",
    items: [
      { href: "/admin/asignaturas", label: "Asignaturas", Icon: BookOpen, gradient: "grad-blue" },
      { href: "/admin/clases", label: "Clases", Icon: CalendarDays, gradient: "grad-cyan" },
      { href: "/admin/evaluaciones", label: "Evaluaciones", Icon: ClipboardList, gradient: "grad-violet" },
      { href: "/admin/notas", label: "Notas", Icon: ClipboardList, gradient: "grad-gold" },
      { href: "/admin/asistencias", label: "Asistencias", Icon: ClipboardCheck, gradient: "grad-emerald" },
      { href: "/admin/encuestas", label: "Encuestas Docente", Icon: Star, gradient: "grad-amber" },
      { href: "/admin/test-estilos", label: "Test Estilos", Icon: Brain, gradient: "grad-violet" },
      { href: "/admin/encuestas-builder", label: "Constructor Encuestas", Icon: MessageSquare, gradient: "grad-indigo" },
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/admin/administradores", label: "Administradores", Icon: Shield, gradient: "grad-purple" },
      { href: "/admin/docentes", label: "Docentes", Icon: UserCog, gradient: "grad-amber" },
      { href: "/admin/alumnos", label: "Alumnos", Icon: Users, gradient: "grad-emerald" },
      { href: "/admin/matriculas", label: "Matriculas", Icon: Wallet, gradient: "grad-pink" },
    ],
  },
  {
    title: "Solicitudes",
    items: [
      { href: "/admin/solicitudes", label: "Solicitudes", Icon: FileText, gradient: "grad-violet" },
      { href: "/admin/importar", label: "Importar Alumnos", Icon: Upload, gradient: "grad-emerald" },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { href: "/admin/finanzas", label: "Finanzas", Icon: TrendingUp, gradient: "grad-emerald" },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      { href: "/admin/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-amber" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/auditoria", label: "Auditoria", Icon: ClipboardList, gradient: "grad-slate" },
      { href: "/instalar", label: "Instalar App", Icon: Download, gradient: "grad-emerald" },
    ],
  },
];

const DOCENTE_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/docente", label: "Panel", Icon: Home, gradient: "grad-purple" },
    ],
  },
  {
    title: "Academico",
    items: [
      { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen, gradient: "grad-blue" },
      { href: "/docente/calendario", label: "Calendario", Icon: CalendarDays, gradient: "grad-cyan" },
      { href: "/encuestas", label: "Mis Encuestas", Icon: MessageSquare, gradient: "grad-indigo" },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      { href: "/docente/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-amber" },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      { href: "/docente/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-blue" },
      { href: "/instalar", label: "Instalar App", Icon: Download, gradient: "grad-emerald" },
    ],
  },
];

const ALUMNO_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/alumno", label: "Panel", Icon: Home, gradient: "grad-purple" },
    ],
  },
  {
    title: "Academico",
    items: [
      { href: "/alumno/asignaturas", label: "Mis Cursos", Icon: GraduationCap, gradient: "grad-blue" },
      { href: "/alumno/calendario", label: "Calendario", Icon: CalendarDays, gradient: "grad-cyan" },
      { href: "/alumno/clases", label: "Clases", Icon: CalendarDays, gradient: "grad-cyan" },
      { href: "/alumno/evaluaciones", label: "Evaluaciones", Icon: ClipboardList, gradient: "grad-violet" },
      { href: "/alumno/notas", label: "Mis Notas", Icon: ClipboardList, gradient: "grad-gold" },
      { href: "/alumno/asistencias", label: "Mi Asistencia", Icon: ClipboardCheck, gradient: "grad-emerald" },
      { href: "/alumno/encuesta-docente", label: "Evaluar Docente", Icon: Star, gradient: "grad-amber" },
      { href: "/alumno/test-estilos", label: "Test Estilos", Icon: Brain, gradient: "grad-violet" },
      { href: "/encuestas", label: "Mis Encuestas", Icon: MessageSquare, gradient: "grad-indigo" },
    ],
  },
  {
    title: "Solicitudes",
    items: [
      { href: "/alumno/solicitudes/credencial", label: "Credencial", Icon: IdCard, gradient: "grad-violet" },
      { href: "/alumno/solicitudes/alumno-regular", label: "Certificado Alumno Regular", Icon: FileCheck, gradient: "grad-blue" },
      { href: "/alumno/solicitudes/tarjeta-beneficio", label: "Tarjeta Beneficio", Icon: CreditCard, gradient: "grad-pink" },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      { href: "/alumno/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-amber" },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      { href: "/alumno/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-blue" },
      { href: "/instalar", label: "Instalar App", Icon: Download, gradient: "grad-emerald" },
    ],
  },
];

export const ROLE_SECTIONS: Record<AppRole, NavSection[]> = {
  admin: ADMIN_SECTIONS,
  docente: DOCENTE_SECTIONS,
  alumno: ALUMNO_SECTIONS,
};

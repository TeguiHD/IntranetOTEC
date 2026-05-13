import {
  Bell,
  BookOpen,
  Brain,
  Award,
  BarChart3,
  CalendarDays,
  CalendarRange,
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
import {
  roleHasCapability,
  type AppCapability,
} from "@/lib/capabilities";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  gradient: string;
  capability?: AppCapability;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const GRADIENT_COLORS: Record<string, string> = {
  "grad-purple": "#8B3A9E",
  "grad-blue": "#3B82F6",
  "grad-cyan": "#06B6D4",
  "grad-teal": "#14B8A6",
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
      { href: "/admin", label: "Panel", Icon: LayoutDashboard, gradient: "grad-purple", capability: "dashboard.admin" },
      { href: "/admin/agenda", label: "Agenda", Icon: CalendarDays, gradient: "grad-teal", capability: "agenda.admin" },
    ],
  },
  {
    title: "Oferta académica",
    items: [
      { href: "/admin/academico", label: "Vista académica", Icon: BookOpen, gradient: "grad-purple", capability: "cursos.admin" },
      { href: "/admin/asignaturas", label: "Secciones", Icon: BookOpen, gradient: "grad-blue", capability: "asignaturas.admin" },
      { href: "/admin/cursos", label: "Cursos", Icon: BookOpen, gradient: "grad-indigo", capability: "cursos.admin" },
      { href: "/admin/horarios", label: "Horarios", Icon: CalendarRange, gradient: "grad-teal", capability: "horarios.admin" },
      { href: "/admin/clases", label: "Clases", Icon: CalendarDays, gradient: "grad-cyan", capability: "clases.admin" },
      { href: "/admin/materiales", label: "Materiales", Icon: Upload, gradient: "grad-emerald", capability: "clases.admin" },
      { href: "/admin/evaluaciones", label: "Evaluaciones", Icon: ClipboardList, gradient: "grad-violet", capability: "evaluaciones.read_admin" },
    ],
  },
  {
    title: "Registros académicos",
    items: [
      { href: "/admin/asistencias", label: "Asistencias", Icon: ClipboardCheck, gradient: "grad-emerald", capability: "asistencia.manage" },
      { href: "/admin/notas", label: "Notas", Icon: ClipboardList, gradient: "grad-gold", capability: "notas.admin" },
      { href: "/admin/encuestas-builder", label: "Encuestas", Icon: MessageSquare, gradient: "grad-indigo", capability: "encuestas.admin" },
    ],
  },
  {
    title: "Personas y matrículas",
    items: [
      { href: "/admin/docentes", label: "Docentes", Icon: UserCog, gradient: "grad-amber", capability: "personas.admin" },
      { href: "/admin/alumnos", label: "Alumnos", Icon: Users, gradient: "grad-emerald", capability: "personas.admin" },
      { href: "/admin/matriculas", label: "Matriculas", Icon: Wallet, gradient: "grad-pink", capability: "matriculas.admin" },
      { href: "/admin/administradores", label: "Administradores", Icon: Shield, gradient: "grad-purple", capability: "personas.admin" },
    ],
  },
  {
    title: "Comunicación y soporte",
    items: [
      { href: "/admin/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-amber", capability: "notificaciones.admin" },
      { href: "/admin/solicitudes", label: "Solicitudes", Icon: FileText, gradient: "grad-violet", capability: "solicitudes.admin" },
      { href: "/admin/beneficios-credenciales", label: "Beneficios y Credenciales", Icon: IdCard, gradient: "grad-pink", capability: "solicitudes.admin" },
      { href: "/admin/certificados", label: "Certificados", Icon: FileCheck, gradient: "grad-blue", capability: "certificados.admin" },
      { href: "/admin/importar", label: "Importar Alumnos", Icon: Upload, gradient: "grad-emerald", capability: "importaciones.admin" },
    ],
  },
  {
    // Analítica consolida Dashboard de KPIs + sub-reportes (Rendimiento, Retención,
    // Asistencia, Notas) que antes ocupaban entradas independientes en el nav lateral.
    // El Word marcó este apartado como sobrecargado: las sub-vistas siguen siendo
    // accesibles desde /admin/reportes pero ya no inflan el menú.
    title: "Analítica",
    items: [
      { href: "/admin/reportes", label: "Analítica", Icon: BarChart3, gradient: "grad-purple", capability: "reportes.admin" },
      { href: "/admin/historial", label: "Historial", Icon: FileText, gradient: "grad-slate", capability: "historial.admin" },
      { href: "/admin/finanzas", label: "Finanzas", Icon: TrendingUp, gradient: "grad-emerald", capability: "finanzas.admin" },
      { href: "/admin/auditoria", label: "Auditoria", Icon: ClipboardList, gradient: "grad-slate", capability: "auditoria.admin" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/instalar", label: "Instalar App", Icon: Download, gradient: "grad-emerald", capability: "app.install" },
    ],
  },
];

const DOCENTE_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/docente", label: "Panel", Icon: Home, gradient: "grad-purple", capability: "dashboard.docente" },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen, gradient: "grad-blue", capability: "asignaturas.docente" },
      { href: "/docente/materiales", label: "Materiales", Icon: Upload, gradient: "grad-emerald", capability: "asignaturas.docente" },
      { href: "/docente/pruebas", label: "Pruebas", Icon: ClipboardList, gradient: "grad-violet", capability: "evaluaciones.read_assigned" },
      { href: "/docente/asistencia", label: "Asistencia", Icon: ClipboardCheck, gradient: "grad-emerald", capability: "asistencia.docente" },
      { href: "/docente/horario", label: "Mis Clases", Icon: CalendarRange, gradient: "grad-teal", capability: "horario.docente" },
      { href: "/docente/calendario", label: "Calendario", Icon: CalendarDays, gradient: "grad-cyan", capability: "calendario.docente" },
      { href: "/encuestas", label: "Mis Encuestas", Icon: MessageSquare, gradient: "grad-indigo", capability: "encuestas.docente" },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      { href: "/docente/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-amber", capability: "notificaciones.self" },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      { href: "/docente/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-blue", capability: "perfil.self" },
      { href: "/instalar", label: "Instalar App", Icon: Download, gradient: "grad-emerald", capability: "app.install" },
    ],
  },
];

const ALUMNO_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/alumno", label: "Panel", Icon: Home, gradient: "grad-purple", capability: "dashboard.alumno" },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/alumno/asignaturas", label: "Mis Cursos", Icon: GraduationCap, gradient: "grad-blue", capability: "asignaturas.alumno" },
      { href: "/alumno/materiales", label: "Materiales", Icon: FileText, gradient: "grad-emerald", capability: "clases.alumno" },
      { href: "/alumno/calendario", label: "Calendario", Icon: CalendarDays, gradient: "grad-cyan", capability: "calendario.alumno" },
      { href: "/alumno/clases", label: "Clases", Icon: CalendarDays, gradient: "grad-cyan", capability: "clases.alumno" },
      { href: "/alumno/evaluaciones", label: "Evaluaciones", Icon: ClipboardList, gradient: "grad-violet", capability: "evaluaciones.read_own" },
      { href: "/alumno/notas", label: "Mis Notas", Icon: ClipboardList, gradient: "grad-gold", capability: "notas.alumno" },
      { href: "/alumno/asistencias", label: "Mi Asistencia", Icon: ClipboardCheck, gradient: "grad-emerald", capability: "asistencia.alumno" },
      { href: "/alumno/encuesta-docente", label: "Evaluar Docente", Icon: Star, gradient: "grad-amber", capability: "encuestas.alumno" },
      { href: "/alumno/test-estilos", label: "Test Estilos", Icon: Brain, gradient: "grad-violet", capability: "test_estilos.alumno" },
      { href: "/encuestas", label: "Mis Encuestas", Icon: MessageSquare, gradient: "grad-indigo", capability: "encuestas.alumno" },
    ],
  },
  {
    title: "Solicitudes",
    items: [
      { href: "/alumno/certificados", label: "Mis Certificados", Icon: Award, gradient: "grad-purple", capability: "solicitudes.alumno" },
      { href: "/alumno/solicitudes/credencial", label: "Credencial", Icon: IdCard, gradient: "grad-violet", capability: "solicitudes.alumno" },
      { href: "/alumno/solicitudes/tarjeta-beneficio", label: "Tarjeta Beneficio", Icon: CreditCard, gradient: "grad-pink", capability: "solicitudes.alumno" },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      { href: "/alumno/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-amber", capability: "notificaciones.self" },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      { href: "/alumno/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-blue", capability: "perfil.self" },
      { href: "/instalar", label: "Instalar App", Icon: Download, gradient: "grad-emerald", capability: "app.install" },
    ],
  },
];

export const ROLE_SECTIONS: Record<AppRole, NavSection[]> = {
  admin: ADMIN_SECTIONS,
  docente: DOCENTE_SECTIONS,
  alumno: ALUMNO_SECTIONS,
};

export const getNavigationSectionsForRole = (role: AppRole): NavSection[] => {
  return ROLE_SECTIONS[role]
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.capability || roleHasCapability(role, item.capability),
      ),
    }))
    .filter((section) => section.items.length > 0);
};

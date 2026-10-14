import { BarChart3, CalendarDays, Gauge, Monitor, UsersRound, Wrench } from 'lucide-react';

export const menuPrincipal = [
  { nombre: 'Inicio', icono: Gauge, ruta: '/' },
  { nombre: 'Agenda', icono: CalendarDays, ruta: '/agenda' },
  { nombre: 'Servicios', icono: Wrench, ruta: '/servicios' },
  { nombre: 'Técnicos', icono: UsersRound, ruta: '/tecnicos' },
  { nombre: 'Oficina', icono: Monitor, ruta: '/maquinas' },
  { nombre: 'Finanzas', icono: BarChart3, ruta: '/finanzas' },
];

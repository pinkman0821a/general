import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Monitor,
  PlayCircle,
  UsersRound,
  Wrench,
} from 'lucide-react'

export const tecnicos = [
  {
    nombre: 'Juan González',
    estado: 'Disponible',
    ciudad: 'Bogotá',
  },
  {
    nombre: 'Carlos Pérez',
    estado: 'En servicio',
    ciudad: 'Medellín',
  },
  {
    nombre: 'Andrés López',
    estado: 'Disponible',
    ciudad: 'Bogotá',
  },
  {
    nombre: 'Miguel Torres',
    estado: 'En viaje',
    ciudad: 'Cali',
  },
]

export const servicios = [
  {
    hora: '08:00',
    tecnico: 'Carlos Pérez',
    cliente: 'Impresiones XYZ',
    tipo: 'Mantenimiento',
  },
  {
    hora: '10:30',
    tecnico: 'Juan González',
    cliente: 'Publicidad Norte',
    tipo: 'Instalación',
  },
  {
    hora: '14:00',
    tecnico: 'Andrés López',
    cliente: 'Color Print',
    tipo: 'Diagnóstico',
  },
]

export const menuPrincipal = [
  {
    nombre: 'Inicio',
    icono: Gauge,
    ruta: '/',
  },
  {
    nombre: 'Agenda',
    icono: CalendarDays,
    ruta: '/agenda',
  },
  {
    nombre: 'Servicios',
    icono: Wrench,
    ruta: '/servicios',
  },
  {
    nombre: 'Técnicos',
    icono: UsersRound,
    ruta: '/tecnicos',
  },
  {
    nombre: 'Clientes',
    icono: Building2,
    ruta: '/clientes',
  },
  {
    nombre: 'Máquinas',
    icono: Monitor,
    ruta: '/maquinas',
  },
  {
    nombre: 'Finanzas',
    icono: BarChart3,
    ruta: '/finanzas',
  },
]

export const resumen = [
  {
    titulo: 'Servicios programados',
    valor: '8',
    detalle: 'para hoy',
    icono: CalendarDays,
  },
  {
    titulo: 'En curso',
    valor: '3',
    detalle: 'servicios activos',
    icono: PlayCircle,
  },
  {
    titulo: 'Completados',
    valor: '5',
    detalle: 'durante el día',
    icono: CheckCircle2,
  },
  {
    titulo: 'Técnicos disponibles',
    valor: '4',
    detalle: 'de 6 técnicos',
    icono: UsersRound,
  },
]
# 📄 Enunciado del Proyecto – Aplicación Web de Gestión de Finanzas

## Objetivo del Proyecto

Desarrollar una aplicación web para la **gestión personal y/o empresarial de finanzas** que permita a los usuarios registrar movimientos (ingresos y gastos), crear presupuestos, categorizar transacciones, generar reportes y visualizar la salud financiera en tiempo real. La aplicación debe ser segura, escalable y contar con documentación clara para despliegue y mantenimiento.

## Alcance del Proyecto

El proyecto deberá incluir, como mínimo, las siguientes funcionalidades:

1. 🔴 **Gestión de Usuarios**

   * ✅ Registro de nuevos usuarios con validación y verificación (email opcional).
   * ✅ Inicio de sesión seguro (JWT o sesiones con refresh tokens).
   * 🔴 Perfiles de usuario con configuración básica (moneda, zona horaria, preferencia de visualización).

2. 🔴 **Registro de Transacciones**

   * 🔴 Alta de movimientos: ingresos y gastos (monto, fecha, categoría, cuenta, nota, adjunto opcional).
   * 🔴 Soporte para transacciones recurrentes (mensual, semanal, anual).
   * 🔴 Edición y eliminación de transacciones (con confirmación y registro de auditoría).

3. 🔴 **Cuentas y Saldo**

   * 🔴 Múltiples cuentas (efectivo, bancos, tarjetas, inversiones) con saldos independientes.
   * 🔴 Transferencias entre cuentas internas.
   * 🔴 Cálculo de saldo actualizado y balance general.

4. 🔴 **Presupuestos y Metas**

   * 🔴 Crear presupuestos por categoría y periodo.
   * 🔴 Seguimiento y alertas cuando se acerque o exceda un presupuesto.
   * 🔴 Definir metas de ahorro con plazos y seguimiento del progreso.

5. 🔴 **Categorías y Etiquetas**

   * 🔴 Gestión de categorías (crear/editar/eliminar) y subcategorías.
   * 🔴 Etiquetas personalizadas para filtrar y agrupar transacciones.

6. 🔴 **Reportes y Visualizaciones**

   * 🔴 Reportes por periodo: resumen de ingresos/gastos, comparativas mensuales.
   * 🔴 Gráficas (torta, barras, líneas) para visualización de gastos por categoría y evolución de saldo.
   * 🔴 Exportar reportes a CSV/PDF.

7. 🔴 **Importación/Exportación**

   * 🔴 Importar movimientos desde CSV/OFX (formato básico para bancos).
   * 🔴 Exportar historial en CSV para análisis externo.

8. 🔴 **Historial y Búsqueda**

   * 🔴 Almacenamiento persistente de transacciones en base de datos.
   * 🔴 Buscar y filtrar por fecha, categoría, cuenta, etiqueta o monto.

9. 🔴 **Seguridad y Privacidad**

   * ✅ Almacenamiento de contraseñas con hashing seguro (bcrypt/argon2).
   * 🔴 Validaciones y sanitización de entradas para evitar inyección SQL/XSS.
   * 🔴 Configuración de roles básicos (usuario, admin) y políticas de acceso.

10. ⚙️ **Extras Opcionales**

* Integración con APIs bancarias (open-banking) — opcional y sujeto a regulaciones.
* Multi-moneda con conversión de tasas.
* Notificaciones por email sobre movimientos importantes o alertas de presupuesto.

## Documentación Requerida

1. **Manual Técnico**

   * Descripción de la arquitectura del sistema.
   * Tecnologías utilizadas y justificación.
   * Instrucciones de despliegue en servidor local y producción (Ubuntu 22.04 + Nginx + Gunicorn/PM2).
   * Diagramas: arquitectura, flujo de datos y modelo ER de la base de datos.

2. **Manual de Usuario**

   * Guía para crear cuenta, añadir transacciones, configurar cuentas y generar reportes.

3. **Documentación del Código**

   * Comentarios explicativos en partes críticas del código.
   * Estructura del proyecto y guía para desarrolladores.

## Requisitos Técnicos

* **Backend:** Python (Flask o FastAPI) o Node.js (Express) — con endpoints REST y/o GraphQL.
* **Frontend:** HTML, CSS (Tailwind o Bootstrap recomendado), JavaScript (vanilla o con framework ligero: Vue/React).
* **Base de Datos:** MySQL o PostgreSQL (SQLAlchemy / ORM recomendado).
* **Autenticación:** JWT con refresh tokens o sesiones seguras.
* **Control de Versiones:** Git (GitHub/GitLab privado).
* **Despliegue:** Soportar despliegue en Ubuntu 22.04 con Nginx + Gunicorn/PM2/Docker.

## Límites del Proyecto (No incluido)

* No se exige aplicación móvil nativa (solo interfaz web responsiva).
* No se implementa cifrado de extremo a extremo de datos.
* Integraciones bancarias avanzadas quedan como fase 2 (por regulaciones y permisos).

## Entregables Finales

1. Código fuente completo en repositorio privado.
2. Documentación técnica y manual de usuario.
3. Scripts SQL para crear la base de datos y datos de prueba.
4. Instrucciones y/o scripts para despliegue (Dockerfiles / run.sh / systemd units).
5. Demo funcional en servidor de pruebas (si es posible) o instrucciones para levantar localmente.

## Estructura de Carpetas Sugerida

```bash
finance-app/
│
├── backend/
│   ├── app.py              # Punto de entrada (Flask/FastAPI)
│   ├── config.py           # Configuración (DB, secrets)
│   ├── models.py           # Modelos ORM (usuarios, transacciones, cuentas, presupuestos)
│   ├── routes/             # Rutas HTTP (auth, transacciones, reportes)
│   ├── services/           # Lógica de negocio (importadores, cálculos)
│   ├── utils/              # Helpers (auth, validaciones)
│   └── tests/              # Pruebas unitarias
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── static/
│   │   ├── css/            # Tailwind / estilos
│   │   ├── js/             # auth.js, transactions.js, reports.js
│   │   └── img/
│   └── templates/          # (opcional si usas Jinja)
│
├── docs/
│   ├── manual_tecnico.md
│   ├── manual_usuario.md
│   └── arquitectura.png
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── .env
├── requirements.txt
├── README.md
└── run.sh
```

---

> Si querés, parce, puedo ahora:
>
> * Generar el **README.md** listo para tu repositorio.
> * Crear los **scripts SQL (schema + seed)** básicos.
> * Escribir la **estructura inicial del backend** (app.py, models.py) y un frontend de ejemplo (index.html + chat-like dashboard) para que arranques.

Decime cuál de esas opciones querés que haga ahora y me lanzo a ello.

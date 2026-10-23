# ZOLVANI — Logo responsivo (kit de marca)

Este kit contiene variantes reales del logotipo ZOLVANI inspiradas en el diseño de marca aportado.
No es una imagen estática de una tabla de tamaños: contiene recursos independientes y código adaptativo.

## Archivos

- `assets/zolvani-horizontal.png`: barra superior y menús de escritorio.
- `assets/zolvani-vertical.png`: pantallas medianas, presentaciones y publicaciones.
- `assets/zolvani-simbolo-512.png` / `-1024.png`: icono de navegación móvil.
- `assets/zolvani-texto.png`: solo nombre.
- `assets/zolvani-horizontal-claro.png` y `zolvani-vertical-claro.png`: versiones oscuras sobre fondos claros.
- `assets/zolvani-icono-*.png`: favicon y PWA, 16–512 píxeles.
- `assets/favicon.ico`: icono clásico de navegador.
- `VISTA_PREVIA.html`: vista responsiva offline, abre con doble clic.
- `USO_EN_HTML.html`: elemento picture con breakpoints 780/480 px.
- `zolvani-logo.css`: estilos de tamaño responsivo.

## Integrar en Z:\Zolvani

1. Copia `assets/` dentro de `Z:\Zolvani\app\assets\` (crea esa carpeta).
2. Copia `zolvani-logo.css` a `Z:\Zolvani\app\zolvani-logo.css`.
3. En `app/index.html`, coloca el enlace del stylesheet y los iconos en `<head>`.
4. Reemplaza el contenedor `.brand` con el elemento `<a class="zolvani-logo">…</a>` de `USO_EN_HTML.html`.
5. Comienza con el logo horizontal, y usa el simbolo compacto en pantallas <= 480 px.
6. Antes de cambiar archivos versionados: verifica `git status`, crea un commit de seguridad, y prueba la interfaz.

Para la versión inicial Zolvani de octubre de 2026, el servidor local entrega las rutas bajo `app/` como `/<archivo>`.

## Colores

- #2B0D12 burgundy base
- #4E242A fondo secundario
- #733B44 vino acento
- #BA9985 cobre premium
- #AB8978 cobre tenue
- #F2E7E0 blanco cálido

## Notas

- Las imágenes PNG son recursos raster transparentes, NO son SVG vectoriales.
- No uses la versión rosé-metalizada sobre fondos beige muy claros: utiliza el PNG oscuro alternativo.
- Estas variantes son derivaciones visuales de las propuestas previas y pueden mostrar leves diferencias respecto a la foto original. Para trazado vectorial exacto se necesita el logo vector original.

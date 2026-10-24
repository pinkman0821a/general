# Catálogo local de productos Zolvani

## Alcance y privacidad

Las referencias se guardan en `data/state.json` en el equipo local. El archivo permanece cubierto por `.gitignore`; Zolvani no sincroniza fichas a GitHub. La aplicación no compra productos, crea pedidos, publica anuncios ni consulta cuentas de proveedores. No introduzcas datos personales de clientes.

Las fichas de demostración antiguas se conservan identificadas como ficticias. Las fichas nuevas no se consideran reales ni autorizadas por el hecho de guardarlas.

## Registro manual y procedencia

En **Productos** registra nombre, categoría, proveedor, código de referencia, URL opcional, disponibilidad y costos/precio propuesto en pesos enteros COP. Un campo vacío significa **desconocido**, nunca cero. Para registrar un costo explícitamente nulo (por ejemplo, una comisión que el proveedor confirmó en cero), escribe `0`.

La fuente y fecha se guardan individualmente por cada dato no vacío. El campo de fuente de la ficha se copia a la procedencia de los valores que se ingresan juntos. Si se marca la confirmación, queda registrada como declaración del propietario; no es una verificación independiente de Zolvani. Para corregir o actualizar un precio, edita la ficha, indica la nueva fuente y fecha; la ficha conserva el valor anterior y el origen anterior en su historial.

El Inspector señala campos obligatorios, fuentes ausentes, datos que el propietario no confirmó, fechas mayores a 30 días, disponibilidad desconocida, rentabilidad parcial y categorías con posible revisión regulatoria. Sus reglas orientan la revisión: no son una aprobación legal ni de venta.

## Importar CSV

1. Descarga **Plantilla CSV** desde el panel o usa `GET /api/products/template.csv`.
2. Usa UTF-8 y separador coma. La primera fila contiene encabezados Zolvani exactos. Los campos de texto con comas deben ir entre comillas dobles; dentro de una celda, duplica las comillas.
3. Una columna `fuente_<campo>` acompaña a cada dato (excepto la fecha común `fecha_verificacion`). Una fuente vacía permanece sin verificar. La importación no marca datos como confirmados.
4. Sube el archivo desde la vista Productos. El backend acepta hasta 2 MB y 500 filas. Rechaza encabezados faltantes o extra, filas irregulares, referencias duplicadas, importes que no sean enteros COP y celdas que empiecen por `=`, `+`, `-` o `@`.
5. Revisa los hallazgos y confirma los datos manualmente si corresponde.

Encabezados de la plantilla:

```csv
nombre,categoria,proveedor,codigo_proveedor,url_origen,costo_cop,precio_venta_cop,flete_cop,comision_cop,empaque_cop,publicidad_cop,otros_costos_cop,tasa_rechazo_bps,perdida_por_rechazo_cop,disponibilidad,fecha_verificacion,fuente_nombre,fuente_categoria,fuente_proveedor,fuente_codigo_proveedor,fuente_url_origen,fuente_costo_cop,fuente_precio_venta_cop,fuente_flete_cop,fuente_comision_cop,fuente_empaque_cop,fuente_publicidad_cop,fuente_otros_costos_cop,fuente_tasa_rechazo_bps,fuente_perdida_por_rechazo_cop,fuente_disponibilidad
```

Valores de disponibilidad sugeridos: `disponible`, `limitada`, `agotada` o `desconocida`. `tasa_rechazo_bps` es una proporción en puntos base (100 = 1%, 500 = 5%, 10000 = 100%) y solo se usa junto con `perdida_por_rechazo_cop`. Ambos se muestran como supuesto declarado, no como dato de mercado por defecto.

## Rentabilidad

La calculadora determinista usa precio de venta menos adquisición, flete, comisión, empaque, publicidad y otros costos conocidos. Si falta adquisición o el precio de venta es cero/desconocido, no calcula. Si faltan otros costos, muestra una contribución **parcial** que resta solo los importes conocidos y enumera faltantes; no la llama utilidad final. El margen es la contribución dividida por el precio de venta. Una sensibilidad muestra qué pasa si los costos conocidos suben 10%; no estima inflación ni comportamiento real del proveedor.

Si se aportan tasa de rechazo/devolución y pérdida por evento, aplica el valor esperado determinista `tasa × pérdida`, identificado en pantalla como supuesto del propietario. No añade gastos al presupuesto comercial de COP 130.000; el gasto registrado permanece en cero hasta que el propietario lo registre fuera de una acción automática.

## Análisis coordinado

Selecciona una o varias fichas y pulsa **Analizar selección con la Reina**. Se crea un objetivo real con hasta cuatro llamadas al proveedor configurado: Reina, Exploradora, Financiera e Inspectora, en serie. Esto puede consumir la cuota gratuita vigente. El backend no inicia el análisis si la IA está deshabilitada, no repite automáticamente una llamada y bloquea posibles correos, teléfonos o credenciales en las fichas que se enviarían.

La Reina adjunta una instantánea de los datos y sus procedencias. Las celdas son contenido externo no confiable; una instrucción escrita dentro de un nombre, fuente o evidencia no concede herramientas al modelo. La aplicación no proporciona navegación web. Las respuestas de IA no verifican demanda, proveedor, precios ni inventario. La Financiera recibe los cálculos locales; cualquier importe en su respuesta debe coincidir con cifras de catálogo/cálculo. El panel siempre conserva la aprobación final en manos del propietario.

## Dropi

Consulta oficial realizada el 2026-10-23. El sitio oficial describe catálogo dentro de su plataforma e integraciones de negocio. La búsqueda también encontró el subdominio oficial `https://api.dropi.co/`, cuya raíz pública solo muestra “Api Dropi”; no ofrece allí una especificación consultable, autenticación, alcances ni endpoints de productos/precios/inventario. Por eso no se ha podido verificar una ruta documentada y autorizada para Zolvani. La existencia del subdominio puede indicar una API operativa o privada, no confirma que el propietario tenga acceso autorizado para lectura de catálogo. Queda pendiente pedir documentación y permisos aplicables directamente a Dropi; Zolvani no sondeará rutas no documentadas.

Mientras tanto, Dropi se conserva como **fuente manual**: el propietario puede transcribir una referencia y precio observado, con código, fecha y URL/evidencia permitida. No se automatiza login ni extracción. Los términos oficiales describen restricciones a automatizaciones indebidas y extracción masiva de información del ecosistema; por eso Zolvani no hará scraping ni usará endpoints privados.

- [Catálogo e integraciones oficiales](https://dropi.co/)
- [Subdominio oficial Api Dropi (raíz sin documentación de catálogo)](https://api.dropi.co/)
- [Soluciones oficiales para proveedores](https://www.dropi.co/soluciones-para-proveedores)
- [Términos oficiales de Dropi](https://dropi.co/terminos-y-condiciones)

La integración se reevalúa solo cuando exista documentación vigente, autorización para la cuenta del propietario y condiciones claras de privacidad y uso.

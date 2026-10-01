import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIMITE = 300;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceosRoot = path.resolve(__dirname, "..", "..");

const extensionesPermitidas = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".sql",
  ".json",
  ".jsonc",
  ".yml",
  ".yaml",
  ".md",
  ".html",
]);

const carpetasIgnoradas = new Set([
  "node_modules",
  "dist",
  ".git",
  ".wrangler",
  "coverage",
  ".vite",
]);

const archivosIgnorados = new Set([
  "package-lock.json",
  "worker-configuration.d.ts",
]);

function recorrerCarpeta(carpeta, archivos = []) {
  const elementos = fs.readdirSync(carpeta, {
    withFileTypes: true,
  });

  for (const elemento of elementos) {
    if (elemento.isDirectory() && carpetasIgnoradas.has(elemento.name)) {
      continue;
    }

    const rutaCompleta = path.join(carpeta, elemento.name);

    if (elemento.isDirectory()) {
      recorrerCarpeta(rutaCompleta, archivos);

      continue;
    }

    if (archivosIgnorados.has(elemento.name)) {
      continue;
    }

    const extension = path.extname(elemento.name);

    if (!extensionesPermitidas.has(extension)) {
      continue;
    }

    archivos.push(rutaCompleta);
  }

  return archivos;
}

function contarLineas(ruta) {
  const contenido = fs.readFileSync(ruta, "utf8");

  if (contenido.length === 0) {
    return 0;
  }

  return contenido.replace(/\r\n/g, "\n").split("\n").length;
}

const archivos = recorrerCarpeta(serviceosRoot);

const resultados = archivos
  .map((ruta) => ({
    ruta,
    lineas: contarLineas(ruta),
  }))
  .sort((a, b) => b.lineas - a.lineas);

const excedidos = resultados.filter((archivo) => archivo.lineas > LIMITE);

console.log("");
console.log("ServiceOS - Control de líneas");
console.log("============================");
console.log(`Archivos revisados: ${resultados.length}`);
console.log(`Límite por archivo: ${LIMITE}`);
console.log("");

if (excedidos.length > 0) {
  console.log("ARCHIVOS QUE SUPERAN EL LÍMITE:");
  console.log("");

  for (const archivo of excedidos) {
    const relativa = path.relative(serviceosRoot, archivo.ruta);

    console.log(`❌ ${relativa} — ${archivo.lineas} líneas`);
  }

  console.log("");
  console.log("La versión NO está lista para commit.");

  process.exit(1);
}

console.log("✅ Ningún archivo supera 300 líneas.");
console.log("");
console.log("Archivos más grandes:");
console.log("");

for (const archivo of resultados.slice(0, 10)) {
  const relativa = path.relative(serviceosRoot, archivo.ruta);

  console.log(`${archivo.lineas.toString().padStart(3)}  ${relativa}`);
}

console.log("");
console.log("✅ Comprobación de líneas superada.");

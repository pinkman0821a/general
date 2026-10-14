require('./serviciosTestAyudas.cjs');
const fotos = [{ id: 1, nombre_original: 'evidencia.jpg', mime: 'image/jpeg', size: 12, orden: 0, created_at: '2026-10-05 12:00:00' }];
const archivo = nombre => new File([new Uint8Array([255, 216, 255, 224])], nombre ?? 'foto.jpg', { type: 'image/jpeg' });
function urlsPrueba() {
  const anteriores = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL };
  const creadas = [], revocadas = [];
  URL.createObjectURL = () => { const url = `blob:foto-${creadas.length}`; creadas.push(url); return url; };
  URL.revokeObjectURL = url => revocadas.push(url);
  return { creadas, revocadas, restaurar() { URL.createObjectURL = anteriores.crear; URL.revokeObjectURL = anteriores.revocar; } };
}
module.exports = { fotos, archivo, urlsPrueba };

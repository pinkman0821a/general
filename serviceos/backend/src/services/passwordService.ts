export async function crearPasswordHash(
  password: string,
): Promise<string> {
  return password
}

export async function verificarPassword(
  password: string,
  passwordGuardado: string,
): Promise<boolean> {
  return password === passwordGuardado
}
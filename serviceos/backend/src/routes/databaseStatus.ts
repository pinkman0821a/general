type AppInfoRow = {
  nombre: string
  version: string
}

export async function databaseStatusResponse(
  env: Env,
): Promise<Response> {
  try {
    const appInfo = await env.DB
      .prepare(`
        SELECT nombre, version
        FROM app_info
        ORDER BY id ASC
        LIMIT 1
      `)
      .first<AppInfoRow>()

    if (!appInfo) {
      return Response.json(
        {
          status: 'error',
          database: 'connected',
          message: 'La tabla app_info está vacía',
        },
        {
          status: 500,
        },
      )
    }

    return Response.json({
      status: 'ok',
      database: 'connected',
      app: appInfo.nombre,
      version: appInfo.version,
    })
  } catch {
    return Response.json(
      {
        status: 'error',
        database: 'disconnected',
      },
      {
        status: 500,
      },
    )
  }
}
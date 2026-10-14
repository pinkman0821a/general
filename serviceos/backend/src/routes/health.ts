export function healthResponse(): Response {
  return Response.json({
    status: 'ok',
    app: 'ServiceOS',
    version: '0.3.0-rc.2',
  })
}
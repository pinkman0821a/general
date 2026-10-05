export function healthResponse(): Response {
  return Response.json({
    status: 'ok',
    app: 'ServiceOS',
    version: '0.2.0',
  })
}
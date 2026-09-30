export function healthResponse(): Response {
  return Response.json({
    status: 'ok',
    app: 'ServiceOS',
    version: '0.0.8',
  })
}
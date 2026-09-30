import { useEffect, useState } from 'react'

import { getHealth } from '../services/apiService'

function ApiStatus() {
  const [estado, setEstado] = useState('Conectando...')
  const [version, setVersion] = useState('')

  useEffect(() => {
    async function comprobarApi() {
      try {
        const respuesta = await getHealth()

        setEstado(
          respuesta.status === 'ok'
            ? 'Backend conectado'
            : 'Backend con problema',
        )

        setVersion(respuesta.version)
      } catch {
        setEstado('Backend desconectado')
      }
    }

    comprobarApi()
  }, [])

  return (
    <div className="api-status">
      <span className="api-status-dot" />

      <div>
        <strong>{estado}</strong>

        {version && (
          <span>API v{version}</span>
        )}
      </div>
    </div>
  )
}

export default ApiStatus
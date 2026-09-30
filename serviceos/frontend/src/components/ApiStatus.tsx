import {
  CircleCheck,
  CircleX,
  LoaderCircle,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import {
  obtenerEstadoApi,
  type ApiHealth,
} from '../services/apiService'

type EstadoConexion =
  | 'cargando'
  | 'conectado'
  | 'desconectado'

function ApiStatus() {
  const [estado, setEstado] =
    useState<EstadoConexion>('cargando')

  const [api, setApi] =
    useState<ApiHealth | null>(null)

  useEffect(() => {
    async function comprobarApi() {
      try {
        const resultado = await obtenerEstadoApi()

        setApi(resultado)
        setEstado('conectado')
      } catch {
        setApi(null)
        setEstado('desconectado')
      }
    }

    comprobarApi()
  }, [])

  if (estado === 'cargando') {
    return (
      <div className="api-status loading">
        <LoaderCircle size={14} />
        <span>Conectando...</span>
      </div>
    )
  }

  if (estado === 'desconectado') {
    return (
      <div className="api-status offline">
        <CircleX size={14} />
        <span>API desconectada</span>
      </div>
    )
  }

  return (
    <div
      className="api-status online"
      title={`ServiceOS API ${api?.version}`}
    >
      <CircleCheck size={14} />
      <span>API conectada</span>
    </div>
  )
}

export default ApiStatus
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

function QuickAction() {
  return (
    <section className="quick-action">
      <div>
        <span>Nueva asignación</span>

        <h2>¿Necesitas programar un servicio?</h2>

        <p>
          Consulta la disponibilidad del equipo y asigna un nuevo trabajo.
        </p>
      </div>

      <Link to="/servicios?nuevo=1" className="primary-button">
        <Plus size={18} />
        Crear servicio
      </Link>
    </section>
  )
}

export default QuickAction

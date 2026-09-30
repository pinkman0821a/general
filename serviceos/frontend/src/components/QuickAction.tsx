import { Plus } from 'lucide-react'

function QuickAction() {
  return (
    <section className="quick-action">
      <div>
        <span>Nueva asignación</span>

        <h2>¿Necesitas programar un servicio?</h2>

        <p>
          Desde aquí podrás crear servicios y después
          ServiceOS mostrará los técnicos disponibles.
        </p>
      </div>

      <button className="primary-button">
        <Plus size={18} />
        Crear servicio
      </button>
    </section>
  )
}

export default QuickAction
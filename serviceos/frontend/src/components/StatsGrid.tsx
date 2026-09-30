import { resumen } from '../data/dashboardData'

function StatsGrid() {
  return (
    <section className="stats">
      {resumen.map((item) => {
        const Icono = item.icono

        return (
          <article className="stat-card" key={item.titulo}>
            <div className="stat-top">
              <div className="stat-icon">
                <Icono size={20} />
              </div>

              <span>{item.titulo}</span>
            </div>

            <strong>{item.valor}</strong>
            <small>{item.detalle}</small>
          </article>
        )
      })}
    </section>
  )
}

export default StatsGrid
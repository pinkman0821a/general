import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import DetalleTecnico from "../components/DetalleTecnico";
import TarjetaTecnico from "../components/TarjetaTecnico";

import { listarTecnicos, type Tecnico } from "../services/tecnicosService";

import "../styles/tecnicos.css";

type FiltroEstado = "todos" | "activos" | "inactivos";

function filtrarTecnicos(
  tecnicos: Tecnico[],
  busqueda: string,
  filtro: FiltroEstado,
) {
  const texto = busqueda.trim().toLowerCase();

  return tecnicos.filter((tecnico) => {
    const coincideBusqueda =
      !texto ||
      tecnico.nombre.toLowerCase().includes(texto) ||
      tecnico.user.toLowerCase().includes(texto);

    const coincideEstado =
      filtro === "todos" ||
      (filtro === "activos" && tecnico.activo === 1) ||
      (filtro === "inactivos" && tecnico.activo === 0);

    return coincideBusqueda && coincideEstado;
  });
}

function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

  const [seleccionado, setSeleccionado] = useState<Tecnico | null>(null);

  const [busqueda, setBusqueda] = useState("");

  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarTecnicos() {
      try {
        const lista = await listarTecnicos();

        setTecnicos(lista);

        if (lista.length > 0) {
          setSeleccionado(lista[0]);
        }
      } catch (errorCarga) {
        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No se pudieron cargar los técnicos",
        );
      } finally {
        setCargando(false);
      }
    }

    cargarTecnicos();
  }, []);

  const tecnicosFiltrados = useMemo(
    () => filtrarTecnicos(tecnicos, busqueda, filtro),
    [tecnicos, busqueda, filtro],
  );

  const seleccionVisible =
    tecnicosFiltrados.find((tecnico) => tecnico.id === seleccionado?.id) ??
    tecnicosFiltrados[0] ??
    null;

  function actualizarFiltros(nuevaBusqueda: string, nuevoFiltro: FiltroEstado) {
    const visibles = filtrarTecnicos(tecnicos, nuevaBusqueda, nuevoFiltro);

    setBusqueda(nuevaBusqueda);
    setFiltro(nuevoFiltro);
    setSeleccionado(
      visibles.find((tecnico) => tecnico.id === seleccionVisible?.id) ??
        visibles[0] ??
        null,
    );
  }

  return (
    <div className="technicians-page">
      <div className="technicians-heading">
        <div>
          <p className="eyebrow">Equipo técnico</p>

          <h1>Técnicos</h1>

          <span>Consulta la información operativa de tu equipo.</span>
        </div>
      </div>

      <div className="technicians-toolbar">
        <label className="technicians-search">
          <Search size={18} />

          <input
            type="search"
            placeholder="Buscar técnico..."
            value={busqueda}
            onChange={(evento) => {
              actualizarFiltros(evento.target.value, filtro);
            }}
          />
        </label>

        <div className="technicians-filters">
          {(
            [
              ["todos", "Todos"],
              ["activos", "Activos"],
              ["inactivos", "Inactivos"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              type="button"
              key={valor}
              className={filtro === valor ? "active" : ""}
              onClick={() => {
                actualizarFiltros(busqueda, valor);
              }}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="technicians-error">{error}</p>}

      {cargando ? (
        <p className="technicians-empty">Cargando técnicos...</p>
      ) : (
        <div className="technicians-layout">
          <section className="technicians-list">
            {tecnicosFiltrados.length > 0 ? (
              tecnicosFiltrados.map((tecnico) => (
                <TarjetaTecnico
                  key={tecnico.id}
                  tecnico={tecnico}
                  seleccionado={seleccionVisible?.id === tecnico.id}
                  seleccionar={() => {
                    setSeleccionado(tecnico);
                  }}
                />
              ))
            ) : (
              <p className="technicians-empty">
                No hay técnicos que coincidan.
              </p>
            )}
          </section>

          {seleccionVisible && <DetalleTecnico tecnico={seleccionVisible} />}
        </div>
      )}
    </div>
  );
}

export default TecnicosPage;

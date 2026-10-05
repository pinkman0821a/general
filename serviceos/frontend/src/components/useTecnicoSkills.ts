import { useEffect, useRef, useState } from "react";
import {
  asignarSkill,
  crearSkill,
  listarCatalogoSkills,
  listarSkillsTecnico,
  quitarSkill,
  type Skill,
} from "../services/skillsService";

function mensajeError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}

function ordenar(skills: Skill[]) {
  return [...skills].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// El componente se monta con key={tecnicoId} para aislar cada ficha.
export function useTecnicoSkills(tecnicoId: number) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [catalogo, setCatalogo] = useState<Skill[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");
  const [operacion, setOperacion] = useState("");
  const [seleccion, setSeleccion] = useState("");
  const [recarga, setRecarga] = useState(0);
  const activo = useRef(false);
  const bloqueado = useRef(false);

  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; };
  }, []);

  useEffect(() => {
    let vigente = true;

    listarSkillsTecnico(tecnicoId)
      .then((lista) => { if (vigente) setSkills(lista); })
      .catch((error: unknown) => { if (vigente) setErrorCarga(mensajeError(error)); })
      .finally(() => { if (vigente) setCargando(false); });

    listarCatalogoSkills()
      .then((lista) => { if (vigente) setCatalogo(lista); })
      .catch((error: unknown) => { if (vigente) setErrorCatalogo(mensajeError(error)); })
      .finally(() => { if (vigente) setCargandoCatalogo(false); });

    return () => { vigente = false; };
  }, [tecnicoId, recarga]);

  async function ejecutar(nombre: string, accion: () => Promise<void>) {
    if (bloqueado.current || !activo.current) return false;
    bloqueado.current = true;
    setOperacion(nombre);
    setErrorOperacion("");
    try {
      await accion();
      return activo.current;
    } catch (error) {
      if (activo.current) setErrorOperacion(mensajeError(error));
      return false;
    } finally {
      bloqueado.current = false;
      if (activo.current) setOperacion("");
    }
  }

  const disponibles = catalogo.filter((skill) => !skills.some((s) => s.id === skill.id));

  function asignar() {
    const skill = disponibles.find((s) => String(s.id) === seleccion);
    if (!skill || cargando || errorCarga) return;
    return ejecutar("Asignando skill...", async () => {
      await asignarSkill(tecnicoId, skill.id);
      if (activo.current) {
        setSkills((lista) => ordenar([...lista, skill]));
        setSeleccion("");
      }
    });
  }

  function quitar(skillId: number) {
    return ejecutar("Quitando skill...", async () => {
      await quitarSkill(tecnicoId, skillId);
      if (activo.current) setSkills((lista) => lista.filter((s) => s.id !== skillId));
    });
  }

  function crear(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio || cargandoCatalogo || errorCatalogo) return Promise.resolve(false);
    if (catalogo.some((s) => s.nombre.toLowerCase() === limpio.toLowerCase())) {
      setErrorOperacion("Esa skill ya existe. Selecciónala en el catálogo.");
      return Promise.resolve(false);
    }
    return ejecutar("Creando skill...", async () => {
      const skill = await crearSkill(limpio);
      if (activo.current) {
        setCatalogo((lista) => ordenar([...lista, skill]));
        setSeleccion(String(skill.id));
      }
    });
  }

  function reintentar() {
    if (bloqueado.current || cargando || cargandoCatalogo) return;
    setCargando(true);
    setCargandoCatalogo(true);
    setErrorCarga("");
    setErrorCatalogo("");
    setErrorOperacion("");
    setRecarga((valor) => valor + 1);
  }

  return {
    skills, disponibles, cargando, cargandoCatalogo,
    errorCarga, errorCatalogo, errorOperacion, operacion,
    seleccion, setSeleccion, asignar, quitar, crear,
    reintentar,
  };
}

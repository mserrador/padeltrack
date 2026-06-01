import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const MisGrupos = () => {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);

  const fetchGrupos = async () => {
    try {
      const respuesta = await api.get('grupos/');
      const data = respuesta.data;
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.grupos)
            ? data.grupos
            : [];
      setGrupos(lista);
    } catch (error) {
      console.error('Error al cargar los grupos:', error);
      setGrupos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  const crearGrupo = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombreGrupo.trim();

    if (nombreLimpio.length < 3) {
      alert('El nombre del grupo debe tener al menos 3 caracteres.');
      return;
    }

    setGuardandoGrupo(true);
    try {
      await api.post('grupos/', { nombre: nombreLimpio });
      setNombreGrupo('');
      setMostrarFormulario(false);
      await fetchGrupos();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje = Array.isArray(detalle?.nombre)
        ? detalle.nombre[0]
        : detalle?.detail || 'No se pudo crear el grupo.';
      alert(mensaje);
    } finally {
      setGuardandoGrupo(false);
    }
  };

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  return (
    <div>
      <div className="panel-head d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Mis Grupos</h2>
        <button className="btn btn-success" onClick={() => setMostrarFormulario((v) => !v)}>
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Grupo'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card p-3 mb-4">
          <form onSubmit={crearGrupo}>
            <label className="form-label fw-bold">Nombre del grupo</label>
            <div className="d-flex flex-column flex-md-row gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Padel Uni Jueves"
                value={nombreGrupo}
                onChange={(e) => setNombreGrupo(e.target.value)}
                minLength={3}
                required
              />
              <button type="submit" className="btn btn-success" disabled={guardandoGrupo}>
                {guardandoGrupo ? 'Creando...' : 'Crear grupo'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="row">
        {grupos.length === 0 ? (
          <p className="text-muted text-center">Aún no tienes grupos. ¡Crea uno para empezar a jugar!</p>
        ) : (
          grupos.map((grupo) => (
            <div className="col-12 col-md-6 col-lg-4 mb-3" key={grupo.id}>
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title fw-bold">{grupo.nombre}</h5>
                  <p className="card-text text-muted small mb-4">
                    Creado el: {new Date(grupo.fecha_creacion).toLocaleDateString()}
                  </p>
                  <Link to={`/grupos/${grupo.id}`} className="btn btn-outline-success mt-auto">
                    Ver Sesiones
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MisGrupos;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const MisGrupos = () => {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Llamada a tu API de Django cuando el componente se monta
    const fetchGrupos = async () => {
      try {
        const respuesta = await api.get('grupos/');
        setGrupos(respuesta.data);
      } catch (error) {
        console.error("Error al cargar los grupos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchGrupos();
  }, []);

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Mis Comunidades</h2>
        <button className="btn btn-success">+ Nuevo Grupo</button>
      </div>

      <div className="row">
        {grupos.length === 0 ? (
          <p className="text-muted text-center">Aún no tienes grupos. ¡Crea uno para empezar a jugar!</p>
        ) : (
          grupos.map((grupo) => (
            <div className="col-12 col-md-6 col-lg-4 mb-3" key={grupo.id}>
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title fw-bold text-dark">{grupo.nombre}</h5>
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
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import BalanceGlobal from '../components/BalanceGlobal';

const DetalleGrupo = () => {
  const { id } = useParams(); // Capturamos la ID de la URL
  const [grupo, setGrupo] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        // Ejecutamos ambas peticiones a la vez para reducir el tiempo de espera
        const [resGrupo, resSesiones] = await Promise.all([
          api.get(`grupos/${id}/`),
          api.get('sesiones/') // Traemos las sesiones
        ]);
        
        setGrupo(resGrupo.data);
        
        // Filtramos para quedarnos solo con las sesiones de ESTE grupo
        const sesionesFiltradas = resSesiones.data.filter(s => s.grupo === parseInt(id));
        setSesiones(sesionesFiltradas);
      } catch (error) {
        console.error("Error al cargar el grupo:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, [id]);

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  if (!grupo) {
    return <div className="alert alert-danger mt-4">Grupo no encontrado.</div>;
  }

  return (
    <div>
      {/* Cabecera del Grupo */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/" className="text-decoration-none text-muted mb-2 d-block">← Volver a Mis Grupos</Link>
          <h2 className="fw-bold mb-0">{grupo.nombre}</h2>
        </div>
        <button className="btn btn-success">+ Nueva Sesión</button>
      </div>

      {/* Listado de Sesiones */}
      <h4 className="mb-3">Historial de Sesiones</h4>
      {sesiones.length === 0 ? (
        <div className="card border-0 shadow-sm p-4 text-center bg-white">
          <p className="text-muted mb-0">No hay sesiones organizadas aún. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className="list-group shadow-sm">
          {sesiones.map((sesion) => (
            <Link 
              to={`/sesiones/${sesion.id}`} 
              key={sesion.id} 
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
            >
              <div>
                <h6 className="mb-1 fw-bold">{sesion.lugar}</h6>
                <small className="text-muted">
                  {sesion.fecha_hora ? new Date(sesion.fecha_hora).toLocaleDateString() : 'Fecha por definir'}
                </small>
              </div>
              <span className={`badge rounded-pill ${
                sesion.estado === 'PLANIFICADA' ? 'bg-warning text-dark' : 
                sesion.estado === 'EN_CURSO' ? 'bg-success' : 'bg-secondary'
              }`}>
                {sesion.estado.replace('_', ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
      <BalanceGlobal grupoId={id} />
    </div>
    
  );
};

export default DetalleGrupo;
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import MarcadorClasico from '../components/MarcadorClasico';
import MarcadorMiniPartido from '../components/MarcadorMiniPartido';
import ResumenEconomico from '../components/ResumenEconomico';

const DetalleSesion = () => {
  const { id } = useParams();
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const MI_USUARIO_ID = 1; // Simulación

  const fetchSesion = async () => {
    try {
      const respuesta = await api.get(`sesiones/${id}/`);
      setSesion(respuesta.data);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchSesion();
  }, [id]);

  const handleAsistencia = async (estado) => {
    try {
      const asistenciaExistente = sesion.asistentes.find(a => a.usuario === MI_USUARIO_ID);
      if (asistenciaExistente) {
        await api.patch(`asistencias/${asistenciaExistente.id}/`, { estado_asistencia: estado });
      } else {
        await api.post('asistencias/', { sesion: id, usuario: MI_USUARIO_ID, estado_asistencia: estado });
      }
      fetchSesion();
    } catch (error) {
      console.error("Error al registrar asistencia:", error);
    }
  };

  const cambiarEstadoSesion = async (nuevoEstado) => {
    const mensaje = nuevoEstado === 'EN_CURSO' 
      ? "¿Activar sesión? Se bloqueará la asistencia." 
      : "¿Finalizar partido e ir a los pagos?";
      
    if(window.confirm(mensaje)) {
      try {
        await api.patch(`sesiones/${id}/`, { estado: nuevoEstado });
        fetchSesion();
      } catch (error) {
        console.error("Error al cambiar estado:", error);
      }
    }
  };

  if (cargando) return <div className="text-center mt-5"><div className="spinner-border text-success"></div></div>;
  if (!sesion) return <div className="alert alert-danger mt-4">Sesión no encontrada.</div>;

  // Calculamos cuántos han confirmado
  const confirmados = sesion.asistentes?.filter(a => a.estado_asistencia === 'CONFIRMADO') || [];
  const numConfirmados = confirmados.length;

  return (
    <div>
      <div className="mb-4">
        <Link to={`/grupos/${sesion.grupo}`} className="text-decoration-none text-muted mb-2 d-block">← Volver al Grupo</Link>
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="fw-bold mb-0">{sesion.lugar}</h2>
          <span className={`badge rounded-pill fs-6 ${sesion.estado === 'PLANIFICADA' ? 'bg-warning text-dark' : sesion.estado === 'EN_CURSO' ? 'bg-success' : 'bg-secondary'}`}>
            {sesion.estado.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ESTADO: PLANIFICADA */}
      {sesion.estado === 'PLANIFICADA' && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-3">Gestión de Asistencia</h5>
            <div className="d-flex gap-2 mb-4">
              <button onClick={() => handleAsistencia('CONFIRMADO')} className="btn btn-outline-success w-100 fw-bold">✅ Voy a ir</button>
              <button onClick={() => handleAsistencia('DECLINADO')} className="btn btn-outline-danger w-100 fw-bold">❌ No puedo</button>
            </div>
            
            <h6 className="fw-bold text-secondary">Apuntados ({numConfirmados})</h6>
            <ul className="list-group list-group-flush mb-4">
              {sesion.asistentes?.map(asistente => (
                <li key={asistente.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  {asistente.usuario_nombre}
                  <span className={`badge ${asistente.estado_asistencia === 'CONFIRMADO' ? 'bg-success' : 'bg-danger'}`}>{asistente.estado_asistencia}</span>
                </li>
              ))}
            </ul>

            <button onClick={() => cambiarEstadoSesion('EN_CURSO')} className="btn btn-success w-100 py-3 fw-bold fs-5 shadow-sm">
              🎾 Iniciar Sesión en Pista
            </button>
          </div>
        </div>
      )}

      {/* ESTADO: EN_CURSO */}
      {sesion.estado === 'EN_CURSO' && (
        <div className="mb-4">
          {/* Lógica Automática del Marcador */}
          {numConfirmados === 4 ? (
            <MarcadorClasico asistentes={sesion.asistentes} sesionId={sesion.id} recargarSesion={fetchSesion} />
          ) : numConfirmados > 4 ? (
            <MarcadorMiniPartido asistentes={sesion.asistentes} sesion={sesion} recargarSesion={fetchSesion} />
          ) : (
            <div className="alert alert-danger text-center fw-bold shadow-sm">
              ❌ No hay suficientes jugadores. Se necesitan al menos 4 confirmados para jugar.
            </div>
          )}

          <button onClick={() => cambiarEstadoSesion('FINALIZADA')} className="btn btn-danger w-100 py-3 mt-4 fw-bold shadow-sm">
            🛑 Terminar Partido y Calcular Pagos
          </button>
        </div>
      )}

      {/* ESTADO: FINALIZADA */}
      {sesion.estado === 'FINALIZADA' && (
        <ResumenEconomico sesion={sesion} />
      )}
    </div>
  );
};

export default DetalleSesion;
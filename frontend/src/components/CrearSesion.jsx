import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const CrearSesion = () => {
  const { id } = useParams(); // Captura la ID del grupo de la URL
  const navigate = useNavigate();
  const [datos, setDatos] = useState({ 
    lugar: '', 
    fecha_hora: '', 
    coste_total: '' 
  });

  const obtenerMinimoFechaHora = () => {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset();
    const local = new Date(ahora.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    try {
      // Enviamos el grupo_id (id) en el POST
      await api.post('sesiones/', { 
        ...datos, 
        grupo: id, 
        estado: 'PLANIFICADA' 
      });
      
      // LA CLAVE: Redirigimos de vuelta a la pantalla del grupo específico
      navigate(`/grupos/${id}`); 
    } catch (error) {
      console.error("Error al crear sesión:", error);
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.fecha_hora) ? detalle.fecha_hora[0] : null) ||
        (Array.isArray(detalle?.coste_total) ? detalle.coste_total[0] : null) ||
        detalle?.detail ||
        'No se pudo crear la sesión. Revisa los datos.';
      alert(mensaje);
    }
  };

  const volverAtras = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(`/grupos/${id}`);
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold mb-0">Planificar Partido</h3>
          <button 
            className="btn-close" 
            onClick={volverAtras}
          ></button>
        </div>
        
        <form onSubmit={manejarEnvio}>
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted">¿DÓNDE SE JUEGA?</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nombre del club o pista" 
              onChange={e => setDatos({...datos, lugar: e.target.value})} 
              required 
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted">FECHA Y HORA</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                min={obtenerMinimoFechaHora()}
                onChange={e => setDatos({...datos, fecha_hora: e.target.value})} 
                required 
              />
          </div>
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">COSTE TOTAL DE LA PISTA (€)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                className="form-control" 
                placeholder="Ej: 20.00"
                onChange={e => setDatos({...datos, coste_total: e.target.value})} 
              required 
            />
          </div>
          
          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-success py-2 fw-bold">
              Crear Sesión y Avisar
            </button>
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
               onClick={volverAtras}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearSesion;

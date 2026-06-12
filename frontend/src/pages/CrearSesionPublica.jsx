import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';

const CrearSesionPublica = () => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState({
    lugar: '',
    google_maps_url: '',
    fecha_hora: '',
    coste_total: '',
    plazas_maximas: '4',
    descripcion: '',
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
      const respuesta = await api.post('sesiones-publicas/', {
        ...datos,
        estado: 'PLANIFICADA',
      });
      navigate(`/sesiones-publicas/${respuesta.data.id}`);
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.fecha_hora) ? detalle.fecha_hora[0] : null) ||
        (Array.isArray(detalle?.coste_total) ? detalle.coste_total[0] : null) ||
        (Array.isArray(detalle?.plazas_maximas) ? detalle.plazas_maximas[0] : null) ||
        (Array.isArray(detalle?.google_maps_url) ? detalle.google_maps_url[0] : null) ||
        detalle?.detail ||
        'No se pudo crear la sesión pública.';
      alert(mensaje);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold mb-0">Crear sesión pública</h3>
          <button className="btn-close" onClick={() => navigate('/app')}></button>
        </div>

        <form onSubmit={manejarEnvio}>
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted">LUGAR</label>
            <input type="text" className="form-control" value={datos.lugar} onChange={(e) => setDatos((previo) => ({ ...previo, lugar: e.target.value }))} required />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted">ENLACE DE GOOGLE MAPS (OPCIONAL)</label>
            <input type="url" className="form-control" placeholder="https://maps.google.com/..." value={datos.google_maps_url} onChange={(e) => setDatos((previo) => ({ ...previo, google_maps_url: e.target.value }))} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted">FECHA Y HORA</label>
            <input type="datetime-local" className="form-control" min={obtenerMinimoFechaHora()} value={datos.fecha_hora} onChange={(e) => setDatos((previo) => ({ ...previo, fecha_hora: e.target.value }))} required />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label fw-bold small text-muted">COSTE TOTAL (€)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={datos.coste_total} onChange={(e) => setDatos((previo) => ({ ...previo, coste_total: e.target.value }))} required />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-bold small text-muted">PLAZAS MÁXIMAS</label>
              <input type="number" min="2" step="1" className="form-control" value={datos.plazas_maximas} onChange={(e) => setDatos((previo) => ({ ...previo, plazas_maximas: e.target.value }))} required />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">DESCRIPCIÓN (OPCIONAL)</label>
            <textarea className="form-control" rows="4" value={datos.descripcion} onChange={(e) => setDatos((previo) => ({ ...previo, descripcion: e.target.value }))}></textarea>
          </div>

          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-success py-2 fw-bold">Crear sesión pública</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/app')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearSesionPublica;

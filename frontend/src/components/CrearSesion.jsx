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

  const handleSubmit = async (e) => {
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
      alert("No se pudo crear la sesión. Revisa los datos.");
    }
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold mb-0">Planificar Partido</h3>
          <button 
            className="btn-close" 
            onClick={() => navigate(`/grupo/${id}`)}
          ></button>
        </div>
        
        <form onSubmit={handleSubmit}>
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
              onChange={e => setDatos({...datos, fecha_hora: e.target.value})} 
              required 
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">COSTE TOTAL DE LA PISTA (€)</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-control" 
              placeholder="Ej: 20.00"
              onChange={e => setDatos({...datos, coste_total: e.target.value})} 
              required 
            />
          </div>
          
          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-success py-2 fw-bold">
              🚀 Crear Sesión y Avisar
            </button>
            <button 
              type="button" 
              className="btn btn-link text-muted" 
              onClick={() => navigate(`/grupo/${id}`)}
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
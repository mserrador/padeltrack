import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ResumenEconomico = ({ sesion, recargarSesion }) => {
  const confirmados = sesion.asistentes?.filter(a => a.estado_asistencia === 'CONFIRMADO') || [];
  const numJugadores = confirmados.length;
  const pagoSesion = sesion.pagos?.[0] || null;
  const [pagador, setPagador] = useState(pagoSesion ? String(pagoSesion.usuario_pagador) : '');
  const [guardando, setGuardando] = useState(false);
  
  // Cálculo de división de pagos
  const costeTotal = parseFloat(sesion.coste_total);
  const aPagarPorPersona = numJugadores > 0 ? (costeTotal / numJugadores).toFixed(2) : 0;

  useEffect(() => {
    setPagador(pagoSesion ? String(pagoSesion.usuario_pagador) : '');
  }, [pagoSesion?.id, pagoSesion?.usuario_pagador]);

  const pagadorInfo = confirmados.find(a => String(a.usuario) === String(pagador));
  const deudores = confirmados.filter(a => String(a.usuario) !== String(pagador));

  const guardarPagador = async (e) => {
    e.preventDefault();

    if (!pagador) {
      alert('Selecciona quién ha pagado la pista.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        sesion: sesion.id,
        usuario_pagador: pagador,
        cantidad: Number(costeTotal).toFixed(2),
      };

      if (pagoSesion) {
        await api.patch(`pagos/${pagoSesion.id}/`, payload);
      } else {
        await api.post('pagos/', payload);
      }

      if (recargarSesion) {
        await recargarSesion();
      }

      alert('Pagador guardado correctamente.');
    } catch (error) {
      console.error('Error al guardar pagador:', error);
      alert('No se pudo guardar el pagador. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body text-center py-5">
        <div className="display-1 mb-3">💸</div>
        <h3 className="fw-bold">Resumen de Pagos</h3>
        <p className="text-muted">La pista ha costado <strong>{costeTotal}€</strong>.</p>

        <form onSubmit={guardarPagador} className="card bg-light border-0 p-3 mt-4 mb-4 text-start">
          <label className="form-label fw-bold mb-2">¿Quién pagó la pista?</label>
          <div className="d-flex gap-2 flex-column flex-md-row">
            <select
              className="form-select"
              value={pagador}
              onChange={(e) => setPagador(e.target.value)}
              required
            >
              <option value="">Seleccionar pagador...</option>
              {confirmados.map((asistente) => (
                <option key={asistente.usuario} value={asistente.usuario}>
                  {asistente.usuario_nombre}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-dark fw-bold" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar pagador'}
            </button>
          </div>
        </form>
        
        <div className="alert alert-success mt-4 mb-4">
          <h4 className="fw-bold mb-0">Cada jugador debe pagar: {aPagarPorPersona}€</h4>
        </div>

        {pagadorInfo ? (
          <>
            <p className="text-muted fw-bold text-start mb-2">{pagadorInfo.usuario_nombre} adelantó la pista. El resto le debe su parte:</p>
            <h6 className="fw-bold text-start text-secondary mb-3">Jugadores que deben pagar ({deudores.length}):</h6>
            <ul className="list-group list-group-flush text-start">
              {deudores.map((asistente) => (
                <li key={asistente.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>👤 {asistente.usuario_nombre}</span>
                  <span className="fw-bold text-danger">-{aPagarPorPersona}€</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted small mt-4 mb-0">Selecciona y guarda un pagador para repartir correctamente la deuda en el tricount.</p>
        )}
      </div>
    </div>
  );
};

export default ResumenEconomico;

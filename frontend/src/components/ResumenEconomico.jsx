import React from 'react';

const ResumenEconomico = ({ sesion }) => {
  const confirmados = sesion.asistentes?.filter(a => a.estado_asistencia === 'CONFIRMADO') || [];
  const numJugadores = confirmados.length;
  
  // Cálculo de división de pagos
  const costeTotal = parseFloat(sesion.coste_total);
  const aPagarPorPersona = numJugadores > 0 ? (costeTotal / numJugadores).toFixed(2) : 0;

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body text-center py-5">
        <div className="display-1 mb-3">💸</div>
        <h3 className="fw-bold">Resumen de Pagos</h3>
        <p className="text-muted">La pista ha costado <strong>{costeTotal}€</strong>.</p>
        
        <div className="alert alert-success mt-4 mb-4">
          <h4 className="fw-bold mb-0">Cada jugador debe pagar: {aPagarPorPersona}€</h4>
        </div>

        <h6 className="fw-bold text-start text-secondary mb-3">Jugadores que deben pagar ({numJugadores}):</h6>
        <ul className="list-group list-group-flush text-start">
          {confirmados.map(asistente => (
             <li key={asistente.id} className="list-group-item d-flex justify-content-between align-items-center">
               <span>👤 {asistente.usuario_nombre}</span>
               <span className="fw-bold text-danger">-{aPagarPorPersona}€</span>
             </li>
          ))}
        </ul>
        
        {/* Aquí en el futuro añadiremos el botón para que cada uno registre que ya ha pagado */}
        <p className="text-muted small mt-4">La funcionalidad de registrar quién ha enviado el Bizum irá aquí.</p>
      </div>
    </div>
  );
};

export default ResumenEconomico;
import React, { useState } from 'react';
import api from '../services/api';

const MarcadorClasico = ({ asistentes, sesionId, recargarSesion }) => {
  // Filtramos para mostrar solo a los que confirmaron asistencia
  const confirmados = asistentes.filter(a => a.estado_asistencia === 'CONFIRMADO');

  const [resultado, setResultado] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estados provisionales para los jugadores seleccionados (IDs)
  const [j1A, setJ1A] = useState('');
  const [j2A, setJ2A] = useState('');
  const [j1B, setJ1B] = useState('');
  const [j2B, setJ2B] = useState('');
  const enPista = [j1A, j2A, j1B, j2B].filter(Boolean).map(String);
  const hayDuplicados = new Set(enPista).size !== enPista.length;

  const handleGuardarPartido = async (e) => {
    e.preventDefault();
    if (!j1A || !j2A || !j1B || !j2B || !resultado) return alert("Completa todos los campos");

    const jugadoresSeleccionados = [j1A, j2A, j1B, j2B].map(String);
    if (new Set(jugadoresSeleccionados).size !== jugadoresSeleccionados.length) {
      return alert("No puedes repetir jugadores en el mismo partido.");
    }
    
    setGuardando(true);
    try {
      await api.post('partidos-clasicos/', {
        sesion: sesionId,
        jugador1_A: j1A,
        jugador2_A: j2A,
        jugador1_B: j1B,
        jugador2_B: j2B,
        resultado: resultado
      });
      alert("¡Partido guardado con éxito!");
      // Limpiamos el formulario
      setResultado('');
      recargarSesion(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el partido");
    } finally {
      setGuardando(false);
    }
  };

  // Componente auxiliar para no repetir tanto código en los <select>
  const SelectorJugador = ({ valor, setValor, label }) => (
    <select className="form-select mb-2" value={String(valor)} onChange={(e) => setValor(e.target.value)} required>
      <option value="">Selecciona {label}</option>
      {confirmados
        .filter((a) => {
          const idJugador = String(a.usuario);
          const idSeleccionado = String(valor);
          return !enPista.includes(idJugador) || idJugador === idSeleccionado;
        })
        .map((a) => (
          <option key={a.usuario} value={String(a.usuario)}>{a.usuario_nombre}</option>
        ))}
    </select>
  );

  return (
    <div className="card shadow-sm border-0 bg-white">
      <div className="card-header bg-dark text-white text-center py-3">
        <h4 className="mb-0 fw-bold">🎾 Partido Clásico</h4>
      </div>
      <div className="card-body">
        <form onSubmit={handleGuardarPartido}>
          <div className="row text-center mb-3">
            <div className="col-5">
              <h6 className="fw-bold text-primary">Pareja A</h6>
              <SelectorJugador valor={j1A} setValor={setJ1A} label="Jugador 1" />
              <SelectorJugador valor={j2A} setValor={setJ2A} label="Jugador 2" />
            </div>
            <div className="col-2 d-flex align-items-center justify-content-center fw-bold fs-4 text-muted">
              VS
            </div>
            <div className="col-5">
              <h6 className="fw-bold text-danger">Pareja B</h6>
              <SelectorJugador valor={j1B} setValor={setJ1B} label="Jugador 1" />
              <SelectorJugador valor={j2B} setValor={setJ2B} label="Jugador 2" />
            </div>
          </div>

          <div className="mb-4">
            <label className="fw-bold form-label">Resultado (Ej: 6-4 / 4-6 / 7-6)</label>
            <input 
              type="text" 
              className="form-control text-center fs-5" 
              placeholder="Resultado final" 
              value={resultado} 
              onChange={(e) => setResultado(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary w-100 py-3 fw-bold fs-5" disabled={guardando || hayDuplicados}>
            {guardando ? 'Guardando...' : '💾 Guardar Resultado'}
          </button>
          {hayDuplicados && (
            <p className="text-danger small text-center mt-2 mb-0 fw-bold">
              Cada jugador solo puede aparecer una vez.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default MarcadorClasico;

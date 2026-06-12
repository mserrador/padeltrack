import React, { useState } from 'react';
import api from '../services/api';

const MarcadorClasico = ({ asistentes, sesionId, sesionPublicaId, recargarSesion }) => {
  // Filtramos para mostrar solo a los que confirmaron asistencia
  const confirmados = asistentes.filter(a => a.estado_asistencia === 'CONFIRMADO');

  const [juegosA, setJuegosA] = useState('');
  const [juegosB, setJuegosB] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estados provisionales para los jugadores seleccionados (IDs)
  const [j1A, setJ1A] = useState('');
  const [j2A, setJ2A] = useState('');
  const [j1B, setJ1B] = useState('');
  const [j2B, setJ2B] = useState('');
  const enPista = [j1A, j2A, j1B, j2B].filter(Boolean).map(String);
  const hayDuplicados = new Set(enPista).size !== enPista.length;

  const manejarGuardadoPartido = async (e) => {
    e.preventDefault();
    if (!j1A || !j2A || !j1B || !j2B || juegosA === '' || juegosB === '') return alert("Completa todos los campos");

    const jugadoresSeleccionados = [j1A, j2A, j1B, j2B].map(String);
    if (new Set(jugadoresSeleccionados).size !== jugadoresSeleccionados.length) {
      return alert("No puedes repetir jugadores en el mismo partido.");
    }

    const puntosA = Number(juegosA);
    const puntosB = Number(juegosB);

    if (!Number.isInteger(puntosA) || !Number.isInteger(puntosB) || puntosA < 0 || puntosB < 0) {
      return alert('Introduce un resultado válido con números enteros no negativos.');
    }

    if (puntosA === puntosB) {
      return alert('El partido clásico no puede guardarse con empate.');
    }

    const resultado = `${puntosA}-${puntosB}`;
    
    setGuardando(true);
    try {
      await api.post('partidos-clasicos/', {
        ...(sesionId ? { sesion: sesionId } : { sesion_publica: sesionPublicaId }),
        jugador1_A: j1A,
        jugador2_A: j2A,
        jugador1_B: j1B,
        jugador2_B: j2B,
        resultado: resultado
      });
      alert("¡Partido guardado con éxito!");
      // Limpiamos el formulario
      setJuegosA('');
      setJuegosB('');
      recargarSesion(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      const detalle = error.response?.data;
      const mensaje =
        detalle?.detail ||
        (Array.isArray(detalle?.non_field_errors) ? detalle.non_field_errors[0] : null) ||
        'Hubo un error al guardar el partido';
      alert(mensaje);
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
        <h4 className="mb-0 fw-bold">Partido Clásico</h4>
      </div>
      <div className="card-body">
        <form onSubmit={manejarGuardadoPartido}>
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
            <label className="fw-bold form-label">Resultado final</label>
            <div className="row g-2 align-items-center">
              <div className="col-5">
                <label className="form-label small text-muted fw-bold">Juegos Equipo A</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-control text-center fs-5"
                  placeholder="6"
                  value={juegosA}
                  onChange={(e) => setJuegosA(e.target.value)}
                  required
                />
              </div>
              <div className="col-2 text-center fw-bold fs-4 text-muted">-</div>
              <div className="col-5">
                <label className="form-label small text-muted fw-bold">Juegos Equipo B</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-control text-center fs-5"
                  placeholder="2"
                  value={juegosB}
                  onChange={(e) => setJuegosB(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="small text-muted mt-2 mb-0 text-center">
              Se guardará con formato {juegosA === '' ? 'X' : juegosA}-{juegosB === '' ? 'Y' : juegosB}.
            </p>
          </div>

          <button type="submit" className="btn btn-primary w-100 py-3 fw-bold fs-5" disabled={guardando || hayDuplicados}>
            {guardando ? 'Guardando...' : 'Guardar Resultado'}
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

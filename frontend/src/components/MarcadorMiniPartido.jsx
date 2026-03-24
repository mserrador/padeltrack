import React, { useState } from 'react';
import api from '../services/api';

const MarcadorMiniPartido = ({ asistentes, sesion, recargarSesion }) => {
  const confirmados = asistentes.filter(a => a.estado_asistencia === 'CONFIRMADO');
  
  const [j1A, setJ1A] = useState('');
  const [j2A, setJ2A] = useState('');
  const [j1B, setJ1B] = useState('');
  const [j2B, setJ2B] = useState('');
  
  const [puntosA, setPuntosA] = useState('0');
  const [puntosB, setPuntosB] = useState('0');
  const [guardando, setGuardando] = useState(false);

  const enPista = [j1A, j2A, j1B, j2B].filter(Boolean).map(String);

  const calcularRacha = (id1, id2) => {
    if (!id1 || !id2) return 0;
    
    // 1. Obtenemos todas las rondas ordenadas
    let rondas = [...(sesion.mini_partidos || [])].sort((a, b) => a.orden - b.orden);
    if (rondas.length === 0) return 0;

    // CORRECCIÓN CLAVE: El filtro de Amnesia
    // Buscamos en qué posición está la última ronda que tuvo una "corona_rey"
    const indexUltimaCorona = rondas.map(r => r.corona_rey).lastIndexOf(true);
    
    // Si hubo alguna corona en el pasado, cortamos el historial. 
    // Solo nos importan los partidos que se hayan jugado DESPUÉS de esa corona.
    if (indexUltimaCorona !== -1) {
      rondas = rondas.slice(indexUltimaCorona + 1);
    }

    // Si después de cortar el historial no quedan rondas, la racha es 0 para todos.
    if (rondas.length === 0) return 0;

    const parejaObjetivo = [String(id1), String(id2)].sort();
    let racha = 0;

    for (let i = rondas.length - 1; i >= 0; i--) {
      const ronda = rondas[i];
      const parejaGanadoraRonda = ronda.ganador === 'A' 
        ? [String(ronda.jugador1_A), String(ronda.jugador2_A)] 
        : [String(ronda.jugador1_B), String(ronda.jugador2_B)];
      
      parejaGanadoraRonda.sort();

      if (parejaObjetivo[0] === parejaGanadoraRonda[0] && parejaObjetivo[1] === parejaGanadoraRonda[1]) {
        racha++;
      } else {
        break; 
      }
    }
    return racha;
  };

  const rachaA = calcularRacha(j1A, j2A);
  const rachaB = calcularRacha(j1B, j2B);

  const verificarRacha = (equipoGanador) => {
    const rachaActual = equipoGanador === 'A' ? rachaA : rachaB;
    return rachaActual === 2; 
  };

  const finalizarJuego = async (equipoGanador) => {
    if (!j1A || !j2A || !j1B || !j2B) return alert("Faltan jugadores en la pista.");
    
    const corona = verificarRacha(equipoGanador);
    setGuardando(true);

    try {
      await api.post('mini-partidos/', {
        sesion: sesion.id,
        orden: (sesion.mini_partidos?.length || 0) + 1,
        jugador1_A: j1A, jugador2_A: j2A,
        jugador1_B: j1B, jugador2_B: j2B,
        ganador: equipoGanador,
        puntos_A: puntosA,
        puntos_B: puntosB,
        corona_rey: corona
      });

      if (corona) {
        alert("👑 ¡3 VICTORIAS SEGUIDAS! 👑\nLos reyes van al banquillo. ¡El marcador de rachas se reinicia para todos!");
        if (equipoGanador === 'A') { setJ1A(''); setJ2A(''); }
        else { setJ1B(''); setJ2B(''); }
      } else {
        alert(`¡Ronda para el Equipo ${equipoGanador}!\nLos perdedores salen de la pista.`);
        if (equipoGanador === 'A') { setJ1B(''); setJ2B(''); }
        else { setJ1A(''); setJ2A(''); }
      }

      setPuntosA('0'); setPuntosB('0');
      recargarSesion();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setGuardando(false);
    }
  };

  const hacerEquiposAleatorios = () => {
    if (confirmados.length < 4) return alert("Se necesitan al menos 4 jugadores.");
    const mezclados = [...confirmados].sort(() => 0.5 - Math.random());
    setJ1A(String(mezclados[0].usuario));
    setJ2A(String(mezclados[1].usuario));
    setJ1B(String(mezclados[2].usuario));
    setJ2B(String(mezclados[3].usuario));
    setPuntosA('0'); setPuntosB('0');
  };

  const sumarPunto = (equipo) => {
    const ptsMios = equipo === 'A' ? puntosA : puntosB;
    const ptsRival = equipo === 'A' ? puntosB : puntosA;
    let nuevosPts = ptsMios;
    let nuevoRival = ptsRival;
    let haGanado = false;

    if (ptsMios === '0') nuevosPts = '15';
    else if (ptsMios === '15') nuevosPts = '30';
    else if (ptsMios === '30') nuevosPts = '40';
    else if (ptsMios === '40') {
      if (ptsRival === '40') nuevosPts = 'V'; 
      else if (ptsRival === 'V') { nuevosPts = '40'; nuevoRival = '40'; } 
      else haGanado = true; 
    }
    else if (ptsMios === 'V') haGanado = true; 

    if (haGanado) {
      finalizarJuego(equipo);
    } else {
      if (equipo === 'A') { setPuntosA(nuevosPts); setPuntosB(nuevoRival); }
      else { setPuntosB(nuevosPts); setPuntosA(nuevoRival); }
    }
  };

  const restarPunto = (equipo) => {
    const pts = equipo === 'A' ? puntosA : puntosB;
    let nuevosPts = pts;

    if (pts === 'V') nuevosPts = '40';
    else if (pts === '40') nuevosPts = '30';
    else if (pts === '30') nuevosPts = '15';
    else if (pts === '15') nuevosPts = '0';

    if (equipo === 'A') setPuntosA(nuevosPts);
    else setPuntosB(nuevosPts);
  };

  const SelectorExclusivo = ({ valor, setValor, label }) => {
    const opcionesDisponibles = confirmados.filter(a => {
      const idJugador = String(a.usuario);
      const idSeleccionado = String(valor);
      return !enPista.includes(idJugador) || idJugador === idSeleccionado;
    });

    return (
      <select className="form-select form-select-sm mb-2 fw-bold" value={String(valor)} onChange={(e) => setValor(e.target.value)}>
        <option value="">{label}</option>
        {opcionesDisponibles.map(a => (
          <option key={a.usuario} value={String(a.usuario)}>
            {a.usuario_nombre}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="card shadow-lg border-0 bg-dark text-white mb-4">
      <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center py-3">
        <h4 className="mb-0 fw-bold">👑 Rey de la Pista (Ronda {(sesion.mini_partidos?.length || 0) + 1})</h4>
        <button className="btn btn-sm btn-dark fw-bold shadow-sm" onClick={hacerEquiposAleatorios}>
          🎲 Sorteo
        </button>
      </div>
      
      <div className="card-body p-4">
        <div className="row text-center mb-4">
          <div className="col-5">
            <h5 className="fw-bold text-info mb-1">EQUIPO A</h5>
            <div style={{ height: '30px' }} className="mb-2">
              {rachaA > 0 && <span className="badge bg-danger fs-6 shadow-sm">🔥 Racha: {rachaA}</span>}
            </div>
            <SelectorExclusivo valor={j1A} setValor={setJ1A} label="Selecciona Jug." />
            <SelectorExclusivo valor={j2A} setValor={setJ2A} label="Selecciona Jug." />
            <div className="display-3 fw-bold my-4 text-white font-monospace">{puntosA}</div>
            <button className="btn btn-info btn-lg w-100 fw-bold text-dark shadow mb-2" onClick={() => sumarPunto('A')} disabled={guardando}>
              + PUNTO
            </button>
            <button className="btn btn-outline-light btn-sm w-100" onClick={() => restarPunto('A')} disabled={guardando || puntosA === '0'}>
              - Restar
            </button>
          </div>

          <div className="col-2 d-flex align-items-center justify-content-center fw-bold display-6 text-muted">
            VS
          </div>

          <div className="col-5">
            <h5 className="fw-bold text-danger mb-1">EQUIPO B</h5>
            <div style={{ height: '30px' }} className="mb-2">
              {rachaB > 0 && <span className="badge bg-danger fs-6 shadow-sm">🔥 Racha: {rachaB}</span>}
            </div>
            <SelectorExclusivo valor={j1B} setValor={setJ1B} label="Selecciona Jug." />
            <SelectorExclusivo valor={j2B} setValor={setJ2B} label="Selecciona Jug." />
            <div className="display-3 fw-bold my-4 text-white font-monospace">{puntosB}</div>
            <button className="btn btn-danger btn-lg w-100 fw-bold shadow mb-2" onClick={() => sumarPunto('B')} disabled={guardando}>
              + PUNTO
            </button>
            <button className="btn btn-outline-light btn-sm w-100" onClick={() => restarPunto('B')} disabled={guardando || puntosB === '0'}>
              - Restar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarcadorMiniPartido;
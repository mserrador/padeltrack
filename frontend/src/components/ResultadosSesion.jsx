import React from 'react';

const ResultadosSesion = ({ sesion }) => {
  const confirmados = sesion.asistentes?.filter((a) => a.estado_asistencia === 'CONFIRMADO') || [];
  const esModoClasico = confirmados.length === 4;

  const nombreJugador = (id) => {
    const asistente = sesion.asistentes?.find((a) => a.usuario === id);
    return asistente?.usuario_nombre || `Jugador ${id}`;
  };

  const estadisticasPorJugador = () => {
    const mapa = new Map();

    const asegurarJugador = (id) => {
      if (!mapa.has(id)) {
        mapa.set(id, {
          usuario: id,
          nombre: nombreJugador(id),
          puntosFavor: 0,
          puntosContra: 0,
          derrotas: 0,
          victorias: 0,
        });
      }
      return mapa.get(id);
    };

    const sumarEquipo = (jugadores, aFavor, enContra, gano) => {
      jugadores.forEach((jugadorId) => {
        const registro = asegurarJugador(jugadorId);
        registro.puntosFavor += aFavor;
        registro.puntosContra += enContra;
        if (gano) registro.victorias += 1;
        else registro.derrotas += 1;
      });
    };

    if (esModoClasico) {
      (sesion.partidos_clasicos || []).forEach((partido) => {
        const match = String(partido.resultado || '').match(/(\d+)\s*[-:]\s*(\d+)/);
        if (!match) return;

        const puntosA = Number(match[1]);
        const puntosB = Number(match[2]);
        const equipoA = [partido.jugador1_A, partido.jugador2_A];
        const equipoB = [partido.jugador1_B, partido.jugador2_B];

        sumarEquipo(equipoA, puntosA, puntosB, puntosA > puntosB);
        sumarEquipo(equipoB, puntosB, puntosA, puntosB > puntosA);
      });
    } else {
      (sesion.mini_partidos || []).forEach((partido) => {
        const puntosA = Number(partido.puntos_A || 0);
        const puntosB = Number(partido.puntos_B || 0);
        const equipoA = [partido.jugador1_A, partido.jugador2_A];
        const equipoB = [partido.jugador1_B, partido.jugador2_B];

        sumarEquipo(equipoA, puntosA, puntosB, partido.ganador === 'A');
        sumarEquipo(equipoB, puntosB, puntosA, partido.ganador === 'B');
      });
    }

    return Array.from(mapa.values());
  };

  const estadisticas = estadisticasPorJugador();
  const maxPuntos = estadisticas.length > 0 ? Math.max(...estadisticas.map((e) => e.victorias)) : 0;
  const maxDerrotas = estadisticas.length > 0 ? Math.max(...estadisticas.map((e) => e.derrotas)) : 0;
  const jugadoresMasPuntos = estadisticas.filter((e) => e.victorias === maxPuntos && maxPuntos > 0);
  const jugadoresMasDerrotas = estadisticas.filter((e) => e.derrotas === maxDerrotas && maxDerrotas > 0);

  return (
    <div className="card shadow-sm border-0 mb-4 resultados-sesion-card">
      <div className="card-body text-start">
        <h3 className="fw-bold mb-3">Resultados de la sesión</h3>

        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-6">
            <div className="resultados-kpi h-100">
              <p className="resultados-kpi-label">Más partidos ganados</p>
              {jugadoresMasPuntos.length > 0 ? (
                <>
                  <p className="resultados-kpi-value mb-1">{jugadoresMasPuntos.map((j) => j.nombre).join(', ')}</p>
                  <p className="resultados-kpi-sub mb-0">{maxPuntos} puntos (1 por partido ganado)</p>
                </>
              ) : (
                <p className="resultados-kpi-sub mb-0">Aún no hay datos suficientes.</p>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="resultados-kpi h-100">
              <p className="resultados-kpi-label">Más derrotas</p>
              {jugadoresMasDerrotas.length > 0 ? (
                <>
                  <p className="resultados-kpi-value mb-1">{jugadoresMasDerrotas.map((j) => j.nombre).join(', ')}</p>
                  <p className="resultados-kpi-sub mb-0">{maxDerrotas} derrotas registradas</p>
                </>
              ) : (
                <p className="resultados-kpi-sub mb-0">Aún no hay derrotas registradas.</p>
              )}
            </div>
          </div>
        </div>

        <div className="table-responsive resultados-sesion-tabla-wrap mb-4">
          <h6 className="fw-bold text-secondary">Puntos por jugador en esta sesión</h6>
          <table className="table table-sm table-striped align-middle resultados-sesion-tabla mb-0">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Puntos</th>
                <th>Ganados</th>
                <th>Derrotas</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.length > 0 ? (
                [...estadisticas]
                  .sort((a, b) => b.victorias - a.victorias || a.derrotas - b.derrotas || a.nombre.localeCompare(b.nombre))
                  .map((fila) => (
                    <tr key={`stats_${fila.usuario}`}>
                      <td className="fw-bold">{fila.nombre}</td>
                      <td>{fila.victorias}</td>
                      <td>{fila.victorias}</td>
                      <td>{fila.derrotas}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-muted">Aún no hay puntos registrados en esta sesión.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {esModoClasico ? (
          <div className="table-responsive resultados-sesion-tabla-wrap">
            <h6 className="fw-bold text-secondary">Partidos clásicos</h6>
            <table className="table table-sm table-striped align-middle resultados-sesion-tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipo A</th>
                  <th>Equipo B</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(sesion.partidos_clasicos) && sesion.partidos_clasicos.length > 0 ? (
                  sesion.partidos_clasicos.map((partido, index) => (
                    <tr key={partido.id || `pc_${index}`}>
                      <td>{index + 1}</td>
                      <td>{nombreJugador(partido.jugador1_A)} / {nombreJugador(partido.jugador2_A)}</td>
                      <td>{nombreJugador(partido.jugador1_B)} / {nombreJugador(partido.jugador2_B)}</td>
                      <td>{partido.resultado || 'Sin resultado'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-muted">No hay partidos clásicos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive resultados-sesion-tabla-wrap">
            <h6 className="fw-bold text-secondary">Mini partidos</h6>
            <table className="table table-sm table-striped align-middle resultados-sesion-tabla">
              <thead>
                <tr>
                  <th>Ronda</th>
                  <th>Equipo A</th>
                  <th>Equipo B</th>
                  <th>Ganador</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(sesion.mini_partidos) && sesion.mini_partidos.length > 0 ? (
                  sesion.mini_partidos.map((partido) => (
                    <tr key={partido.id}>
                      <td>{partido.orden}</td>
                      <td>{nombreJugador(partido.jugador1_A)} / {nombreJugador(partido.jugador2_A)}</td>
                      <td>{nombreJugador(partido.jugador1_B)} / {nombreJugador(partido.jugador2_B)}</td>
                      <td>{partido.ganador === 'A' ? 'Equipo A' : 'Equipo B'}</td>
                      <td>{partido.puntos_A ?? '-'} - {partido.puntos_B ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-muted">No hay mini partidos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultadosSesion;

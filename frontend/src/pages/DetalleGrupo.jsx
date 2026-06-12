import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BalanceGlobal from '../components/BalanceGlobal';
import SeccionPlegable from '../components/SeccionPlegable';

const DetalleGrupo = () => {
  const { id } = useParams(); // Capturamos la ID de la URL
  const [grupo, setGrupo] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [estadisticasGrupo, setEstadisticasGrupo] = useState(null);
  const [usernameNuevoMiembro, setUsernameNuevoMiembro] = useState('');
  const [agregandoMiembro, setAgregandoMiembro] = useState(false);
  const [saliendoGrupo, setSaliendoGrupo] = useState(false);
  const [mostrarOpcionesSalidaAdmin, setMostrarOpcionesSalidaAdmin] = useState(false);
  const [nuevoAdminSalida, setNuevoAdminSalida] = useState('');
  const [mostrarConfirmacionBorrado, setMostrarConfirmacionBorrado] = useState(false);
  const [textoConfirmacionBorrado, setTextoConfirmacionBorrado] = useState('');
  const [eliminandoGrupo, setEliminandoGrupo] = useState(false);
  const [paginaSesiones, setPaginaSesiones] = useState(1);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    historial: true,
    miembros: false,
    estadisticas: false,
    balance: true,
    salida: false,
    peligro: false,
  });
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);

  const usernameActual = localStorage.getItem('username');
  const claveSecciones = `detalleGrupo:${usernameActual || 'anon'}:${id}:secciones`;

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(claveSecciones);
      if (guardado) {
        const parseado = JSON.parse(guardado);
        setSeccionesAbiertas((previo) => ({ ...previo, ...parseado, peligro: false }));
      }
    } catch (error) {
      // Ignoramos errores de parseo de preferencias
    }
  }, [claveSecciones]);

  useEffect(() => {
    localStorage.setItem(claveSecciones, JSON.stringify({ ...seccionesAbiertas, peligro: false }));
  }, [claveSecciones, seccionesAbiertas]);

  useEffect(() => {
    setPaginaSesiones(1);
  }, [sesiones.length]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Ejecutamos ambas peticiones a la vez para reducir el tiempo de espera
        const [resGrupo, resSesiones, resMiembros, resEstadisticas] = await Promise.all([
          api.get(`grupos/${id}/`),
          api.get('sesiones/'),
          api.get(`grupos/${id}/miembros/`),
          api.get(`grupos/${id}/estadisticas/`)
        ]);
        
        setGrupo(resGrupo.data);
        
        // Filtramos para quedarnos solo con las sesiones de ESTE grupo
        const sesionesData = Array.isArray(resSesiones.data)
          ? resSesiones.data
          : Array.isArray(resSesiones.data?.results)
            ? resSesiones.data.results
            : [];
        const sesionesFiltradas = sesionesData
          .filter((s) => s.grupo === parseInt(id, 10))
          .sort((a, b) => {
            if (!a.fecha_hora && !b.fecha_hora) return b.id - a.id;
            if (!a.fecha_hora) return 1;
            if (!b.fecha_hora) return -1;
            return new Date(b.fecha_hora) - new Date(a.fecha_hora);
          });
        setSesiones(sesionesFiltradas);

        const miembrosData = Array.isArray(resMiembros.data) ? resMiembros.data : [];
        setMiembros(miembrosData);
        const miembroActual = miembrosData.find((m) => m.username === usernameActual);
        setEsAdmin(Boolean(miembroActual?.es_admin));

        setEstadisticasGrupo(resEstadisticas.data || null);
      } catch (error) {
        console.error("Error al cargar el grupo:", error);
        setSesiones([]);
        setMiembros([]);
        setEstadisticasGrupo(null);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [id]);

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  if (!grupo) {
    return <div className="alert alert-danger mt-4">Grupo no encontrado.</div>;
  }

  const agregarMiembro = async (e) => {
    e.preventDefault();
    const usernameLimpio = usernameNuevoMiembro.trim();
    if (usernameLimpio.length < 3) {
      alert('Introduce un username válido.');
      return;
    }

    setAgregandoMiembro(true);
    try {
      await api.post(`grupos/${id}/miembros/`, { username: usernameLimpio });
      const resMiembros = await api.get(`grupos/${id}/miembros/`);
      setMiembros(Array.isArray(resMiembros.data) ? resMiembros.data : []);
      setUsernameNuevoMiembro('');
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje = Array.isArray(detalle?.username)
        ? detalle.username[0]
        : detalle?.detail || 'No se pudo agregar el miembro.';
      alert(mensaje);
    } finally {
      setAgregandoMiembro(false);
    }
  };

  const eliminarMiembro = async (miembroId) => {
    if (!window.confirm('Este usuario saldra del grupo. Quieres continuar?')) {
      return;
    }

    try {
      await api.delete(`grupos/${id}/miembros/${miembroId}/`);
      const resMiembros = await api.get(`grupos/${id}/miembros/`);
      const lista = Array.isArray(resMiembros.data) ? resMiembros.data : [];
      setMiembros(lista);
      const miembroActual = lista.find((m) => m.username === usernameActual);
      setEsAdmin(Boolean(miembroActual?.es_admin));
    } catch (error) {
      const detalle = error.response?.data;
      alert(detalle?.detail || 'No se pudo eliminar el miembro.');
    }
  };

  const eliminarGrupo = async (e) => {
    e.preventDefault();

    if (textoConfirmacionBorrado.trim() !== grupo.nombre) {
      alert('El nombre del grupo no coincide.');
      return;
    }

    setEliminandoGrupo(true);
    try {
      await api.delete(`grupos/${id}/`);
      navigate('/app');
    } catch (error) {
      const detalle = error.response?.data;
      alert(detalle?.detail || 'No se pudo eliminar el grupo.');
    } finally {
      setEliminandoGrupo(false);
    }
  };

  const alternarSeccion = (idSeccion) => {
    setSeccionesAbiertas((previo) => {
      const siguiente = { ...previo, [idSeccion]: !previo[idSeccion] };
      if (idSeccion === 'peligro' && !siguiente.peligro) {
        setMostrarConfirmacionBorrado(false);
        setTextoConfirmacionBorrado('');
      }
      return siguiente;
    });
  };

  const expandirTodo = () => {
    setSeccionesAbiertas((previo) => ({ ...previo, historial: true, miembros: true, estadisticas: true, balance: true, salida: true, peligro: false }));
  };

  const contraerTodo = () => {
    setSeccionesAbiertas((previo) => ({ ...previo, historial: false, miembros: false, estadisticas: false, balance: false, salida: false, peligro: false }));
  };

  const salirDelGrupo = async () => {
    const admins = miembros.filter((m) => m.es_admin);
    const soyUltimoAdmin = esAdmin && admins.length <= 1;

    if (!esAdmin) {
      if (!window.confirm('Vas a salir del grupo y perderás acceso a sus sesiones.')) return;
      setSaliendoGrupo(true);
      try {
        await api.post(`grupos/${id}/salir/`);
        navigate('/app');
      } catch (error) {
        alert(error.response?.data?.detail || 'No se pudo completar la salida del grupo.');
      } finally {
        setSaliendoGrupo(false);
      }
      return;
    }

    if (!soyUltimoAdmin) {
      if (!window.confirm('Vas a salir del grupo. Otro administrador mantendrá el control.')) return;
      setSaliendoGrupo(true);
      try {
        await api.post(`grupos/${id}/salir/`);
        navigate('/app');
      } catch (error) {
        alert(error.response?.data?.detail || 'No se pudo completar la salida del grupo.');
      } finally {
        setSaliendoGrupo(false);
      }
      return;
    }

    setMostrarOpcionesSalidaAdmin(true);
  };

  const salirComoUltimoAdmin = async (accion) => {
    setSaliendoGrupo(true);
    try {
      if (accion === 'borrar_grupo') {
        await api.post(`grupos/${id}/salir/`, { accion: 'borrar_grupo' });
      } else {
        if (!nuevoAdminSalida) {
          alert('Selecciona un nuevo administrador.');
          setSaliendoGrupo(false);
          return;
        }
        await api.post(`grupos/${id}/salir/`, {
          accion: 'transferir_admin',
          nuevo_admin_id: Number(nuevoAdminSalida),
        });
      }
      navigate('/app');
    } catch (error) {
      alert(error.response?.data?.detail || 'No se pudo completar la salida del grupo.');
    } finally {
      setSaliendoGrupo(false);
    }
  };

  const elementosPorPaginaSesiones = 5;
  const totalPaginasSesiones = Math.max(1, Math.ceil(sesiones.length / elementosPorPaginaSesiones));
  const paginaActualSesiones = Math.min(paginaSesiones, totalPaginasSesiones);
  const inicioSesiones = (paginaActualSesiones - 1) * elementosPorPaginaSesiones;
  const sesionesPaginadas = sesiones.slice(inicioSesiones, inicioSesiones + elementosPorPaginaSesiones);

  return (
    <div>
      {/* Cabecera del Grupo */}
      <div className="panel-head d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/app" className="text-decoration-none text-muted mb-2 d-block">← Volver a Mis Grupos</Link>
          <h2 className="fw-bold mb-0">{grupo.nombre}</h2>
        </div>
        {/* 3. Conecta el botón usando navigate */}
        <button 
          className="btn btn-success fw-bold shadow-sm"
          onClick={() => navigate(`/grupos/${id}/nueva-sesion`)}
        >
          + Nueva Sesión
        </button>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={expandirTodo}>Expandir todo</button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={contraerTodo}>Contraer todo</button>
      </div>

      <SeccionPlegable idSeccion="historial" titulo="Historial de Sesiones" abierta={seccionesAbiertas.historial} onToggle={alternarSeccion}>
        {sesiones.length === 0 ? (
          <div className="text-center">
            <p className="text-muted mb-0">No hay sesiones organizadas aún. ¡Crea la primera!</p>
          </div>
        ) : (
          <>
            <div className="list-group shadow-sm">
              {sesionesPaginadas.map((sesion) => (
                <Link 
                  to={`/sesiones/${sesion.id}`} 
                  key={sesion.id} 
                  className="list-group-item list-group-item-action fila-responsive p-3"
                >
                  <div className="fila-responsive-info">
                    <h6 className="mb-1 fw-bold texto-largo">{sesion.lugar}</h6>
                    <small className="text-muted">
                      {sesion.fecha_hora ? new Date(sesion.fecha_hora).toLocaleDateString() : 'Fecha por definir'}
                    </small>
                  </div>
                  <div className="fila-responsive-acciones">
                    <span className={`badge rounded-pill ${
                      sesion.estado === 'PLANIFICADA' ? 'bg-warning text-dark' : 
                      sesion.estado === 'EN_CURSO' ? 'bg-success' : 'bg-secondary'
                    }`}>
                      {sesion.estado.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {totalPaginasSesiones > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">
                  Página {paginaActualSesiones} de {totalPaginasSesiones}
                </small>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={paginaActualSesiones === 1}
                    onClick={() => setPaginaSesiones((previo) => Math.max(previo - 1, 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={paginaActualSesiones === totalPaginasSesiones}
                    onClick={() => setPaginaSesiones((previo) => Math.min(previo + 1, totalPaginasSesiones))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SeccionPlegable>

      <SeccionPlegable idSeccion="estadisticas" titulo="Estadísticas globales del grupo" abierta={seccionesAbiertas.estadisticas} onToggle={alternarSeccion}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <small className="text-muted">
            {estadisticasGrupo?.resumen?.sesiones_finalizadas ?? 0} sesiones finalizadas · {estadisticasGrupo?.resumen?.partidos_contabilizados ?? 0} partidos
          </small>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-6">
            <div className="resultados-kpi h-100">
              <p className="resultados-kpi-label">Más partidos ganados</p>
              {estadisticasGrupo?.kpis?.mas_ganados?.valor > 0 ? (
                <>
                  <p className="resultados-kpi-value mb-1">
                    {(estadisticasGrupo.kpis.mas_ganados.jugadores || []).map((j) => j.username).join(', ')}
                  </p>
                  <p className="resultados-kpi-sub mb-0">{estadisticasGrupo.kpis.mas_ganados.valor} victorias</p>
                </>
              ) : (
                <p className="resultados-kpi-sub mb-0">Aún no hay victorias registradas.</p>
              )}
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="resultados-kpi h-100">
              <p className="resultados-kpi-label">Más derrotas</p>
              {estadisticasGrupo?.kpis?.mas_derrotas?.valor > 0 ? (
                <>
                  <p className="resultados-kpi-value mb-1">
                    {(estadisticasGrupo.kpis.mas_derrotas.jugadores || []).map((j) => j.username).join(', ')}
                  </p>
                  <p className="resultados-kpi-sub mb-0">{estadisticasGrupo.kpis.mas_derrotas.valor} derrotas</p>
                </>
              ) : (
                <p className="resultados-kpi-sub mb-0">Aún no hay derrotas registradas.</p>
              )}
            </div>
          </div>
        </div>

        <div className="table-responsive resultados-sesion-tabla-wrap">
          <table className="table table-sm table-striped align-middle resultados-sesion-tabla mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Ganados</th>
                <th>Derrotas</th>
                <th>Jugados</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(estadisticasGrupo?.ranking) && estadisticasGrupo.ranking.length > 0 ? (
                estadisticasGrupo.ranking.map((fila, index) => (
                  <tr key={fila.usuario_id}>
                    <td>{index + 1}</td>
                    <td className="fw-bold">{fila.username}</td>
                    <td>{fila.ganados}</td>
                    <td>{fila.derrotas}</td>
                    <td>{fila.jugados}</td>
                    <td>{fila.ratio}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-muted">No hay datos suficientes para construir el ranking global.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SeccionPlegable>

      <SeccionPlegable idSeccion="miembros" titulo="Miembros del grupo" abierta={seccionesAbiertas.miembros} onToggle={alternarSeccion}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="badge bg-secondary">{miembros.length} miembros</span>
        </div>

        {esAdmin ? (
          <form onSubmit={agregarMiembro} className="mb-3 mobile-stack-form">
            <label className="form-label fw-bold small text-muted">Agregar por username</label>
            <div className="d-flex flex-column flex-md-row gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Ej: borja94"
                value={usernameNuevoMiembro}
                onChange={(e) => setUsernameNuevoMiembro(e.target.value)}
                minLength={3}
                required
              />
              <button type="submit" className="btn btn-success" disabled={agregandoMiembro}>
                {agregandoMiembro ? 'Agregando...' : 'Agregar miembro'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-muted small mb-3">Solo los administradores pueden agregar o eliminar miembros.</p>
        )}

        {miembros.length === 0 ? (
          <p className="text-muted mb-0">Todavía no hay miembros en este grupo.</p>
        ) : (
          <div className="list-group">
            {miembros.map((miembro) => (
              <div key={miembro.id} className="list-group-item fila-responsive">
                <div className="fila-responsive-info">
                  <span className="texto-largo-fuerte">{miembro.username}</span>
                  <small className="d-block text-muted">{miembro.email || 'Sin correo visible'}</small>
                </div>
                <div className="fila-responsive-acciones">
                  {miembro.es_admin && <span className="badge bg-dark">Admin</span>}
                  {esAdmin && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarMiembro(miembro.id)}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SeccionPlegable>

      <SeccionPlegable idSeccion="balance" titulo="Balance global" abierta={seccionesAbiertas.balance} onToggle={alternarSeccion}>
        <BalanceGlobal grupoId={id} esAdmin={esAdmin} />
      </SeccionPlegable>

      {esAdmin && (
        <SeccionPlegable idSeccion="peligro" titulo="Zona de peligro" abierta={seccionesAbiertas.peligro} onToggle={alternarSeccion}>
          <h5 className="fw-bold text-danger mb-2">Zona de peligro</h5>
          <p className="text-muted mb-3">
            Si eliminas este grupo, se borrarán también sus sesiones, asistencias, partidos, pagos y liquidaciones.
          </p>

          {!mostrarConfirmacionBorrado ? (
            <button
              className="btn btn-outline-danger"
              onClick={() => setMostrarConfirmacionBorrado(true)}
            >
              Eliminar grupo
            </button>
          ) : (
            <form onSubmit={eliminarGrupo} className="mobile-stack-form">
              <label className="form-label fw-bold">
                Escribe exactamente "{grupo.nombre}" para confirmar
              </label>
              <div className="d-flex flex-column flex-md-row gap-2">
                <input
                  type="text"
                  className="form-control"
                  value={textoConfirmacionBorrado}
                  onChange={(e) => setTextoConfirmacionBorrado(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-danger" disabled={eliminandoGrupo}>
                  {eliminandoGrupo ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setMostrarConfirmacionBorrado(false);
                    setTextoConfirmacionBorrado('');
                  }}
                  disabled={eliminandoGrupo}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </SeccionPlegable>
      )}

      <SeccionPlegable idSeccion="salida" titulo="Salir del grupo" abierta={seccionesAbiertas.salida} onToggle={alternarSeccion}>
        <p className="text-muted mb-3">
          Puedes salir voluntariamente del grupo. Tus datos de usuario no se eliminan.
        </p>
        <button className="btn btn-outline-danger" onClick={salirDelGrupo} disabled={saliendoGrupo}>
          {saliendoGrupo ? 'Procesando...' : 'Salir del grupo'}
        </button>

        {mostrarOpcionesSalidaAdmin && (
          <div className="card bg-light border-0 p-3 mt-3">
            <p className="fw-bold mb-2">Eres el último administrador</p>
            <p className="text-muted small mb-3">
              Antes de salir, debes elegir entre borrar el grupo o transferir la administración a otro miembro.
            </p>

            <div className="d-flex flex-column flex-md-row gap-2 mb-3">
              <button
                className="btn btn-danger"
                onClick={() => salirComoUltimoAdmin('borrar_grupo')}
                disabled={saliendoGrupo}
              >
                Borrar grupo y salir
              </button>
            </div>

            <div className="d-flex flex-column flex-md-row gap-2">
              <select
                className="form-select"
                value={nuevoAdminSalida}
                onChange={(e) => setNuevoAdminSalida(e.target.value)}
                disabled={saliendoGrupo}
              >
                <option value="">Seleccionar nuevo administrador...</option>
                {miembros
                  .filter((m) => m.username !== usernameActual)
                  .map((miembro) => (
                    <option key={`salida_admin_${miembro.id}`} value={miembro.usuario}>
                      {miembro.username}
                    </option>
                  ))}
              </select>
              <button
                className="btn btn-outline-primary"
                onClick={() => salirComoUltimoAdmin('transferir_admin')}
                disabled={saliendoGrupo}
              >
                Transferir admin y salir
              </button>
            </div>
          </div>
        )}
      </SeccionPlegable>
    </div>
    
  );
};

export default DetalleGrupo;

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { obtenerUsuarioIdActual } from '../services/authService';

const BalanceGlobal = ({ grupoId, esAdmin }) => {
  const [balances, setBalances] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [cargando, setCargando] = useState(true);

  const [pagador, setPagador] = useState('');
  const [receptor, setReceptor] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cabeceraBalanceRef = useRef(null);
  const miUsuarioId = obtenerUsuarioIdActual();
  const seleccionDuplicada = Boolean(pagador) && Boolean(receptor) && String(pagador) === String(receptor);
  const pagoGuiadoSeleccionado = Boolean(pagador) && Boolean(receptor) && Boolean(cantidad);

  const opcionesPagador = balances.filter((b) => String(b.usuario_id) !== String(receptor));
  const opcionesReceptor = balances.filter((b) => String(b.usuario_id) !== String(pagador));

  const calcularLiquidaciones = (datos) => {
    if (!datos || datos.length === 0) return [];

    let deudores = datos
      .filter(b => b.balance < 0)
      .map(b => ({ usuario_id: b.usuario_id, username: b.username, balance: Math.abs(b.balance) }))
      .sort((a, b) => b.balance - a.balance);

    let acreedores = datos
      .filter(b => b.balance > 0)
      .map(b => ({ usuario_id: b.usuario_id, username: b.username, balance: b.balance }))
      .sort((a, b) => b.balance - a.balance);

    const transacciones = [];
    let i = 0, j = 0;

    while (i < deudores.length && j < acreedores.length) {
      let monto = Math.min(deudores[i].balance, acreedores[j].balance);
      
      if (monto > 0.01) { // Evitamos micro-deudas por decimales
        transacciones.push({
          de_id: deudores[i].usuario_id,
          de: deudores[i].username,
          a_id: acreedores[j].usuario_id,
          a: acreedores[j].username,
          cantidad: monto.toFixed(2)
        });
      }

      deudores[i].balance -= monto;
      acreedores[j].balance -= monto;

      if (deudores[i].balance <= 0) i++;
      if (acreedores[j].balance <= 0) j++;
    }
    return transacciones;
  };

  const cargarDatos = async () => {
    try {
      const [resBalances, resHistorial] = await Promise.all([
        api.get(`grupos/${grupoId}/balance/`),
        api.get(`grupos/${grupoId}/historial_liquidaciones/`)
      ]);
      setBalances(resBalances.data);
      const historialOrdenado = (Array.isArray(resHistorial.data) ? resHistorial.data : []).sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
      setHistorial(historialOrdenado);
    } catch (error) {
      console.error("Error al cargar datos económicos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [grupoId]);

  useEffect(() => {
    setPaginaHistorial(1);
  }, [historial.length]);

  const manejarRegistroBizum = async (e) => {
    e.preventDefault();
    if (!esAdmin && !pagoGuiadoSeleccionado) {
      return alert('Selecciona primero uno de los pagos sugeridos.');
    }

    if (!pagador || !receptor || !cantidad || seleccionDuplicada) {
      return alert("Datos inválidos. El pagador y el receptor deben ser distintos.");
    }

    setGuardando(true);
    try {
      await api.post('liquidaciones/', {
        grupo: grupoId,
        pagador: pagador,
        receptor: receptor,
        cantidad: parseFloat(cantidad).toFixed(2)
      });
      
      setPagador(''); setReceptor(''); setCantidad('');
      cargarDatos(); 
      alert("¡Transferencia registrada con éxito!");
    } catch (error) {
      console.error("Error:", error);
      const detalle = error.response?.data;
      const mensaje =
        detalle?.detail ||
        (Array.isArray(detalle?.non_field_errors) ? detalle.non_field_errors[0] : null) ||
        (Array.isArray(detalle?.cantidad) ? detalle.cantidad[0] : null) ||
        'Hubo un error al registrar la transferencia.';
      alert(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const preRellenarBizum = (pagadorId, receptorId, cantidadSugerida) => {
    setPagador(String(pagadorId));
    setReceptor(String(receptorId));
    setCantidad(cantidadSugerida);
    
    const topCabecera = cabeceraBalanceRef.current?.getBoundingClientRect().top;
    if (typeof topCabecera === 'number') {
      const offsetNavbar = 90;
      const destino = window.scrollY + topCabecera - offsetNavbar;
      window.scrollTo({ top: Math.max(destino, 0), behavior: 'smooth' });
    }
  };

  if (cargando) return <div className="spinner-border text-success spinner-border-sm mt-3"></div>;

  const transacciones = calcularLiquidaciones(balances);
  const elementosPorPagina = 5;
  const totalPaginasHistorial = Math.max(1, Math.ceil(historial.length / elementosPorPagina));
  const paginaActualHistorial = Math.min(paginaHistorial, totalPaginasHistorial);
  const inicioHistorial = (paginaActualHistorial - 1) * elementosPorPagina;
  const historialPaginado = historial.slice(inicioHistorial, inicioHistorial + elementosPorPagina);

  return (
    <div className="card shadow-sm border-0 bg-white mt-4 mb-5">
      <div ref={cabeceraBalanceRef} className="card-header bg-dark text-white py-3">
        <h5 className="mb-0 fw-bold">Estado de Cuentas Global</h5>
      </div>
      
      <div className="card-body p-4">
        {/* BLOQUE SUPERIOR: Balances y Formulario */}
        <div className="row mb-5">
          <div className="col-12 col-md-7 mb-4 mb-md-0">
            <h6 className="fw-bold text-secondary mb-3">Balance por Jugador</h6>
            <ul className="list-group shadow-sm">
              {balances.map(b => (
                <li key={`bal_${b.usuario_id}`} className="list-group-item d-flex justify-content-between align-items-center p-3">
                  <span className="fw-bold">{b.username}</span>
                  <span className={`badge rounded-pill p-2 fs-6 ${
                    b.balance === 0 ? 'bg-secondary' : 
                    b.balance > 0 ? 'bg-success' : 'bg-danger'
                  }`}>
                    {b.balance === 0 ? 'Al día (0.00€)' : 
                     b.balance > 0 ? `Le deben ${b.balance}€` : 
                     `Debe ${Math.abs(b.balance)}€`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-12 col-md-5">
            <h6 className="fw-bold text-secondary mb-3">Registrar Transferencia</h6>
            <div className="card bg-light border-0 p-3 shadow-sm balance-transfer-form">
              <form onSubmit={manejarRegistroBizum}>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-muted">¿Quién envía?</label>
                  <select className="form-select form-select-sm" value={pagador} onChange={(e) => setPagador(e.target.value)} required disabled={!esAdmin}>
                    <option value="">Seleccionar...</option>
                    {opcionesPagador.map(b => <option key={`p_${b.usuario_id}`} value={b.usuario_id}>{b.username}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-muted">¿A quién?</label>
                  <select className="form-select form-select-sm" value={receptor} onChange={(e) => setReceptor(e.target.value)} required disabled={!esAdmin}>
                    <option value="">Seleccionar...</option>
                    {opcionesReceptor.map(b => <option key={`r_${b.usuario_id}`} value={b.usuario_id}>{b.username}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Cantidad (€)</label>
                  <input type="number" step="0.01" min="0.1" className="form-control text-center fw-bold" placeholder="0.00" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required readOnly={!esAdmin} />
                </div>
                {!esAdmin && (
                  <p className="text-muted small mb-3">
                    Selecciona uno de tus pagos sugeridos para rellenar el formulario. No puedes modificar manualmente los jugadores ni la cantidad.
                  </p>
                )}
                <button type="submit" className="btn btn-dark w-100 fw-bold" disabled={guardando || seleccionDuplicada || (!esAdmin && !pagoGuiadoSeleccionado)}>
                  {guardando ? 'Enviando...' : 'Registrar Pago'}
                </button>
                {seleccionDuplicada && (
                  <p className="text-danger small mt-2 mb-0 fw-bold text-center">
                    El pagador y el receptor deben ser jugadores distintos.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="fw-bold mb-3">Cómo saldar deudas</h4>
          {transacciones.length === 0 ? (
            <div className="alert alert-light border shadow-sm">
              Cuentas claras. Nadie debe nada a nadie.
            </div>
          ) : (
            <div className="list-group shadow-sm">
              {transacciones.map((t, index) => (
                <div key={index} className="list-group-item d-flex justify-content-between align-items-center p-3">
                  <div>
                    <span className="fw-bold text-danger">{t.de}</span>
                    <span className="text-muted mx-2">debe pagar a</span>
                    <span className="fw-bold text-success">{t.a}</span>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-dark fs-6">{t.cantidad}€</span>
                    {(esAdmin || Number(t.de_id) === Number(miUsuarioId)) && (
                      <button 
                        className="btn btn-sm btn-outline-primary ms-3"
                        onClick={() => preRellenarBizum(t.de_id, t.a_id, t.cantidad)}
                      >
                        Registrar Bizum
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

        {/* BLOQUE INFERIOR: Historial de Movimientos */}
        <hr className="text-muted opacity-25" />
        <h6 className="fw-bold text-secondary mb-3 mt-4">Historial de Movimientos</h6>
        
        {historial.length === 0 ? (
          <p className="text-muted small text-center bg-light p-3 rounded">Aún no hay transferencias registradas en este grupo.</p>
        ) : (
          <>
            <div className="list-group list-group-flush shadow-sm border rounded">
            {historialPaginado.map((mov) => (
              <div key={`mov_${mov.id}`} className="list-group-item p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    {/* OJO AQUÍ: Asegúrate de que tu LiquidacionSerializer devuelve pagador_nombre y receptor_nombre */}
                    <span className="fw-bold">{mov.pagador_nombre}</span>
                    <span className="text-muted mx-2">pagó a</span>
                    <span className="fw-bold">{mov.receptor_nombre}</span>
                  </div>
                  <span className="fw-bold text-success fs-5">+{mov.cantidad}€</span>
                </div>
                <small className="text-muted">
                  {new Date(mov.fecha).toLocaleDateString()} a las {new Date(mov.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </small>
              </div>
            ))}
            </div>

            {totalPaginasHistorial > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">
                  Página {paginaActualHistorial} de {totalPaginasHistorial}
                </small>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={paginaActualHistorial === 1}
                    onClick={() => setPaginaHistorial((previo) => Math.max(previo - 1, 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={paginaActualHistorial === totalPaginasHistorial}
                    onClick={() => setPaginaHistorial((previo) => Math.min(previo + 1, totalPaginasHistorial))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BalanceGlobal;

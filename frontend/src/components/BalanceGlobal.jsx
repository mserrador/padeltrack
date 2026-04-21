import React, { useState, useEffect } from 'react';
import api from '../services/api';

const BalanceGlobal = ({ grupoId }) => {
  const [balances, setBalances] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [pagador, setPagador] = useState('');
  const [receptor, setReceptor] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [guardando, setGuardando] = useState(false);
  const seleccionDuplicada = Boolean(pagador) && Boolean(receptor) && String(pagador) === String(receptor);

  const opcionesPagador = balances.filter((b) => String(b.usuario_id) !== String(receptor));
  const opcionesReceptor = balances.filter((b) => String(b.usuario_id) !== String(pagador));

  // EL ALGORITMO (Usando estrictamente 'username')
  const calcularLiquidaciones = (datos) => {
    if (!datos || datos.length === 0) return [];

    let deudores = datos
      .filter(b => b.balance < 0)
      .map(b => ({ username: b.username, balance: Math.abs(b.balance) }))
      .sort((a, b) => b.balance - a.balance);

    let acreedores = datos
      .filter(b => b.balance > 0)
      .map(b => ({ username: b.username, balance: b.balance }))
      .sort((a, b) => b.balance - a.balance);

    const transacciones = [];
    let i = 0, j = 0;

    while (i < deudores.length && j < acreedores.length) {
      let monto = Math.min(deudores[i].balance, acreedores[j].balance);
      
      if (monto > 0.01) { // Evitamos micro-deudas por decimales
        transacciones.push({
          de: deudores[i].username,
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

  const fetchData = async () => {
    try {
      const [resBalances, resHistorial] = await Promise.all([
        api.get(`grupos/${grupoId}/balance/`),
        api.get(`grupos/${grupoId}/historial_liquidaciones/`)
      ]);
      setBalances(resBalances.data);
      setHistorial(resHistorial.data);
    } catch (error) {
      console.error("Error al cargar datos económicos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [grupoId]);

  const handleRegistrarBizum = async (e) => {
    e.preventDefault();
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
      fetchData(); 
      alert("¡Transferencia registrada con éxito!");
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al registrar la transferencia.");
    } finally {
      setGuardando(false);
    }
  };

  // Función para rellenar los selects cuando clicas el botón "Registrar Bizum"
  const preRellenarBizum = (deUsername, aUsername, cantidadSugerida) => {
    // Buscamos por username, tal cual viene del algoritmo
    const usuarioPagador = balances.find(b => b.username === deUsername);
    const usuarioReceptor = balances.find(b => b.username === aUsername);
    
    if (usuarioPagador) setPagador(usuarioPagador.usuario_id);
    if (usuarioReceptor) setReceptor(usuarioReceptor.usuario_id);
    setCantidad(cantidadSugerida);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (cargando) return <div className="spinner-border text-success spinner-border-sm mt-3"></div>;

  const transacciones = calcularLiquidaciones(balances);

  return (
    <div className="card shadow-sm border-0 bg-white mt-4 mb-5">
      <div className="card-header bg-dark text-white py-3">
        <h5 className="mb-0 fw-bold">📊 Estado de Cuentas Global</h5>
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
            <div className="card bg-light border-0 p-3 shadow-sm">
              <form onSubmit={handleRegistrarBizum}>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-muted">¿Quién envía?</label>
                  <select className="form-select form-select-sm" value={pagador} onChange={(e) => setPagador(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {opcionesPagador.map(b => <option key={`p_${b.usuario_id}`} value={b.usuario_id}>{b.username}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-muted">¿A quién?</label>
                  <select className="form-select form-select-sm" value={receptor} onChange={(e) => setReceptor(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {opcionesReceptor.map(b => <option key={`r_${b.usuario_id}`} value={b.usuario_id}>{b.username}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Cantidad (€)</label>
                  <input type="number" step="0.01" min="0.1" className="form-control text-center fw-bold" placeholder="0.00" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-dark w-100 fw-bold" disabled={guardando || seleccionDuplicada}>
                  {guardando ? 'Enviando...' : '💸 Registrar Pago'}
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
          <h4 className="fw-bold mb-3">🤝 Cómo saldar deudas</h4>
          {transacciones.length === 0 ? (
            <div className="alert alert-light border shadow-sm">
              ✅ ¡Cuentas claras! Nadie debe nada a nadie.
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
                    <button 
                      className="btn btn-sm btn-outline-primary ms-3"
                      onClick={() => preRellenarBizum(t.de, t.a, t.cantidad)}
                    >
                      Registrar Bizum
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

        {/* BLOQUE INFERIOR: Historial de Movimientos */}
        <hr className="text-muted opacity-25" />
        <h6 className="fw-bold text-secondary mb-3 mt-4">📖 Historial de Movimientos</h6>
        
        {historial.length === 0 ? (
          <p className="text-muted small text-center bg-light p-3 rounded">Aún no hay transferencias registradas en este grupo.</p>
        ) : (
          <div className="list-group list-group-flush shadow-sm border rounded">
            {historial.map((mov) => (
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
                  🗓️ {new Date(mov.fecha).toLocaleDateString()} a las {new Date(mov.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceGlobal;

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

  const fetchData = async () => {
    try {
      // Hacemos las dos llamadas a la vez: Balances y el Historial
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
    if (!pagador || !receptor || !cantidad || pagador === receptor) {
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
      fetchData(); // Recargamos TODA la vista para actualizar balances e historial
      alert("¡Transferencia registrada con éxito!");
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al registrar la transferencia.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="spinner-border text-success spinner-border-sm mt-3"></div>;

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
                  <span className="fw-bold">{b.usuario_nombre}</span>
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
                    {balances.map(b => <option key={`p_${b.usuario_id}`} value={b.usuario_id}>{b.usuario_nombre}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-muted">¿A quién?</label>
                  <select className="form-select form-select-sm" value={receptor} onChange={(e) => setReceptor(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {balances.map(b => <option key={`r_${b.usuario_id}`} value={b.usuario_id}>{b.usuario_nombre}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Cantidad (€)</label>
                  <input type="number" step="0.01" min="0.1" className="form-control text-center fw-bold" placeholder="0.00" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-dark w-100 fw-bold" disabled={guardando}>
                  {guardando ? 'Enviando...' : '💸 Registrar Pago'}
                </button>
              </form>
            </div>
          </div>
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
                    <span className="fw-bold text-dark">{mov.pagador_nombre}</span>
                    <span className="text-muted mx-2">pagó a</span>
                    <span className="fw-bold text-dark">{mov.receptor_nombre}</span>
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
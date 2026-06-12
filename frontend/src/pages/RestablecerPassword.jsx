import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { restablecerPassword } from '../services/authService';

const RestablecerPassword = () => {
  const navigate = useNavigate();
  const [parametrosBusqueda] = useSearchParams();
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [datos, setDatos] = useState({
    nueva_password: '',
    confirmar_nueva_password: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [enlaceValido, setEnlaceValido] = useState(true);

  useEffect(() => {
    const uidParam = parametrosBusqueda.get('uid');
    const tokenParam = parametrosBusqueda.get('token');

    if (!uidParam || !tokenParam) {
      setEnlaceValido(false);
      return;
    }

    setUid(uidParam);
    setToken(tokenParam);
  }, [parametrosBusqueda]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      await restablecerPassword({ uid, token, ...datos });
      navigate('/login?reset=ok');
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.nueva_password) ? detalle.nueva_password[0] : null) ||
        (Array.isArray(detalle?.confirmar_nueva_password) ? detalle.confirmar_nueva_password[0] : null) ||
        detalle?.detail ||
        'No se pudo restablecer la contraseña.';
      alert(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow p-4 login-panel">
            <h2 className="text-center mb-2">Restablecer contraseña</h2>
            {!enlaceValido ? (
              <div className="alert alert-danger mb-0">
                El enlace para restablecer la contraseña no es válido.
              </div>
            ) : (
              <>
                <p className="text-center text-muted small mb-4">
                  Introduce tu nueva contraseña y confirma el cambio.
                </p>
                <form onSubmit={manejarEnvio}>
                  <div className="mb-3">
                    <label className="form-label">Nueva contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      value={datos.nueva_password}
                      onChange={(e) => setDatos((previo) => ({ ...previo, nueva_password: e.target.value }))}
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      value={datos.confirmar_nueva_password}
                      onChange={(e) => setDatos((previo) => ({ ...previo, confirmar_nueva_password: e.target.value }))}
                      minLength={8}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-success w-100" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar nueva contraseña'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestablecerPassword;

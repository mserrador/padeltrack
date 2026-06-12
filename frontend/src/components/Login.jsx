import React, { useEffect, useState } from 'react';
import { obtenerUsuarioActual, iniciarSesion, reenviarVerificacion } from '../services/authService';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailReenvio, setEmailReenvio] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const navigate = useNavigate();
  const [parametrosBusqueda] = useSearchParams();
  const registroOk = parametrosBusqueda.get('registro') === 'ok';
  const resetOk = parametrosBusqueda.get('reset') === 'ok';
  const correoRegistro = parametrosBusqueda.get('email');

  useEffect(() => {
    if (localStorage.getItem('token') && obtenerUsuarioActual()) {
      navigate('/app');
    }
  }, [navigate]);

  useEffect(() => {
    if (correoRegistro) {
      setEmailReenvio(correoRegistro);
    }
  }, [correoRegistro]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    try {
      await iniciarSesion(username, password);
      navigate('/app');
      window.location.reload(); 
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje = detalle?.detail || 'Usuario o contraseña incorrectos';
      alert(mensaje);
    }
  };

  const manejarReenvio = async (e) => {
    e.preventDefault();
    if (!emailReenvio.trim()) {
      alert('Indica el correo de tu cuenta para reenviar la verificación.');
      return;
    }

    setReenviando(true);
    try {
      const respuesta = await reenviarVerificacion({ email: emailReenvio.trim() });
      alert(respuesta.detail || 'Te hemos reenviado el correo de verificación.');
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.email) ? detalle.email[0] : null) ||
        detalle?.detail ||
        'No se pudo reenviar el correo de verificación.';
      alert(mensaje);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5 col-lg-4">
          <div className="card shadow p-4 login-panel">
            <h2 className="text-center mb-2">Entrar a PadelTrack</h2>
            <p className="text-center text-muted small mb-4">Gestiona tus partidos y cuentas en un solo sitio.</p>
            {registroOk && (
              <div className="alert alert-success small" role="alert">
                Cuenta creada correctamente. Revisa {correoRegistro || 'tu correo'} y verifica la cuenta antes de iniciar sesión.
              </div>
            )}
            {resetOk && (
              <div className="alert alert-success small" role="alert">
                Contraseña actualizada correctamente. Ya puedes iniciar sesión con la nueva contraseña.
              </div>
            )}
            <form onSubmit={manejarEnvio}>
              <div className="mb-3">
                <label className="form-label">Usuario</label>
                <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="text-end mb-3">
                <Link to="/olvide-password" className="small">He olvidado mi contraseña</Link>
              </div>
              <button type="submit" className="btn btn-success w-100">Iniciar Sesión</button>
            </form>
            <hr className="my-4" />
            <div>
              <p className="text-center text-muted small mb-3">
                Si ya te registraste pero no encuentras el correo, puedes pedir otro enlace de verificación.
              </p>
              <form onSubmit={manejarReenvio}>
                <div className="mb-3">
                  <label className="form-label">Correo de tu cuenta</label>
                  <input
                    type="email"
                    className="form-control"
                    value={emailReenvio}
                    onChange={(e) => setEmailReenvio(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-outline-success w-100" disabled={reenviando}>
                  {reenviando ? 'Reenviando...' : 'Reenviar correo de verificación'}
                </button>
              </form>
            </div>
            <p className="text-center small mt-3 mb-0">
              ¿Nuevo por aquí? <Link to="/registro">Crear cuenta</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

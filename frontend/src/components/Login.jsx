import React, { useEffect, useState } from 'react';
import { obtenerUsuarioActual, iniciarSesion } from '../services/authService';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [parametrosBusqueda] = useSearchParams();
  const registroOk = parametrosBusqueda.get('registro') === 'ok';
  const correoRegistro = parametrosBusqueda.get('email');

  useEffect(() => {
    if (localStorage.getItem('token') && obtenerUsuarioActual()) {
      navigate('/app');
    }
  }, [navigate]);

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
            <form onSubmit={manejarEnvio}>
              <div className="mb-3">
                <label className="form-label">Usuario</label>
                <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-success w-100">Iniciar Sesión</button>
            </form>
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

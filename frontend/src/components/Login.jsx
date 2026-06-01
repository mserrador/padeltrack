import React, { useEffect, useState } from 'react';
import { getUsuarioActual, login } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token') && getUsuarioActual()) {
      navigate('/app');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/app');
      window.location.reload(); 
    } catch (error) {
      alert("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5 col-lg-4">
          <div className="card shadow p-4 login-panel">
            <h2 className="text-center mb-2">Entrar a PadelTrack</h2>
            <p className="text-center text-muted small mb-4">Gestiona tus partidos y cuentas en un solo sitio.</p>
            <form onSubmit={handleSubmit}>
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

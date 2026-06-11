import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registrarUsuario, obtenerUsuarioActual } from '../services/authService';

const Registro = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardando, setGuardando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token') && obtenerUsuarioActual()) {
      navigate('/app');
    }
  }, [navigate]);

  const manejarEnvio = async (e) => {
    e.preventDefault();

    if (password !== confirmarPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

      setGuardando(true);
    try {
      await registrarUsuario({ username, email, password });
      navigate(`/login?registro=ok&email=${encodeURIComponent(email)}`);
    } catch (error) {
      const detalle = error.response?.data;
      const primerError =
        typeof detalle === 'string'
          ? detalle
          : Array.isArray(detalle?.username)
            ? detalle.username[0]
            : Array.isArray(detalle?.email)
              ? detalle.email[0]
              : Array.isArray(detalle?.password)
                ? detalle.password[0]
                : detalle?.detail || 'No se pudo completar el registro.';
      alert(primerError);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow p-4 login-panel">
            <h2 className="text-center mb-2">Crear cuenta en PadelTrack</h2>
            <p className="text-center text-muted small mb-4">Tu usuario será único y tu correo no se podrá repetir.</p>
            <form onSubmit={manejarEnvio}>
              <div className="mb-3">
                <label className="form-label">Usuario</label>
                <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
              </div>
              <div className="mb-3">
                <label className="form-label">Correo</label>
                <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="mb-3">
                <label className="form-label">Confirmar contraseña</label>
                <input type="password" className="form-control" value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)} required minLength={8} />
              </div>
              <button type="submit" className="btn btn-success w-100" disabled={guardando}>
                {guardando ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
            <p className="text-center small mt-3 mb-0">
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Registro;

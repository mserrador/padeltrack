import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { solicitarRestablecerPassword } from '../services/authService';

const OlvidePassword = () => {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const respuesta = await solicitarRestablecerPassword({ email: email.trim() });
      setMensaje(respuesta.detail || 'Si existe una cuenta verificada con ese correo, te hemos enviado un enlace para restablecer la contraseña.');
    } catch (error) {
      const detalle = error.response?.data;
      const texto = detalle?.detail || 'No se pudo solicitar el restablecimiento de contraseña.';
      alert(texto);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow p-4 login-panel">
            <h2 className="text-center mb-2">He olvidado mi contraseña</h2>
            <p className="text-center text-muted small mb-4">
              Introduce el correo de tu cuenta verificada y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            {mensaje && (
              <div className="alert alert-success small" role="alert">
                {mensaje}
              </div>
            )}
            <form onSubmit={manejarEnvio}>
              <div className="mb-3">
                <label className="form-label">Correo</label>
                <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-success w-100" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
              </button>
            </form>
            <p className="text-center small mt-3 mb-0">
              <Link to="/login">Volver a iniciar sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OlvidePassword;

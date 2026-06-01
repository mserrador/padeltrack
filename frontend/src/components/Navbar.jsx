import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getUsuarioActual, logout } from '../services/authService';

const Navbar = ({ theme, cambiarTema }) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = getUsuarioActual();
  const estaEnZonaPrivada = location.pathname.startsWith('/app') || location.pathname.startsWith('/grupos/') || location.pathname.startsWith('/sesiones/') || location.pathname.includes('/nueva-sesion');

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  return (
    <nav className={`navbar app-navbar navbar-expand-lg shadow-sm ${theme === 'dark' ? 'navbar-dark' : 'navbar-light'}`}>
      <div className="container">
        <Link className="navbar-brand fw-bold brand-mark" to="/">
          <span>PadelTrack</span>
        </Link>
        
        <button className="navbar-toggler" type="button" onClick={() => setMenuAbierto(!menuAbierto)}>
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${menuAbierto ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto">
            {usuario ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link pt-nav-link" to="/app">Mis Grupos</Link>
                </li>
                <li className="nav-item">
                  <span className="nav-link pt-nav-link fw-bold">Hola, {usuario}</span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-link nav-link pt-nav-link" onClick={handleLogout}>Salir</button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link pt-nav-link" to="/login">Iniciar Sesión</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link pt-nav-link" to="/registro">Crear cuenta</Link>
                </li>
                {estaEnZonaPrivada && (
                  <li className="nav-item">
                    <Link className="nav-link pt-nav-link" to="/">Ir a inicio</Link>
                  </li>
                )}
              </>
            )}
            <li className="nav-item ms-lg-2">
              <button
                type="button"
                className="btn theme-toggle theme-toggle-icon"
                onClick={cambiarTema}
                aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

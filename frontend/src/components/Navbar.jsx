import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUsuarioActual, logout } from '../services/authService';

const Navbar = () => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();
  const usuario = getUsuarioActual();

  const handleLogout = () => {
    logout();
    navigate('/login');
    window.location.reload();
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">🎾 PadelTrack</Link>
        
        <button className="navbar-toggler" type="button" onClick={() => setMenuAbierto(!menuAbierto)}>
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${menuAbierto ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto">
            {usuario ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/">Mis Grupos</Link>
                </li>
                <li className="nav-item">
                  <span className="nav-link text-white fw-bold">Hola, {usuario}</span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-link nav-link" onClick={handleLogout}>Salir</button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <Link className="nav-link" to="/login">Iniciar Sesión</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
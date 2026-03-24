import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  // Este estado controla si el menú de móvil está abierto o cerrado
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Función para cerrar el menú al hacer clic en un enlace (útil en móviles)
  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success shadow-sm">
      <div className="container">
        {/* Usamos Link en lugar de <a> para navegar sin recargar la página */}
        <Link className="navbar-brand fw-bold" to="/">🎾 PadelTrack</Link>
        
        {/* Botón de hamburguesa para móviles */}
        <button 
          className="navbar-toggler" 
          type="button" 
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Enlaces de navegación. La clase 'show' se añade si menuAbierto es true */}
        <div className={`collapse navbar-collapse ${menuAbierto ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/" onClick={cerrarMenu}>Mis Grupos</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/perfil" onClick={cerrarMenu}>Mi Perfil</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
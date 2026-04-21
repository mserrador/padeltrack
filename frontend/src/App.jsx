import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MisGrupos from './pages/MisGrupos'; 
import DetalleGrupo from './pages/DetalleGrupo';
import DetalleSesion from './pages/DetalleSesion';
import Login from './components/Login'
import CrearSesion from './components/CrearSesion'

const THEME_STORAGE_KEY = 'padeltrack-theme';

function App() {
  const [theme, setTheme] = useState(() => {
    const guardado = localStorage.getItem(THEME_STORAGE_KEY);
    return guardado === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const cambiarTema = () => {
    setTheme((anterior) => (anterior === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell min-vh-100">
      <Navbar theme={theme} cambiarTema={cambiarTema} />
      <main className="container py-4 app-main fade-in">
        <Routes>
          <Route path="/" element={<MisGrupos />} />
          <Route path="/perfil" element={<h2>Pantalla: Mi Perfil</h2>} />
          <Route path="/grupos/:id" element={<DetalleGrupo />} />
          <Route path="/sesiones/:id" element={<DetalleSesion />} />
          <Route path="/login" element={<Login />} />
          <Route path="/grupos/:id/nueva-sesion" element={<CrearSesion />} />
          <Route path="/grupo/:id/nueva-sesion" element={<CrearSesion />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

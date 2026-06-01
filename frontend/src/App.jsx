import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RutaProtegida from './components/RutaProtegida';
import Landing from './pages/Landing';
import NoEncontrado from './pages/NoEncontrado';
import MisGrupos from './pages/MisGrupos'; 
import DetalleGrupo from './pages/DetalleGrupo';
import DetalleSesion from './pages/DetalleSesion';
import Login from './components/Login'
import CrearSesion from './components/CrearSesion'
import Registro from './pages/Registro';

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
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<RutaProtegida><MisGrupos /></RutaProtegida>} />
          <Route path="/perfil" element={<RutaProtegida><h2>Pantalla: Mi Perfil</h2></RutaProtegida>} />
          <Route path="/grupos/:id" element={<RutaProtegida><DetalleGrupo /></RutaProtegida>} />
          <Route path="/sesiones/:id" element={<RutaProtegida><DetalleSesion /></RutaProtegida>} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/grupos/:id/nueva-sesion" element={<RutaProtegida><CrearSesion /></RutaProtegida>} />
          <Route path="/grupo/:id/nueva-sesion" element={<RutaProtegida><CrearSesion /></RutaProtegida>} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

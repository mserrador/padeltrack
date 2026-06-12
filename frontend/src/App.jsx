import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RutaProtegida from './components/RutaProtegida';
import Landing from './pages/Landing';
import NoEncontrado from './pages/NoEncontrado';
import MisGrupos from './pages/MisGrupos'; 
import DetalleGrupo from './pages/DetalleGrupo';
import DetalleSesion from './pages/DetalleSesion';
import Perfil from './pages/Perfil';
import CrearSesionPublica from './pages/CrearSesionPublica';
import DetalleSesionPublica from './pages/DetalleSesionPublica';
import Login from './components/Login'
import CrearSesion from './components/CrearSesion'
import Registro from './pages/Registro';
import VerificarEmail from './pages/VerificarEmail';
import OlvidePassword from './pages/OlvidePassword';
import RestablecerPassword from './pages/RestablecerPassword';

const CLAVE_ALMACENAMIENTO_TEMA = 'padeltrack-theme';

function App() {
  const [tema, setTema] = useState(() => {
    const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO_TEMA);
    return guardado === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem(CLAVE_ALMACENAMIENTO_TEMA, tema);
  }, [tema]);

  const cambiarTema = () => {
    setTema((anterior) => (anterior === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell min-vh-100">
      <Navbar tema={tema} cambiarTema={cambiarTema} />
      <main className="container py-4 app-main fade-in">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<RutaProtegida><MisGrupos /></RutaProtegida>} />
          <Route path="/perfil" element={<RutaProtegida><Perfil /></RutaProtegida>} />
          <Route path="/grupos/:id" element={<RutaProtegida><DetalleGrupo /></RutaProtegida>} />
          <Route path="/sesiones/:id" element={<RutaProtegida><DetalleSesion /></RutaProtegida>} />
          <Route path="/sesiones-publicas/:id" element={<RutaProtegida><DetalleSesionPublica /></RutaProtegida>} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/olvide-password" element={<OlvidePassword />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />
          <Route path="/grupos/:id/nueva-sesion" element={<RutaProtegida><CrearSesion /></RutaProtegida>} />
          <Route path="/grupo/:id/nueva-sesion" element={<RutaProtegida><CrearSesion /></RutaProtegida>} />
          <Route path="/sesiones-publicas/nueva" element={<RutaProtegida><CrearSesionPublica /></RutaProtegida>} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

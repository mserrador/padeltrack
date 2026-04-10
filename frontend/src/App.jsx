import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MisGrupos from './pages/MisGrupos'; 
import DetalleGrupo from './pages/DetalleGrupo';
import DetalleSesion from './pages/DetalleSesion';
import Login from './components/Login'

function App() {
  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<MisGrupos />} />
          <Route path="/perfil" element={<h2>Pantalla: Mi Perfil</h2>} />
          <Route path="/grupos/:id" element={<DetalleGrupo />} />
          <Route path="/sesiones/:id" element={<DetalleSesion />} />
          <Route path="/grupos/:id" element={<h2>Detalle del Grupo</h2>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
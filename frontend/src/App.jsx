import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
// Importamos tu nueva página
import MisGrupos from './pages/MisGrupos'; 

function App() {
  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<MisGrupos />} />
          <Route path="/perfil" element={<h2>Pantalla: Mi Perfil</h2>} />
          {/* Preparando la ruta para cuando hagamos el detalle del grupo */}
          <Route path="/grupos/:id" element={<h2>Detalle del Grupo</h2>} /> 
        </Routes>
      </main>
    </div>
  );
}

export default App;
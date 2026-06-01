import React from 'react';
import { Link } from 'react-router-dom';

const NoEncontrado = () => {
  return (
    <div className="text-center py-5">
      <p className="text-secondary mb-2">Error 404</p>
      <h2 className="fw-bold mb-3">La página que buscas no existe</h2>
      <p className="text-secondary mb-4">Puede que el enlace esté mal escrito o ya no esté disponible.</p>
      <Link to="/" className="btn btn-success px-4">
        Volver al inicio
      </Link>
    </div>
  );
};

export default NoEncontrado;

import React from 'react';

const SeccionPlegable = ({ idSeccion, titulo, abierta, onToggle, children }) => {
  return (
    <section className="card border-0 shadow-sm mt-4 seccion-plegable">
      <button
        type="button"
        className="seccion-plegable-cabecera"
        onClick={() => onToggle(idSeccion)}
        aria-expanded={abierta}
        aria-controls={`contenido-${idSeccion}`}
      >
        <h4 className="mb-0">{titulo}</h4>
        <span className={`seccion-plegable-flecha ${abierta ? 'abierta' : ''}`}>▸</span>
      </button>

      <div id={`contenido-${idSeccion}`} className={`seccion-plegable-contenido ${abierta ? 'abierto' : ''}`}>
        <div className="seccion-plegable-contenido-inner p-4">{children}</div>
      </div>
    </section>
  );
};

export default SeccionPlegable;

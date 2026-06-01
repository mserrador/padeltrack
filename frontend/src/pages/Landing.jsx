import React from 'react';
import { Link } from 'react-router-dom';
import { getUsuarioActual } from '../services/authService';

const Landing = () => {
  const haySesion = Boolean(localStorage.getItem('token') && getUsuarioActual());

  return (
    <section className="landing-hero py-5">
      <div className="row align-items-center g-4">
        <div className="col-12 col-lg-7">
          <span className="landing-kicker">Organiza tu padel sin caos</span>
          <h1 className="display-5 fw-bold mt-2 mb-3">PadelTrack: partidos, marcador y cuentas claras</h1>
          <p className="lead text-secondary mb-4">
            Crea sesiones con tu grupo, confirma asistencia, registra resultados y liquida pagos en segundos.
            Todo en un solo flujo.
          </p>
          {!haySesion && (
            <div className="d-flex flex-wrap gap-2">
              <Link to="/login" className="btn btn-success btn-lg px-4">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="btn btn-outline-primary btn-lg px-4">
                Crear cuenta
              </Link>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-5">
          <div className="card landing-panel p-4">
            <h3 className="fw-bold mb-3">Pensado para grupos reales</h3>
            <ul className="list-unstyled m-0 d-grid gap-3">
              <li>Gestión de grupos y sesiones en un clic.</li>
              <li>Marcador clásico y modo rey de la pista.</li>
              <li>Balance global con sugerencias de liquidación.</li>
              <li>Historial para no perder contexto entre semanas.</li>
            </ul>
          </div>
        </div>
      </div>

      <div id="como-funciona" className="row g-3 mt-4">
        <div className="col-12 col-md-4">
          <div className="card p-3 h-100 landing-step">
            <p className="mb-1 small text-secondary">Paso 1</p>
            <h5 className="fw-bold">Crea una sesión</h5>
            <p className="mb-0 text-secondary">Define pista, fecha y coste total del partido.</p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card p-3 h-100 landing-step">
            <p className="mb-1 small text-secondary">Paso 2</p>
            <h5 className="fw-bold">Juega y registra</h5>
            <p className="mb-0 text-secondary">Confirma asistencia, lleva marcador y cierra resultado.</p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card p-3 h-100 landing-step">
            <p className="mb-1 small text-secondary">Paso 3</p>
            <h5 className="fw-bold">Liquida fácil</h5>
            <p className="mb-0 text-secondary">Consulta quien debe a quien y registra pagos al instante.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Landing;

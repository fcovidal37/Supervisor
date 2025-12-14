import React, { useState, useEffect } from 'react';
import './App.css';
import ApiClient from './api-client';

// Datos iniciales
const datosIniciales = {
  supervisor: {
    id_super: 1,
    nombre: "UserName",
    cargo: "Supervisor de Operaciones",
    email: "user.name@empresa.com"
  },
  incidencias: [],
  trabajadores: []
};

function App() {
  const [supervisor, setSupervisor] = useState(datosIniciales.supervisor);
  const [incidencias, setIncidencias] = useState(datosIniciales.incidencias);
  const [trabajadores, setTrabajadores] = useState(datosIniciales.trabajadores);
  const [filtroEstado, setFiltroEstado] = useState(0);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [incidenciaEditando, setIncidenciaEditando] = useState(null);
  const [comentarioTemp, setComentarioTemp] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState({ id: null, estado: null });
  const [resultadosBusqueda, setResultadosBusqueda] = useState(0);
  const [estadisticas, setEstadisticas] = useState({ total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarTodosLosDatos();
  }, []);

  useEffect(() => {
    const incidenciasFiltradas = getIncidenciasFiltradas();
    setResultadosBusqueda(incidenciasFiltradas.length);
  }, [filtroEstado, busquedaTexto, incidencias]);

  const cargarTodosLosDatos = async () => {
    setCargando(true);
    setError(null);
    
    try {
      const [supervisorData, incidenciasData, trabajadoresData, statsData] = await Promise.all([
        ApiClient.getSupervisor(),
        ApiClient.getIncidencias(),
        ApiClient.getTrabajadores(),
        ApiClient.getSupervisorStats()
      ]);

      setSupervisor(supervisorData);
      setIncidencias(incidenciasData.data || incidenciasData);
      setTrabajadores(trabajadoresData);
      setEstadisticas(statsData);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError(`Error al cargar datos: ${error.message}`);
      setIncidencias([]);
      setTrabajadores([]);
    } finally {
      setCargando(false);
    }
  };

  const getIncidenciasFiltradas = () => {
    let incidenciasFiltradas = [...incidencias];
    
    if (filtroEstado > 0) {
      incidenciasFiltradas = incidenciasFiltradas.filter(inc => inc.estado === filtroEstado);
    }
    
    if (busquedaTexto.trim() !== "") {
      const terminoBusqueda = busquedaTexto.toLowerCase().trim();
      
      incidenciasFiltradas = incidenciasFiltradas.filter(incidencia => {
        const casoCoincide = incidencia.caso.toLowerCase().includes(terminoBusqueda);
        const comentarioCoincide = incidencia.comentario && 
          incidencia.comentario.toLowerCase().includes(terminoBusqueda);
        const idCoincide = incidencia.id_incidencia.toString().includes(terminoBusqueda);
        
        const trabajador = getTrabajadorPorId(incidencia.id_trabajador);
        const nombreTrabajadorCoincide = 
          `${trabajador.nombres} ${trabajador.apellido1} ${trabajador.apellido2}`
          .toLowerCase()
          .includes(terminoBusqueda);
        
        const rutTrabajadorCoincide = trabajador.RUT.toString().includes(terminoBusqueda);
        
        return casoCoincide || comentarioCoincide || idCoincide || 
               nombreTrabajadorCoincide || rutTrabajadorCoincide;
      });
    }
    
    return incidenciasFiltradas;
  };

  const getTrabajadorPorId = (id_trabajador) => {
    const trabajador = trabajadores.find(t => t.id_trabajador === id_trabajador);
    return trabajador || { nombres: 'No asignado', apellido1: '', RUT: '' };
  };

  const iniciarActualizacionIncidencia = (id_incidencia, nuevoEstado) => {
    setAccionPendiente({ id: id_incidencia, estado: nuevoEstado });
    setIncidenciaEditando(id_incidencia);
    setComentarioTemp("");
    setMostrarConfirmacion(true);
  };

  const confirmarActualizacion = async () => {
    if (!comentarioTemp.trim()) {
      alert('Debe agregar un comentario para resolver la incidencia');
      return;
    }

    if (comentarioTemp.length > 200) {
      alert('El comentario no puede exceder los 200 caracteres');
      return;
    }

    try {
      // ✅ USANDO PATCH
      await ApiClient.patchIncidencia(accionPendiente.id, {
        estado: accionPendiente.estado,
        comentario: comentarioTemp
      });

      await cargarTodosLosDatos();
      
      setIncidenciaEditando(null);
      setComentarioTemp("");
      setMostrarConfirmacion(false);
      setAccionPendiente({ id: null, estado: null });
      
      alert('Incidencia actualizada correctamente');
      
    } catch (error) {
      console.error('Error actualizando incidencia:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const reabrirIncidencia = async (id_incidencia) => {
    if (!window.confirm('¿Está seguro de que desea reabrir esta incidencia?')) {
      return;
    }

    try {
      // ✅ USANDO PATCH
      await ApiClient.patchReabrirIncidencia(id_incidencia);
      await cargarTodosLosDatos();
      alert('Incidencia reabierta correctamente');
    } catch (error) {
      console.error('Error reabriendo incidencia:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const cancelarActualizacion = () => {
    setIncidenciaEditando(null);
    setComentarioTemp("");
    setMostrarConfirmacion(false);
    setAccionPendiente({ id: null, estado: null });
  };

  const getNombreEstado = (estado) => {
    switch(estado) {
      case 1: return 'Pendiente';
      case 2: return 'Aprobado';
      case 3: return 'Rechazado';
      default: return 'Desconocido';
    }
  };

  const getClaseEstado = (estado) => {
    switch(estado) {
      case 1: return 'estado-pendiente';
      case 2: return 'estado-favorable';
      case 3: return 'estado-rechazado';
      default: return '';
    }
  };

  const getDescripcionEstado = (estado) => {
    switch(estado) {
      case 1: return 'Incidencia pendiente de revisión';
      case 2: return 'Incidencia aprobada';
      case 3: return 'Incidencia rechazada';
      default: return '';
    }
  };

  const limpiarBusqueda = () => {
    setBusquedaTexto("");
  };

  const cargarIncidenciasConFiltros = async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroEstado > 0) params.estado = filtroEstado;
      if (busquedaTexto.trim()) params.busqueda = busquedaTexto;
      
      const response = await ApiClient.getIncidencias(params);
      setIncidencias(response.data);
      setResultadosBusqueda(response.total);
    } catch (error) {
      console.error('Error cargando incidencias:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const resaltarTexto = (texto) => {
    if (!busquedaTexto || !texto) return texto;
    
    const termino = busquedaTexto.toLowerCase();
    const textoLower = texto.toString().toLowerCase();
    const indice = textoLower.indexOf(termino);
    
    if (indice === -1) return texto;
    
    const antes = texto.substring(0, indice);
    const coincidencia = texto.substring(indice, indice + termino.length);
    const despues = texto.substring(indice + termino.length);
    
    return (
      <>
        {antes}
        <span className="texto-resaltado">{coincidencia}</span>
        {despues}
      </>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-titles">
            <h1>Módulo de Supervisor</h1>
            <p>Sistema de gestión de casos e incidencias</p>
          </div>
          <div className="supervisor-info">
            <div className="supervisor-avatar">
              <span>{supervisor.nombre.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="supervisor-details">
              <h3>{supervisor.nombre}</h3>
              <p>{supervisor.cargo}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button onClick={cargarTodosLosDatos}>Reintentar</button>
          </div>
        )}

        {cargando ? (
          <div className="cargando">
            <div className="spinner"></div>
            <p>Cargando incidencias del sistema...</p>
          </div>
        ) : (
          <>
            {/* Panel de información y estadísticas */}
            <section className="seccion-estadisticas">
              <div className="estadisticas-grid">
                <div className="estadistica-card total">
                  <h3>Total Incidencias</h3>
                  <p className="estadistica-valor">{estadisticas.total}</p>
                  <p className="estadistica-desc">Casos asignados</p>
                </div>
                <div className="estadistica-card pendientes">
                  <h3>Pendientes</h3>
                  <p className="estadistica-valor">{estadisticas.pendientes}</p>
                  <p className="estadistica-desc">Requieren atención</p>
                </div>
                <div className="estadistica-card resueltas">
                  <h3>Aprobadas</h3>
                  <p className="estadistica-valor">{estadisticas.aprobadas}</p>
                  <p className="estadistica-desc">Casos aprobados</p>
                </div>
                <div className="estadistica-card resultados">
                  <h3>Rechazadas</h3>
                  <p className="estadistica-valor">{estadisticas.rechazadas}</p>
                  <p className="estadistica-desc">Casos rechazados</p>
                </div>
              </div>
            </section>

            {/* Panel de filtros y búsqueda */}
            <section className="seccion-filtros">
              <div className="filtros-container">
                <div className="filtros-columnas">
                  {/* Columna 1: Filtro por estado */}
                  <div className="filtro-columna">
                    <div className="filtro-group">
                      <label htmlFor="filtroEstado">
                        <span className="filtro-icon">📊</span>
                        Filtrar por estado:
                      </label>
                      <select 
                        id="filtroEstado"
                        value={filtroEstado} 
                        onChange={(e) => setFiltroEstado(parseInt(e.target.value))}
                      >
                        <option value="0">Todas las incidencias</option>
                        <option value="1">Solo pendientes</option>
                        <option value="2">Solo aprobadas</option>
                        <option value="3">Solo rechazadas</option>
                      </select>
                    </div>
                  </div>

                  {/* Columna 2: Búsqueda por texto */}
                  <div className="filtro-columna">
                    <div className="filtro-group">
                      <label htmlFor="busquedaTexto">
                        <span className="filtro-icon">🔍</span>
                        Buscar por texto:
                      </label>
                      <div className="busqueda-container">
                        <input
                          id="busquedaTexto"
                          type="text"
                          value={busquedaTexto}
                          onChange={(e) => setBusquedaTexto(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && cargarIncidenciasConFiltros()}
                          placeholder="Buscar por caso, trabajador, RUT o ID..."
                          className="busqueda-input"
                        />
                        {busquedaTexto && (
                          <button 
                            className="btn-limpiar-busqueda"
                            onClick={limpiarBusqueda}
                            title="Limpiar búsqueda"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información de resultados */}
                <div className="info-resultados">
                  {busquedaTexto ? (
                    <div className="resultados-info activa">
                      <span className="resultados-icon">📋</span>
                      <p>
                        Mostrando <strong>{resultadosBusqueda}</strong> de <strong>{estadisticas.total}</strong> incidencias
                        {busquedaTexto && ` para "${busquedaTexto}"`}
                      </p>
                    </div>
                  ) : (
                    <div className="resultados-info">
                      <span className="resultados-icon">📊</span>
                      <p>
                        Total: <strong>{estadisticas.total}</strong> incidencias | 
                        Filtro: <strong>{filtroEstado > 0 ? getNombreEstado(filtroEstado) : "Todos"}</strong>
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Botón para aplicar filtros */}
                <div className="botones-filtro">
                  <button 
                    className="btn btn-primario"
                    onClick={cargarIncidenciasConFiltros}
                    disabled={cargando}
                  >
                    {cargando ? 'Aplicando...' : 'Aplicar Filtros'}
                  </button>
                  {(filtroEstado > 0 || busquedaTexto) && (
                    <button 
                      className="btn btn-secundario"
                      onClick={() => {
                        setFiltroEstado(0);
                        setBusquedaTexto("");
                        cargarTodosLosDatos();
                      }}
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Tabla de incidencias */}
            <section className="seccion-incidencias">
              <div className="seccion-header">
                <h2>Incidencias Asignadas</h2>
                <p className="seccion-subtitulo">Gestiona el estado de cada caso asignado a tu área</p>
              </div>
              
              {getIncidenciasFiltradas().length === 0 ? (
                <div className="sin-incidencias">
                  <div className="sin-incidencias-icon">🔍</div>
                  <h3>No se encontraron incidencias</h3>
                  <p>
                    {busquedaTexto 
                      ? `No hay resultados para "${busquedaTexto}". Intenta con otros términos.`
                      : filtroEstado > 0 
                        ? `No hay incidencias con estado "${getNombreEstado(filtroEstado)}".`
                        : "No hay incidencias registradas."}
                  </p>
                  {(busquedaTexto || filtroEstado > 0) && (
                    <button 
                      className="btn btn-primario"
                      onClick={() => {
                        setBusquedaTexto("");
                        setFiltroEstado(0);
                        cargarTodosLosDatos();
                      }}
                    >
                      Limpiar todos los filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="incidencias-container">
                  {getIncidenciasFiltradas().map(incidencia => {
                    const trabajador = incidencia.trabajador || getTrabajadorPorId(incidencia.id_trabajador);
                    
                    return (
                      <div key={incidencia.id_incidencia} className="incidencia-card">
                        <div className="incidencia-header">
                          <div className="incidencia-id">
                            <span className="id-badge">ID: {incidencia.id_incidencia}</span>
                            <span className={`estado-badge ${getClaseEstado(incidencia.estado)}`}>
                              {getNombreEstado(incidencia.estado)}
                            </span>
                          </div>
                          <div className="incidencia-fecha">
                            <span className="fecha-label">Última actualización: </span>
                            <span className="fecha-valor">
                              {new Date(incidencia.fecha_actualizacion).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="incidencia-body">
                          <h3 className="incidencia-titulo">
                            {resaltarTexto(incidencia.caso)}
                          </h3>
                          <div className="incidencia-trabajador">
                            <span className="trabajador-label">Trabajador: </span>
                            <span className="trabajador-nombre">
                              {resaltarTexto(`${trabajador.nombres} ${trabajador.apellido1}`)}
                            </span>
                            <span className="trabajador-rut">
                              (RUT: {resaltarTexto(trabajador.RUT?.toString() || '')})
                            </span>
                          </div>
                          
                          {incidencia.comentario && (
                            <div className="incidencia-comentario">
                              <span className="comentario-label">Comentario: </span>
                              <p className="comentario-texto">
                                {resaltarTexto(incidencia.comentario)}
                              </p>
                            </div>
                          )}
                          
                          <div className="incidencia-descripcion">
                            <p>{getDescripcionEstado(incidencia.estado)}</p>
                          </div>
                        </div>
                        
                        <div className="incidencia-acciones">
                          {incidencia.estado === 1 ? (
                            <div className="acciones-pendiente">
                              <p className="acciones-titulo">Resolver incidencia:</p>
                              <div className="botones-accion">
                                <button 
                                  className="btn btn-favorable"
                                  onClick={() => iniciarActualizacionIncidencia(incidencia.id_incidencia, 2)}
                                >
                                  Aprobar
                                </button>
                                <button 
                                  className="btn btn-rechazado"
                                  onClick={() => iniciarActualizacionIncidencia(incidencia.id_incidencia, 3)}
                                >
                                  Rechazar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="acciones-resuelta">
                              <p className="acciones-titulo">Incidencia resuelta</p>
                              <button 
                                className="btn btn-reabrir"
                                onClick={() => reabrirIncidencia(incidencia.id_incidencia)}
                              >
                                Reabrir Incidencia
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Modal de confirmación para actualización */}
            {mostrarConfirmacion && (
              <div className="modal-overlay">
                <div className="modal-contenido">
                  <div className="modal-header">
                    <h3>Confirmar resolución de incidencia</h3>
                    <button className="btn-cerrar-modal" onClick={cancelarActualizacion}>×</button>
                  </div>
                  
                  <div className="modal-body">
                    <p>
                      Estás a punto de cambiar el estado de la incidencia <strong>ID: {accionPendiente.id}</strong> a 
                      <strong> {getNombreEstado(accionPendiente.estado)}</strong>.
                    </p>
                    
                    <div className="formulario-comentario">
                      <label htmlFor="comentario">
                        Comentario de resolución <span className="requerido">*</span>
                        <span className="contador-caracteres">
                          {comentarioTemp.length}/200 caracteres
                        </span>
                      </label>
                      <textarea 
                        id="comentario"
                        value={comentarioTemp}
                        onChange={(e) => setComentarioTemp(e.target.value)}
                        placeholder="Agregue un comentario explicando la resolución de la incidencia..."
                        rows="4"
                        maxLength="200"
                        autoFocus
                      />
                      <div className="comentario-requisitos">
                        <p>✅ Mínimo 1 carácter, máximo 200 caracteres</p>
                        <p>📝 Este comentario quedará registrado en el historial de la incidencia</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="modal-footer">
                    <button className="btn btn-secundario" onClick={cancelarActualizacion}>
                      Cancelar
                    </button>
                    <button 
                      className="btn btn-primario" 
                      onClick={confirmarActualizacion}
                      disabled={!comentarioTemp.trim()}
                    >
                      Confirmar y Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Información del sistema */}
            <section className="seccion-sistema">
              <div className="sistema-info">
                <h3>Información del Sistema</h3>
                <div className="sistema-datos">
                  <div className="dato-sistema">
                    <span className="dato-label">Supervisor activo:</span>
                    <span className="dato-valor">{supervisor.nombre}</span>
                  </div>
                  <div className="dato-sistema">
                    <span className="dato-label">ID Supervisor:</span>
                    <span className="dato-valor">{supervisor.id_super}</span>
                  </div>
                  <div className="dato-sistema">
                    <span className="dato-label">Última actualización:</span>
                    <span className="dato-valor">{new Date().toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <div className="sistema-nota">
                  <p>
                    <strong>Nota:</strong> Sistema conectado a API REST con PATCH para actualizaciones parciales.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="App-footer">
        <div className="footer-content">
          <p>Módulo de Supervisor &copy; {new Date().getFullYear()} - Sistema de Gestión de Incidencias</p>
          <p className="footer-version">Versión 3.1 | API con PATCH para actualizaciones parciales</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

            
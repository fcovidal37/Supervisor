const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Datos de ejemplo (simulando base de datos)
let incidencias = [
  { 
    id_incidencia: 101, 
    caso: "Error en sistema de nómina", 
    estado: 1, 
    id_trabajador: 1, 
    comentario: "trabajador no aparece en nómina",
    fecha_creacion: "2024-03-15T10:30:00Z",
    fecha_actualizacion: "2024-03-15T10:30:00Z"
  },
  { 
    id_incidencia: 102, 
    caso: "Caja errónea asignada en sistema", 
    estado: 2, 
    id_trabajador: 2, 
    comentario: "Caja corregida en sistema",
    fecha_creacion: "2024-03-14T09:15:00Z",
    fecha_actualizacion: "2024-03-16T14:20:00Z"
  },
  { 
    id_incidencia: 103, 
    caso: "No aparece en nómina", 
    estado: 1, 
    id_trabajador: 3, 
    comentario: "",
    fecha_creacion: "2024-03-16T11:45:00Z",
    fecha_actualizacion: "2024-03-16T11:45:00Z"
  },
  { 
    id_incidencia: 104, 
    caso: "Trabajador No aparece en listado", 
    estado: 3, 
    id_trabajador: 4, 
    comentario: "Trabajador no cumple requisitos",
    fecha_creacion: "2024-03-13T08:20:00Z",
    fecha_actualizacion: "2024-03-17T16:30:00Z"
  },
  { 
    id_incidencia: 105, 
    caso: "QR aparece como no válido", 
    estado: 1, 
    id_trabajador: 2, 
    comentario: "",
    fecha_creacion: "2024-03-17T13:10:00Z",
    fecha_actualizacion: "2024-03-17T13:10:00Z"
  },
  { 
    id_incidencia: 106, 
    caso: "QR no aparece como válido", 
    estado: 2, 
    id_trabajador: 1, 
    comentario: "Configuración de VPN corregida exitosamente.",
    fecha_creacion: "2024-03-12T15:40:00Z",
    fecha_actualizacion: "2024-03-15T09:25:00Z"
  }
];

const trabajadores = [
  { id_trabajador: 1, RUT: 12345678, nombres: "Juan", apellido1: "Pérez", apellido2: "Gómez" },
  { id_trabajador: 2, RUT: 23456789, nombres: "Lucía", apellido1: "Martínez", apellido2: "López" },
  { id_trabajador: 3, RUT: 34567890, nombres: "Pedro", apellido1: "Rodríguez", apellido2: "Sánchez" },
  { id_trabajador: 4, RUT: 45678901, nombres: "Sofía", apellido1: "Fernández", apellido2: "Díaz" }
];

const supervisor = {
  id_super: 1,
  nombre: "UserName",
  cargo: "Supervisor de Operaciones",
  email: "user.name@empresa.com"
};

// ==================== ENDPOINTS GET ====================

// 1. Obtener información del supervisor
app.get('/api/supervisor', (req, res) => {
  res.json(supervisor);
});

// 2. Obtener estadísticas del supervisor
app.get('/api/supervisor/estadisticas', (req, res) => {
  const total = incidencias.length;
  const pendientes = incidencias.filter(i => i.estado === 1).length;
  const aprobadas = incidencias.filter(i => i.estado === 2).length;
  const rechazadas = incidencias.filter(i => i.estado === 3).length;
  
  res.json({
    total,
    pendientes,
    aprobadas,
    rechazadas,
    porcentaje_resueltas: total > 0 ? ((aprobadas + rechazadas) / total * 100).toFixed(1) : 0
  });
});

// 3. Obtener todas las incidencias (con filtros opcionales)
app.get('/api/incidencias', (req, res) => {
  const { estado, busqueda, limit = 50, offset = 0 } = req.query;
  
  let resultados = [...incidencias];
  
  // Filtrar por estado si se proporciona
  if (estado && estado !== '0') {
    resultados = resultados.filter(i => i.estado === parseInt(estado));
  }
  
  // Filtrar por búsqueda de texto si se proporciona
  if (busqueda && busqueda.trim() !== '') {
    const termino = busqueda.toLowerCase().trim();
    resultados = resultados.filter(incidencia => {
      // Buscar en caso
      if (incidencia.caso.toLowerCase().includes(termino)) return true;
      
      // Buscar en comentario
      if (incidencia.comentario && incidencia.comentario.toLowerCase().includes(termino)) return true;
      
      // Buscar por ID
      if (incidencia.id_incidencia.toString().includes(termino)) return true;
      
      // Buscar por trabajador asociado
      const trabajador = trabajadores.find(t => t.id_trabajador === incidencia.id_trabajador);
      if (trabajador) {
        if (trabajador.nombres.toLowerCase().includes(termino)) return true;
        if (trabajador.apellido1.toLowerCase().includes(termino)) return true;
        if (trabajador.apellido2.toLowerCase().includes(termino)) return true;
        if (trabajador.RUT.toString().includes(termino)) return true;
      }
      
      return false;
    });
  }
  
  // Ordenar por fecha de actualización (más recientes primero)
  resultados.sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion));
  
  // Paginación
  const inicio = parseInt(offset);
  const fin = inicio + parseInt(limit);
  const paginados = resultados.slice(inicio, fin);
  
  // Enriquecer datos con información del trabajador
  const enriquecidos = paginados.map(incidencia => {
    const trabajador = trabajadores.find(t => t.id_trabajador === incidencia.id_trabajador) || {};
    return {
      ...incidencia,
      trabajador: {
        id_trabajador: trabajador.id_trabajador,
        nombres: trabajador.nombres,
        apellido1: trabajador.apellido1,
        apellido2: trabajador.apellido2,
        RUT: trabajador.RUT
      }
    };
  });
  
  res.json({
    data: enriquecidos,
    total: resultados.length,
    limit: parseInt(limit),
    offset: inicio,
    filtros: {
      estado: estado || 'todos',
      busqueda: busqueda || ''
    }
  });
});

// 4. Obtener una incidencia específica por ID
app.get('/api/incidencias/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const incidencia = incidencias.find(i => i.id_incidencia === id);
  
  if (!incidencia) {
    return res.status(404).json({ 
      error: true,
      mensaje: 'Incidencia no encontrada' 
    });
  }
  
  // Enriquecer con datos del trabajador
  const trabajador = trabajadores.find(t => t.id_trabajador === incidencia.id_trabajador) || {};
  const incidenciaEnriquecida = {
    ...incidencia,
    trabajador: {
      id_trabajador: trabajador.id_trabajador,
      nombres: trabajador.nombres,
      apellido1: trabajador.apellido1,
      apellido2: trabajador.apellido2,
      RUT: trabajador.RUT
    }
  };
  
  res.json(incidenciaEnriquecida);
});

// 5. Obtener historial de cambios de una incidencia
app.get('/api/incidencias/:id/historial', (req, res) => {
  const id = parseInt(req.params.id);
  const incidencia = incidencias.find(i => i.id_incidencia === id);
  
  if (!incidencia) {
    return res.status(404).json({ 
      error: true,
      mensaje: 'Incidencia no encontrada' 
    });
  }
  
  // Simulación de historial
  const historial = [
    {
      id_cambio: 1,
      id_incidencia: id,
      estado_anterior: null,
      estado_nuevo: 1,
      comentario: "Incidencia creada",
      fecha_cambio: incidencia.fecha_creacion,
      tipo_cambio: "creacion"
    }
  ];
  
  // Si hay comentario de resolución, agregar al historial
  if (incidencia.comentario && incidencia.comentario.trim() !== '' && incidencia.estado !== 1) {
    historial.push({
      id_cambio: 2,
      id_incidencia: id,
      estado_anterior: 1,
      estado_nuevo: incidencia.estado,
      comentario: incidencia.comentario,
      fecha_cambio: incidencia.fecha_actualizacion,
      tipo_cambio: "resolucion"
    });
  }
  
  res.json(historial);
});

// 6. Obtener todos los trabajadores
app.get('/api/trabajadores', (req, res) => {
  res.json(trabajadores);
});

// 7. Obtener dashboard con datos consolidados
app.get('/api/dashboard', (req, res) => {
  const ultimasIncidencias = [...incidencias]
    .sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion))
    .slice(0, 5)
    .map(inc => {
      const trabajador = trabajadores.find(t => t.id_trabajador === inc.id_trabajador) || {};
      return {
        ...inc,
        trabajador_nombre: `${trabajador.nombres} ${trabajador.apellido1}`
      };
    });
  
  // Conteo por trabajador
  const conteoPorTrabajador = trabajadores.map(t => {
    const total = incidencias.filter(i => i.id_trabajador === t.id_trabajador).length;
    const pendientes = incidencias.filter(i => i.id_trabajador === t.id_trabajador && i.estado === 1).length;
    
    return {
      id_trabajador: t.id_trabajador,
      nombre: `${t.nombres} ${t.apellido1}`,
      total,
      pendientes,
      resueltas: total - pendientes
    };
  }).filter(t => t.total > 0)
    .sort((a, b) => b.total - a.total);
  
  // Estadísticas por estado
  const tendencias = {
    ultimos_7_dias: [2, 3, 1, 4, 2, 3, 2],
    por_estado: {
      pendientes: incidencias.filter(i => i.estado === 1).length,
      aprobadas: incidencias.filter(i => i.estado === 2).length,
      rechazadas: incidencias.filter(i => i.estado === 3).length
    }
  };
  
  res.json({
    estadisticas: {
      total: incidencias.length,
      pendientes: incidencias.filter(i => i.estado === 1).length,
      aprobadas: incidencias.filter(i => i.estado === 2).length,
      rechazadas: incidencias.filter(i => i.estado === 3).length
    },
    ultimas_incidencias: ultimasIncidencias,
    trabajadores_con_mas_incidencias: conteoPorTrabajador.slice(0, 3),
    tendencias
  });
});

// 8. Buscar incidencias por texto
app.get('/api/buscar', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.status(400).json({ 
      error: true,
      mensaje: 'Término de búsqueda requerido' 
    });
  }
  
  const termino = q.toLowerCase().trim();
  const resultados = incidencias.filter(incidencia => {
    if (incidencia.caso.toLowerCase().includes(termino)) return true;
    if (incidencia.comentario && incidencia.comentario.toLowerCase().includes(termino)) return true;
    if (incidencia.id_incidencia.toString().includes(termino)) return true;
    return false;
  });
  
  const enriquecidos = resultados.map(incidencia => {
    const trabajador = trabajadores.find(t => t.id_trabajador === incidencia.id_trabajador) || {};
    return {
      ...incidencia,
      trabajador: {
        id_trabajador: trabajador.id_trabajador,
        nombres: trabajador.nombres,
        apellido1: trabajador.apellido1,
        RUT: trabajador.RUT
      }
    };
  });
  
  res.json({
    query: q,
    resultados: enriquecidos.length,
    data: enriquecidos
  });
});

// ==================== ENDPOINTS PATCH ====================

// 1. Actualizar parcialmente una incidencia (estado y/o comentario)
app.patch('/api/incidencias/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { estado, comentario } = req.body;
  
  // Validar que la incidencia existe
  const index = incidencias.findIndex(i => i.id_incidencia === id);
  if (index === -1) {
    return res.status(404).json({ 
      error: true,
      mensaje: 'Incidencia no encontrada' 
    });
  }
  
  // Validaciones específicas para PATCH
  const cambios = {};
  const errores = [];
  
  // Si se envía estado, validarlo
  if (estado !== undefined) {
    if (![1, 2, 3].includes(estado)) {
      errores.push('Estado inválido. Debe ser 1 (pendiente), 2 (aprobado) o 3 (rechazado)');
    } else {
      cambios.estado = estado;
      
      // Validar comentario para estados de resolución (2 o 3)
      if ((estado === 2 || estado === 3) && 
          (!comentario || comentario.trim().length === 0)) {
        errores.push('Comentario requerido para aprobar o rechazar una incidencia');
      }
    }
  }
  
  // Si se envía comentario, validarlo
  if (comentario !== undefined) {
    if (comentario.length > 200) {
      errores.push('El comentario no puede exceder los 200 caracteres');
    } else {
      cambios.comentario = comentario;
    }
  }
  
  // Si no hay cambios válidos
  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ 
      error: true,
      mensaje: 'No se proporcionaron campos válidos para actualizar' 
    });
  }
  
  // Si hay errores de validación
  if (errores.length > 0) {
    return res.status(400).json({ 
      error: true,
      mensaje: 'Errores de validación',
      detalles: errores
    });
  }
  
  // Guardar estado anterior para historial
  const estadoAnterior = incidencias[index].estado;
  
  // Aplicar cambios PARCIALES (solo los campos enviados)
  incidencias[index] = {
    ...incidencias[index],          // Mantener campos existentes
    ...cambios,                     // Aplicar solo campos nuevos
    fecha_actualizacion: new Date().toISOString()  // Siempre actualizar fecha
  };
  
  // Enriquecer respuesta con datos del trabajador
  const trabajador = trabajadores.find(t => t.id_trabajador === incidencias[index].id_trabajador) || {};
  const incidenciaActualizada = {
    ...incidencias[index],
    trabajador: {
      id_trabajador: trabajador.id_trabajador,
      nombres: trabajador.nombres,
      apellido1: trabajador.apellido1,
      apellido2: trabajador.apellido2,
      RUT: trabajador.RUT
    }
  };
  
  res.json({
    success: true,
    mensaje: 'Incidencia actualizada parcialmente',
    data: incidenciaActualizada,
    cambios_aplicados: cambios,
    historial: {
      estado_anterior: estadoAnterior,
      estado_nuevo: cambios.estado || estadoAnterior,
      requiere_comentario: (cambios.estado === 2 || cambios.estado === 3)
    }
  });
});

// 2. Actualizar solo el comentario (endpoint específico PATCH)
app.patch('/api/incidencias/:id/comentario', (req, res) => {
  const id = parseInt(req.params.id);
  const { comentario } = req.body;
  
  // Validar que la incidencia existe
  const index = incidencias.findIndex(i => i.id_incidencia === id);
  if (index === -1) {
    return res.status(404).json({ 
      error: true,
      mensaje: 'Incidencia no encontrada' 
    });
  }
  
  // Validar comentario
  if (!comentario || comentario.trim().length === 0) {
    return res.status(400).json({ 
      error: true,
      mensaje: 'Comentario requerido' 
    });
  }
  
  if (comentario.length > 200) {
    return res.status(400).json({ 
      error: true,
      mensaje: 'El comentario no puede exceder los 200 caracteres' 
    });
  }
  
  // Aplicar cambio PARCIAL (solo comentario)
  incidencias[index] = {
    ...incidencias[index],
    comentario,
    fecha_actualizacion: new Date().toISOString()
  };
  
  res.json({
    success: true,
    mensaje: 'Comentario actualizado correctamente',
    data: incidencias[index],
    cambios_aplicados: { comentario: true }
  });
});

// 3. Reabrir una incidencia (PATCH más semántico)
app.patch('/api/incidencias/:id/reabrir', (req, res) => {
  const id = parseInt(req.params.id);
  
  // Validar que la incidencia existe
  const index = incidencias.findIndex(i => i.id_incidencia === id);
  if (index === -1) {
    return res.status(404).json({ 
      error: true,
      mensaje: 'Incidencia no encontrada' 
    });
  }
  
  // Validar que la incidencia esté resuelta (estado 2 o 3)
  if (incidencias[index].estado === 1) {
    return res.status(400).json({ 
      error: true,
      mensaje: 'La incidencia ya está pendiente' 
    });
  }
  
  // Guardar estado anterior
  const estadoAnterior = incidencias[index].estado;
  
  // Cambiar a estado pendiente (1) - Actualización parcial
  incidencias[index] = {
    ...incidencias[index],
    estado: 1,
    fecha_actualizacion: new Date().toISOString()
  };
  
  res.json({
    success: true,
    mensaje: 'Incidencia reabierta correctamente',
    data: incidencias[index],
    cambios_aplicados: { estado: 1 },
    historial: {
      estado_anterior: estadoAnterior,
      estado_nuevo: 1
    }
  });
});

// ==================== MIDDLEWARE DE ERRORES ====================

// Endpoint no encontrado
app.use((req, res, next) => {
  res.status(404).json({ 
    error: true,
    mensaje: 'Endpoint no encontrado',
    metodo: req.method,
    ruta: req.originalUrl
  });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.stack);
  res.status(500).json({ 
    error: true,
    mensaje: 'Error interno del servidor',
    detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
  console.log('📌 Endpoints disponibles:');
  console.log(`   GET    http://localhost:${PORT}/api/supervisor`);
  console.log(`   GET    http://localhost:${PORT}/api/incidencias`);
  console.log(`   GET    http://localhost:${PORT}/api/incidencias/:id`);
  console.log(`   PATCH  http://localhost:${PORT}/api/incidencias/:id`);
  console.log(`   PATCH  http://localhost:${PORT}/api/incidencias/:id/comentario`);
  console.log(`   PATCH  http://localhost:${PORT}/api/incidencias/:id/reabrir`);
  console.log(`   GET    http://localhost:${PORT}/api/dashboard`);
  console.log(`   GET    http://localhost:${PORT}/api/buscar?q=texto`);
});

module.exports = app;

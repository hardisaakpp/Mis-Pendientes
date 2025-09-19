// --- FUNCIONES DE DATOS ---
async function getTasks() {
  return window.apiGet('/tasks');
}

async function saveTask(task) {
  if (task.id) {
    return window.apiPut(`/tasks/${task.id}`, task);
  } else {
    return window.apiPost('/tasks', task);
  }
}

async function deleteTask(id) {
  return window.apiDelete(`/tasks/${id}`);
}

// --- FUNCIONES DE PAPELERA DE RECICLAJE ---
async function getDeletedTasks() {
  return window.apiGet('/deleted-tasks');
}

async function restoreTask(id) {
  return window.apiPost('/deleted-tasks/restore', { taskId: id });
}

async function permanentlyDeleteTask(id) {
  return window.apiDelete(`/deleted-tasks/${id}`);
}

async function deleteAllDeletedTasks() {
  console.log('=== INICIO deleteAllDeletedTasks en servicio ===');
  try {
    console.log('Llamando a window.apiDelete con /deleted-tasks/empty');
    const result = await window.apiDelete('/deleted-tasks/empty');
    console.log('Resultado de apiDelete:', result);
    console.log('=== FIN deleteAllDeletedTasks en servicio - ÉXITO ===');
    return result;
  } catch (error) {
    console.error('=== ERROR en deleteAllDeletedTasks en servicio ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Exportar funciones para uso global (mantener compatibilidad)
window.getTasks = getTasks;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.getDeletedTasks = getDeletedTasks;
window.restoreTask = restoreTask;
window.permanentlyDeleteTask = permanentlyDeleteTask;
window.deleteAllDeletedTasks = deleteAllDeletedTasks;

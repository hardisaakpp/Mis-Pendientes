// --- CONFIGURACIÓN API ---
const API_URL = 'http://localhost:3001';

// --- FUNCIONES API ---
async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiPost(path, data) {
  const res = await fetch(`${API_URL}${path}` , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiPut(path, data) {
  const res = await fetch(`${API_URL}${path}` , {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiDelete(path) {
  const res = await fetch(`${API_URL}${path}` , { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- FUNCIONES DE DATOS ---
async function getTasks() {
  return apiGet('/tasks');
}
async function saveTask(task) {
  if (task.id) {
    return apiPut(`/tasks/${task.id}`, task);
  } else {
    return apiPost('/tasks', task);
  }
}
async function deleteTask(id) {
  return apiDelete(`/tasks/${id}`);
}

// --- FUNCIONES DE PAPELERA DE RECICLAJE ---
async function getDeletedTasks() {
  return apiGet('/tasks/deleted');
}

async function restoreTask(id) {
  return apiPost(`/tasks/${id}/restore`, {});
}

async function permanentlyDeleteTask(id) {
  return apiDelete(`/tasks/${id}/permanent`);
}

async function getCategories() {
  return apiGet('/categories');
}
async function saveCategory(name) {
  return apiPost('/categories', { name });
}
async function deleteCategory(id) {
  return apiDelete(`/categories/${id}`);
}

// --- RENDERIZADO Y EVENTOS ASÍNCRONOS ---
let currentFilter = 'todas';
let categoriesCache = [];

async function renderCategories() {
  categoriesCache = await getCategories();
  const select = document.getElementById('category-select');
  const filtersDiv = document.querySelector('.filters');
  // Leer orden personalizado de localStorage
  let order = JSON.parse(localStorage.getItem('filtersOrder') || 'null');
  // Limpiar
  select.innerHTML = '';
  filtersDiv.innerHTML = '';
  // Construir lista de categorías para filtros
  let filterButtons = [{ id: 'todas', name: 'Todas' }, ...categoriesCache.map(cat => ({ id: cat.id, name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1) }))];
  // Reordenar si hay orden guardado
  if (order) {
    filterButtons = order.map(id => filterButtons.find(btn => String(btn.id) === String(id))).filter(Boolean);
    // Agregar los que falten (nuevas categorías)
    filterButtons = filterButtons.concat([{ id: 'todas', name: 'Todas' }, ...categoriesCache.map(cat => ({ id: cat.id, name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1) }))].filter(btn => !filterButtons.some(b => String(b.id) === String(btn.id))));
  }
  filterButtons.forEach(btnData => {
    // Al select
    if (btnData.id !== 'todas') {
      const option = document.createElement('option');
      option.value = btnData.id;
      option.textContent = btnData.name;
      select.appendChild(option);
    }
    // Botón de filtro
    const btn = document.createElement('button');
    btn.dataset.filter = btnData.id;
    btn.textContent = btnData.name;
    btn.className = (currentFilter == btnData.id) ? 'active' : '';
    btn.draggable = true;
    btn.addEventListener('click', () => setActiveFilter(btnData.id));
    // Drag & Drop events
    btn.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', btnData.id);
      btn.classList.add('dragging');
    });
    btn.addEventListener('dragend', e => {
      btn.classList.remove('dragging');
    });
    btn.addEventListener('dragover', e => {
      e.preventDefault();
      btn.classList.add('drag-over');
    });
    btn.addEventListener('dragleave', e => {
      btn.classList.remove('drag-over');
    });
    btn.addEventListener('drop', e => {
      e.preventDefault();
      btn.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId === btnData.id) return;
      // Reordenar
      const idxFrom = filterButtons.findIndex(b => String(b.id) === String(draggedId));
      const idxTo = filterButtons.findIndex(b => String(b.id) === String(btnData.id));
      if (idxFrom === -1 || idxTo === -1) return;
      const moved = filterButtons.splice(idxFrom, 1)[0];
      filterButtons.splice(idxTo, 0, moved);
      // Guardar nuevo orden
      localStorage.setItem('filtersOrder', JSON.stringify(filterButtons.map(b => b.id)));
      renderCategories();
    });
    filtersDiv.appendChild(btn);
  });
}

function setActiveFilter(filter) {
  currentFilter = filter;
  renderCategories();
  renderTasks(currentFilter);
  // Solo actualizar papelera si está abierta
  if (isTrashWindowOpen) {
    renderTrashTasks();
  }
}

async function renderTasks(filter = 'todas') {
  const tasks = await getTasks();
  const list = document.getElementById('task-list');
  const inProgressList = document.getElementById('in-progress-task-list');
  const completedList = document.getElementById('completed-task-list');
  const pendingToggle = document.querySelector('.accordion-toggle[data-target="task-list"]');
  const inProgressToggle = document.querySelector('.accordion-toggle[data-target="in-progress-task-list"]');
  const completedToggle = document.querySelector('.accordion-toggle[data-target="completed-task-list"]');

  // Limpiar listas
  list.innerHTML = '';
  inProgressList.innerHTML = '';
  completedList.innerHTML = '';

  // Helper para filtrar por categoría
  function matchFilter(task) {
    if (filter === 'todas') return true;
    return (task.categories || []).some(cat => String(cat.id) === String(filter));
  }

  // Tareas pendientes
  const pendingTasks = tasks.filter(task => matchFilter(task) && !task.completed && !task.inProgress);
  if (pendingTasks.length === 0) {
    list.innerHTML = '<div class="empty-message">No hay tareas en esta sección</div>';
    pendingToggle.classList.add('disabled');
    pendingToggle.setAttribute('disabled', 'disabled');
  } else {
    pendingTasks.forEach(task => list.appendChild(createTaskElement(task, 'pending')));
    pendingToggle.classList.remove('disabled');
    pendingToggle.removeAttribute('disabled');
  }

  // Tareas en progreso
  const inProgressTasks = tasks.filter(task => matchFilter(task) && task.inProgress && !task.completed);
  if (inProgressTasks.length === 0) {
    inProgressList.innerHTML = '<div class="empty-message">No hay tareas en esta sección</div>';
    inProgressToggle.classList.add('disabled');
    inProgressToggle.setAttribute('disabled', 'disabled');
  } else {
    inProgressTasks.forEach(task => inProgressList.appendChild(createTaskElement(task, 'inProgress')));
    inProgressToggle.classList.remove('disabled');
    inProgressToggle.removeAttribute('disabled');
  }

  // Tareas completadas
  const completedTasks = tasks.filter(task => matchFilter(task) && task.completed);
  if (completedTasks.length === 0) {
    completedList.innerHTML = '<div class="empty-message">No hay tareas en esta sección</div>';
    completedToggle.classList.add('disabled');
    completedToggle.setAttribute('disabled', 'disabled');
  } else {
    completedTasks.forEach(task => completedList.appendChild(createTaskElement(task, 'completed')));
    completedToggle.classList.remove('disabled');
    completedToggle.removeAttribute('disabled');
  }
}

async function renderTrashTasks() {
  const deletedTasks = await getDeletedTasks();
  const trashList = document.getElementById('trash-task-list');

  // Limpiar lista
  trashList.innerHTML = '';

  if (deletedTasks.length === 0) {
    trashList.innerHTML = '<div class="empty-message">No hay tareas eliminadas</div>';
  } else {
    deletedTasks.forEach(task => trashList.appendChild(createTrashTaskElement(task)));
  }
  
  // Actualizar indicador del icono
  updateTrashIconIndicator(deletedTasks.length);
}

function updateTrashIconIndicator(count) {
  const trashIcon = document.getElementById('trash-icon');
  
  if (count > 0) {
    trashIcon.setAttribute('data-count', count);
    trashIcon.classList.add('has-items');
  } else {
    trashIcon.removeAttribute('data-count');
    trashIcon.classList.remove('has-items');
  }
}

// --- FUNCIONES PARA VENTANA EMERGENTE DE PAPELERA ---
let isTrashWindowOpen = false;
let isTrashWindowMaximized = false;
let isTrashWindowMinimized = false;

function openTrashWindow() {
  const trashWindow = document.getElementById('trash-window');
  const trashIcon = document.getElementById('trash-icon');
  
  // Mostrar la ventana primero para poder calcular su tamaño
  trashWindow.style.display = 'flex';
  
  // Centrar la ventana al abrir usando el centro de la pantalla
  const centerX = (window.innerWidth - 400) / 2;
  const centerY = (window.innerHeight - 300) / 2;
  trashWindow.style.transform = `translate(${centerX}px, ${centerY}px)`;
  
  isTrashWindowOpen = true;
  trashIcon.style.display = 'none';
  
  // Renderizar tareas eliminadas
  renderTrashTasks();
  
  // Hacer la ventana arrastrable
  makeWindowDraggable();
}

function closeTrashWindow() {
  const trashWindow = document.getElementById('trash-window');
  const trashIcon = document.getElementById('trash-icon');
  
  trashWindow.style.display = 'none';
  isTrashWindowOpen = false;
  trashIcon.style.display = 'flex';
  
  // Resetear estados
  isTrashWindowMaximized = false;
  isTrashWindowMinimized = false;
  trashWindow.classList.remove('maximized', 'minimized');
}

function maximizeTrashWindow() {
  const trashWindow = document.getElementById('trash-window');
  
  if (isTrashWindowMaximized) {
    trashWindow.classList.remove('maximized');
    isTrashWindowMaximized = false;
    // Restaurar posición centrada
    const centerX = (window.innerWidth - 400) / 2;
    const centerY = (window.innerHeight - 300) / 2;
    trashWindow.style.transform = `translate(${centerX}px, ${centerY}px)`;
  } else {
    trashWindow.classList.add('maximized');
    isTrashWindowMaximized = true;
    // Centrar la ventana maximizada
    const centerX = (window.innerWidth - 90) / 2; // 90vw centrado
    const centerY = (window.innerHeight - 90) / 2; // 90vh centrado
    trashWindow.style.transform = `translate(${centerX}px, ${centerY}px)`;
  }
  
  isTrashWindowMinimized = false;
  trashWindow.classList.remove('minimized');
}

function minimizeTrashWindow() {
  const trashWindow = document.getElementById('trash-window');
  
  if (isTrashWindowMinimized) {
    trashWindow.classList.remove('minimized');
    isTrashWindowMinimized = false;
  } else {
    trashWindow.classList.add('minimized');
    isTrashWindowMinimized = true;
  }
  
  isTrashWindowMaximized = false;
  trashWindow.classList.remove('maximized');
}

function makeWindowDraggable() {
  const trashWindow = document.getElementById('trash-window');
  const header = trashWindow.querySelector('.trash-window-header');
  
  let isDragging = false;
  let startX;
  let startY;
  let initialTransformX = 0;
  let initialTransformY = 0;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    // Solo permitir arrastre desde el header y no desde los botones
    if (e.target.closest('.window-control-btn')) {
      return;
    }
    
    // Obtener la posición actual de la ventana
    const transform = trashWindow.style.transform;
    let currentX = 0;
    let currentY = 0;
    
    if (transform && transform !== 'none') {
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        currentX = parseInt(match[1]);
        currentY = parseInt(match[2]);
      }
    }
    
    // Si la ventana está centrada, usar la posición real del elemento
    if (transform && transform.includes('-50%')) {
      const rect = trashWindow.getBoundingClientRect();
      currentX = rect.left;
      currentY = rect.top;
    }
    
    initialTransformX = currentX;
    initialTransformY = currentY;
    
    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;
    e.preventDefault();
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newX = initialTransformX + deltaX;
      const newY = initialTransformY + deltaY;
      
      // Limitar la ventana dentro de los límites de la pantalla
      const rect = trashWindow.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let finalX = newX;
      let finalY = newY;
      
      // Limitar horizontalmente
      if (newX < -rect.width / 2) {
        finalX = -rect.width / 2;
      } else if (newX > windowWidth - rect.width / 2) {
        finalX = windowWidth - rect.width / 2;
      }
      
      // Limitar verticalmente
      if (newY < -rect.height / 2) {
        finalY = -rect.height / 2;
      } else if (newY > windowHeight - rect.height / 2) {
        finalY = windowHeight - rect.height / 2;
      }
      
      setTranslate(finalX, finalY, trashWindow);
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }

  function dragEnd() {
    isDragging = false;
  }
}

// --- EVENTOS PARA LA VENTANA EMERGENTE ---
document.addEventListener('DOMContentLoaded', () => {
  const trashIcon = document.getElementById('trash-icon');
  const closeBtn = document.getElementById('close-trash');
  const minimizeBtn = document.getElementById('minimize-trash');
  const maximizeBtn = document.getElementById('maximize-trash');
  
  // Abrir ventana al hacer clic en el icono
  trashIcon.addEventListener('click', openTrashWindow);
  
  // Controles de la ventana
  closeBtn.addEventListener('click', closeTrashWindow);
  minimizeBtn.addEventListener('click', minimizeTrashWindow);
  maximizeBtn.addEventListener('click', maximizeTrashWindow);
  
  // Cerrar ventana con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isTrashWindowOpen) {
      closeTrashWindow();
    }
  });
  
  // Cerrar ventana al hacer clic fuera de ella
  document.addEventListener('click', (e) => {
    const trashWindow = document.getElementById('trash-window');
    const trashIcon = document.getElementById('trash-icon');
    
    if (isTrashWindowOpen && 
        !trashWindow.contains(e.target) && 
        !trashIcon.contains(e.target)) {
      closeTrashWindow();
    }
  });
});

function createTaskElement(task, section) {
      const li = document.createElement('li');
  li.className = 'task-item' + (section === 'inProgress' ? ' in-progress' : section === 'completed' ? ' completed' : '');
      const info = document.createElement('div');
      info.className = 'task-info';
      const span = document.createElement('span');
      span.textContent = task.text;
  // Categorías
      const cat = document.createElement('span');
      cat.className = 'task-category';
  let cats = Array.isArray(task.categories) ? task.categories : [];
  cat.textContent = cats.map(c => c.name.charAt(0).toUpperCase() + c.name.slice(1)).join(', ');
  cat.style.cursor = 'pointer';
  cat.title = 'Haz clic para cambiar categoría(s)';
  cat.addEventListener('click', async () => {
    await renderCategories(); // refresca cache
    const select = document.createElement('select');
    select.multiple = true;
    select.className = 'edit-multiselect';
    categoriesCache.forEach(catOpt => {
      const option = document.createElement('option');
      option.value = catOpt.id;
      option.textContent = catOpt.name.charAt(0).toUpperCase() + catOpt.name.slice(1);
      if (cats.some(c => c.id === catOpt.id)) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      const selected = Array.from(select.selectedOptions).map(opt => Number(opt.value));
      // Si la selección es igual a la actual, cancelar edición
      const prevIds = cats.map(c => c.id).sort().join(',');
      const selIds = selected.slice().sort().join(',');
      if (prevIds === selIds) {
        cleanup();
        renderTasks(currentFilter);
        return;
      }
      await saveTask({ ...task, categories: selected });
      await renderTasks(currentFilter);
    });
    // Cancelar con Escape o clic fuera
    const handleCancel = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        cleanup();
        renderTasks(currentFilter);
      } else if (event.type === 'mousedown' && !info.contains(event.target)) {
        cleanup();
        renderTasks(currentFilter);
      }
    };
    function cleanup() {
      document.removeEventListener('keydown', handleCancel);
      document.removeEventListener('mousedown', handleCancel);
    }
    setTimeout(() => {
      document.addEventListener('keydown', handleCancel);
      document.addEventListener('mousedown', handleCancel);
    }, 0);
    info.replaceChild(select, cat);
    select.focus();
  });
      info.appendChild(span);
      info.appendChild(cat);
  // Botones de acción
  if (section === 'pending') {
      const inProgressBtn = document.createElement('button');
      inProgressBtn.className = 'in-progress-btn';
      inProgressBtn.innerHTML = '⏳';
      inProgressBtn.title = 'Marcar como en progreso';
    inProgressBtn.addEventListener('click', async () => {
      await saveTask({ ...task, inProgress: 1, categories: getCategoryIds(task) });
      await renderTasks(currentFilter);
      });
      info.appendChild(inProgressBtn);
  }
  if (section === 'inProgress') {
      const completeBtn = document.createElement('button');
      completeBtn.className = 'complete-btn';
      completeBtn.innerHTML = '✅';
      completeBtn.title = 'Marcar como completada';
    completeBtn.addEventListener('click', async () => {
      await saveTask({ ...task, completed: 1, inProgress: 0, categories: getCategoryIds(task) });
      await renderTasks(currentFilter);
      });
      info.appendChild(completeBtn);
      const toPendingBtn = document.createElement('button');
      toPendingBtn.className = 'to-pending-btn';
      toPendingBtn.innerHTML = '↩️';
      toPendingBtn.title = 'Regresar a pendiente';
    toPendingBtn.addEventListener('click', async () => {
      await saveTask({ ...task, inProgress: 0, categories: getCategoryIds(task) });
      await renderTasks(currentFilter);
      });
      info.appendChild(toPendingBtn);
  }
  if (section === 'completed') {
      const toInProgressBtn = document.createElement('button');
      toInProgressBtn.className = 'to-in-progress-btn';
      toInProgressBtn.innerHTML = '↩️';
      toInProgressBtn.title = 'Regresar a en progreso';
    toInProgressBtn.addEventListener('click', async () => {
      await saveTask({ ...task, completed: 0, inProgress: 1, categories: getCategoryIds(task) });
      await renderTasks(currentFilter);
      });
      info.appendChild(toInProgressBtn);
  }
  // Editar texto
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerHTML = '✏️';
      editBtn.title = 'Editar';
      editBtn.addEventListener('click', () => {
        const inputEdit = document.createElement('input');
        inputEdit.type = 'text';
        inputEdit.value = task.text;
        inputEdit.className = 'edit-input';
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '💾';
        saveBtn.title = 'Guardar';
        saveBtn.className = 'save-btn';
        const saveAction = async () => {
          const newText = inputEdit.value.trim();
          if (newText) {
            await saveTask({ ...task, text: newText, categories: getCategoryIds(task) });
            await renderTasks(currentFilter);
          } else {
            // Si no hay texto, solo re-renderizar
            await renderTasks(currentFilter);
          }
        };
        saveBtn.addEventListener('click', saveAction);
        inputEdit.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveAction();
          }
          if (e.key === 'Escape') {
            renderTasks(currentFilter);
          }
        });
        // Cancelar si se hace clic fuera del input o botón
        const handleClickOutside = (event) => {
          if (!info.contains(event.target)) {
            document.removeEventListener('mousedown', handleClickOutside);
            renderTasks(currentFilter);
          }
        };
        setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        info.innerHTML = '';
        info.appendChild(inputEdit);
        info.appendChild(saveBtn);
        inputEdit.focus();
      });
      info.appendChild(editBtn);
  // Eliminar
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.innerHTML = '🗑️';
      del.title = 'Eliminar';
  del.addEventListener('click', async () => {
    await deleteTask(task.id);
    await renderTasks(currentFilter);
    // Actualizar indicador del icono
    await checkTrashStatus();
    // Solo actualizar papelera si está abierta
    if (isTrashWindowOpen) {
      await renderTrashTasks();
    }
      });
      li.appendChild(info);
      li.appendChild(del);
  return li;
}

function createTrashTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item trash';
  const info = document.createElement('div');
  info.className = 'task-info';
  const span = document.createElement('span');
  span.textContent = task.text;
  // Categorías
  const cat = document.createElement('span');
  cat.className = 'task-category';
  let cats = Array.isArray(task.categories) ? task.categories : [];
  cat.textContent = cats.map(c => c.name.charAt(0).toUpperCase() + c.name.slice(1)).join(', ');
  cat.style.cursor = 'pointer';
  cat.title = 'Haz clic para cambiar categoría(s)';
  cat.addEventListener('click', async () => {
    await renderCategories(); // refresca cache
    const select = document.createElement('select');
    select.multiple = true;
    select.className = 'edit-multiselect';
    categoriesCache.forEach(catOpt => {
      const option = document.createElement('option');
      option.value = catOpt.id;
      option.textContent = catOpt.name.charAt(0).toUpperCase() + catOpt.name.slice(1);
      if (cats.some(c => c.id === catOpt.id)) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      const selected = Array.from(select.selectedOptions).map(opt => Number(opt.value));
      // Si la selección es igual a la actual, cancelar edición
      const prevIds = cats.map(c => c.id).sort().join(',');
      const selIds = selected.slice().sort().join(',');
      if (prevIds === selIds) {
        cleanup();
        renderTrashTasks();
        return;
      }
      await saveTask({ ...task, categories: selected });
      await renderTrashTasks();
      await renderTasks(currentFilter); // Actualizar también la lista principal
    });
    // Cancelar con Escape o clic fuera
    const handleCancel = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        cleanup();
        renderTrashTasks();
      } else if (event.type === 'mousedown' && !info.contains(event.target)) {
        cleanup();
        renderTrashTasks();
      }
    };
    function cleanup() {
      document.removeEventListener('keydown', handleCancel);
      document.removeEventListener('mousedown', handleCancel);
    }
    setTimeout(() => {
      document.addEventListener('keydown', handleCancel);
      document.addEventListener('mousedown', handleCancel);
    }, 0);
    info.replaceChild(select, cat);
    select.focus();
  });
  info.appendChild(span);
  info.appendChild(cat);
  // Botones de acción
  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'restore-btn';
  restoreBtn.innerHTML = '↩️';
  restoreBtn.title = 'Restaurar tarea';
  restoreBtn.addEventListener('click', async () => {
    await restoreTask(task.id);
    await renderTrashTasks();
    await renderTasks(currentFilter); // Actualizar la lista principal
    await checkTrashStatus(); // Actualizar indicador del icono
  });
  info.appendChild(restoreBtn);
  const permanentDeleteBtn = document.createElement('button');
  permanentDeleteBtn.className = 'delete-btn'; // Usar la clase delete-btn para el botón de eliminar permanente
  permanentDeleteBtn.innerHTML = '🗑️';
  permanentDeleteBtn.title = 'Eliminar permanentemente';
  permanentDeleteBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmModal(`¿Seguro que deseas eliminar permanentemente la tarea "${task.text}"?`);
    if (confirmed) {
      await permanentlyDeleteTask(task.id);
      await renderTrashTasks();
      await renderTasks(currentFilter); // Actualizar la lista principal
      await checkTrashStatus(); // Actualizar indicador del icono
    }
  });
  info.appendChild(permanentDeleteBtn);
  li.appendChild(info);
  return li;
}

function getCategoryIds(task) {
  // Si categories es un array de objetos, devolver sus IDs; si ya es array de IDs, devolver tal cual
  if (!Array.isArray(task.categories)) return [];
  if (typeof task.categories[0] === 'object' && task.categories[0] !== null) {
    return task.categories.map(c => c.id);
  }
  return task.categories;
}

// Manejar formulario
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const category = document.getElementById('category-select');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  // Obtener categorías seleccionadas (puede ser multiselect en el futuro)
  const selectedCatId = category.value;
  await saveTask({ text, completed: 0, inProgress: 0, categories: [Number(selectedCatId)] });
  input.value = '';
  await renderTasks(currentFilter);
  // Solo actualizar papelera si está abierta
  if (isTrashWindowOpen) {
    await renderTrashTasks();
  }
});

// --- MODIFICADO: Lógica para crear nuevas categorías y permitir Enter ---
const categoryInput = document.getElementById('category-name-input');
const addCategoryBtn = document.getElementById('add-category-btn');
async function addCategory() {
  const categoryName = categoryInput.value.trim();
  if (categoryName) {
    // Evitar duplicados (case-insensitive)
    if (!categoriesCache.map(c => c.name.toLowerCase()).includes(categoryName.toLowerCase())) {
      await saveCategory(categoryName);
      await renderCategories();
    }
    categoryInput.value = '';
  }
}
addCategoryBtn.addEventListener('click', addCategory);
categoryInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCategory();
  }
});

// --- ADMINISTRAR CATEGORÍAS ---
const manageBtn = document.getElementById('manage-categories-btn');
const categoryList = document.getElementById('category-list');
manageBtn.addEventListener('click', () => {
  if (categoryList.style.display === 'none') {
    renderCategoryList();
    categoryList.style.display = 'block';
  } else {
    categoryList.style.display = 'none';
  }
});

function renderCategoryList() {
  categoryList.innerHTML = '';
  categoriesCache.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
    // Botón Editar
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.className = 'edit-btn';
    editBtn.style.marginLeft = '10px';
    editBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = cat.name;
      input.style.marginLeft = '10px';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Guardar';
      saveBtn.style.marginLeft = '5px';
      const saveAction = async () => {
        const newName = input.value.trim();
        if (newName && newName !== cat.name) {
          try {
            await saveCategoryEdit(cat.id, newName);
            await renderCategories();
            renderCategoryList();
            await renderTasks(currentFilter);
          } catch (err) {
            alert('Error al editar la categoría: ' + (err.message || err));
            renderCategoryList();
          }
        } else {
          // Si no cambia el nombre, solo re-renderizar la lista
          renderCategoryList();
        }
      };
      saveBtn.addEventListener('click', saveAction);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveAction();
        }
        if (e.key === 'Escape') {
          renderCategoryList();
        }
      });
      // Cancelar si se hace clic fuera del input o botón
      const handleClickOutside = (event) => {
        if (!li.contains(event.target)) {
          document.removeEventListener('mousedown', handleClickOutside);
          renderCategoryList();
        }
      };
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      li.innerHTML = '';
      li.appendChild(input);
      li.appendChild(saveBtn);
      input.focus();
    });
    li.appendChild(editBtn);
    // Botón Eliminar
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.className = 'delete-btn';
    delBtn.style.marginLeft = '10px';
    delBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal(`¿Seguro que deseas eliminar la categoría "${cat.name}"?`);
      if (confirmed) {
        await deleteCategory(cat.id);
        await renderCategories();
        renderCategoryList();
        await renderTasks(currentFilter);
      }
    });
    li.appendChild(delBtn);
    categoryList.appendChild(li);
  });
}

// Agregar función para editar categoría
async function saveCategoryEdit(id, name) {
  const res = await apiPut(`/categories/${id}`, { name });
  if (res && res.error) throw new Error(res.error);
}

// --- MODAL DE CONFIRMACIÓN ---
function showConfirmModal(message) {
  return new Promise((resolve) => {
    // Crear fondo
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.25)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;
    // Crear ventana
    const modal = document.createElement('div');
    modal.style.background = '#fff';
    modal.style.padding = '2rem 1.5rem 1.5rem 1.5rem';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 4px 24px rgba(25, 118, 210, 0.18)';
    modal.style.textAlign = 'center';
    modal.style.minWidth = '260px';
    // Mensaje
    const msg = document.createElement('div');
    msg.textContent = message;
    msg.style.marginBottom = '1.2rem';
    msg.style.fontSize = '1.08rem';
    // Botones
    const btnYes = document.createElement('button');
    btnYes.textContent = 'Sí';
    btnYes.style.background = 'linear-gradient(90deg, #1976d2 60%, #42a5f5 100%)';
    btnYes.style.color = '#fff';
    btnYes.style.border = 'none';
    btnYes.style.borderRadius = '7px';
    btnYes.style.padding = '0.5rem 1.2rem';
    btnYes.style.fontSize = '1rem';
    btnYes.style.fontWeight = '500';
    btnYes.style.margin = '0 0.7rem 0 0';
    btnYes.style.cursor = 'pointer';
    const btnNo = document.createElement('button');
    btnNo.textContent = 'No';
    btnNo.style.background = '#e3f2fd';
    btnNo.style.color = '#1976d2';
    btnNo.style.border = 'none';
    btnNo.style.borderRadius = '7px';
    btnNo.style.padding = '0.5rem 1.2rem';
    btnNo.style.fontSize = '1rem';
    btnNo.style.fontWeight = '500';
    btnNo.style.cursor = 'pointer';
    // Eventos
    btnYes.onclick = () => { document.body.removeChild(overlay); resolve(true); };
    btnNo.onclick = () => { document.body.removeChild(overlay); resolve(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(false); } };
    // Ensamblar
    modal.appendChild(msg);
    modal.appendChild(btnYes);
    modal.appendChild(btnNo);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    btnNo.focus();
  });
}

// --- Acordeón para secciones de tareas ---
document.addEventListener('DOMContentLoaded', () => {
  const toggles = document.querySelectorAll('.accordion-toggle');
  toggles.forEach(toggle => {
    const targetId = toggle.getAttribute('data-target');
    const content = document.getElementById(targetId);
    // Por defecto, ABIERTO
    content.classList.add('open');
    toggle.classList.add('active');
    toggle.addEventListener('click', () => {
      const isOpen = content.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
    });
  });
});

// Inicializar
(async function init() {
  await renderCategories();
  await renderTasks();
  // Verificar estado inicial de la papelera
  await checkTrashStatus();
})();

async function checkTrashStatus() {
  const deletedTasks = await getDeletedTasks();
  updateTrashIconIndicator(deletedTasks.length);
} 
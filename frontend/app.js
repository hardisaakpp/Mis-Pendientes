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
}

async function renderTasks(filter = 'todas') {
  const tasks = await getTasks();
  const list = document.getElementById('task-list');
  const inProgressList = document.getElementById('in-progress-task-list');
  const completedList = document.getElementById('completed-task-list');
  list.innerHTML = '';
  if (inProgressList) inProgressList.innerHTML = '';
  if (completedList) completedList.innerHTML = '';
  // Helper para filtrar por categoría
  function matchFilter(task) {
    if (filter === 'todas') return true;
    return (task.categories || []).some(cat => String(cat.id) === String(filter));
  }
  // Tareas pendientes
  tasks.filter(task => matchFilter(task) && !task.completed && !task.inProgress)
    .forEach(task => list.appendChild(createTaskElement(task, 'pending')));
  // Tareas en progreso
  tasks.filter(task => matchFilter(task) && task.inProgress && !task.completed)
    .forEach(task => inProgressList.appendChild(createTaskElement(task, 'inProgress')));
  // Tareas completadas
  tasks.filter(task => matchFilter(task) && task.completed)
    .forEach(task => completedList.appendChild(createTaskElement(task, 'completed')));
}

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
      });
      li.appendChild(info);
      li.appendChild(del);
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

// Inicializar
(async function init() {
  await renderCategories();
  await renderTasks();
})(); 
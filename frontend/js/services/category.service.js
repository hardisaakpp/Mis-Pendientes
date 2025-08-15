// --- FUNCIONES DE CATEGORÍAS ---
async function getCategories() {
  return window.apiGet('/categories');
}

async function saveCategory(name) {
  return window.apiPost('/categories', { name });
}

async function deleteCategory(id) {
  try {
    const result = await window.apiDelete(`/categories/${id}`);
    
    // Si la eliminación fue exitosa, actualizar el cache local
    if (result && !result.error) {
      // Nota: categoriesCache se maneja en el componente principal
      // Aquí solo retornamos el resultado
    }
    
    return result;
  } catch (error) {
    console.error('Error en deleteCategory:', error);
    throw error;
  }
}

// Función para editar categoría
async function saveCategoryEdit(id, name) {
  const res = await window.apiPut(`/categories/${id}`, { name });
  if (res && res.error) throw new Error(res.error);
  return res;
}

// Exportar funciones para uso global (mantener compatibilidad)
window.getCategories = getCategories;
window.saveCategory = saveCategory;
window.deleteCategory = deleteCategory;
window.saveCategoryEdit = saveCategoryEdit;

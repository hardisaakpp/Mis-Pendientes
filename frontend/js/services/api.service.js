// --- CONFIGURACIÓN API ---
const API_URL = 'http://localhost:3001';

// --- FUNCIONES API BASE ---
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
  console.log('=== INICIO apiDelete ===');
  console.log('Path recibido:', path);
  console.log('URL completa:', `${API_URL}${path}`);
  
  try {
    console.log('Ejecutando fetch DELETE...');
    const res = await fetch(`${API_URL}${path}` , { method: 'DELETE' });
    console.log('Respuesta del servidor:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error HTTP en apiDelete:', errorText);
      throw new Error(errorText);
    }
    
    console.log('Respuesta exitosa, parseando JSON...');
    const result = await res.json();
    console.log('Resultado parseado:', result);
    console.log('=== FIN apiDelete - ÉXITO ===');
    return result;
  } catch (error) {
    console.error('=== ERROR en apiDelete ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Exportar funciones para uso global (mantener compatibilidad)
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.API_URL = API_URL;

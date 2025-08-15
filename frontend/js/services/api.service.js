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
  console.log('apiDelete llamado con path:', path);
  console.log('URL completa:', `${API_URL}${path}`);
  const res = await fetch(`${API_URL}${path}` , { method: 'DELETE' });
  console.log('Respuesta del servidor:', res.status, res.statusText);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error en apiDelete:', errorText);
    throw new Error(errorText);
  }
  const result = await res.json();
  console.log('Resultado de apiDelete:', result);
  return result;
}

// Exportar funciones para uso global (mantener compatibilidad)
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.API_URL = API_URL;

# Mis Pendientes - Aplicación de Tareas

Este proyecto es una aplicación de lista de tareas (To-do List) desarrollada para gestionar y organizar tus pendientes de manera eficiente.

## 🚀 Características

- ✅ Agregar tareas
- ✅ Marcar tareas como completadas
- ✅ Eliminar tareas
- ✅ Papelera de reciclaje para tareas eliminadas
- ✅ Restaurar tareas desde la papelera
- ✅ Eliminar permanentemente tareas
- ✅ Gestión de categorías
- ✅ Filtros por categoría
- ✅ Estado "En progreso" para tareas
- ✅ Interfaz moderna y responsive

## 📁 Estructura del proyecto

### Frontend Original (Vanilla JavaScript)
- `frontend/`: Frontend original desarrollado con HTML, CSS y JavaScript vanilla
  - `index.html`: Archivo principal con la estructura de la aplicación
  - `app.js`: Lógica de la aplicación frontend
  - `style.css`: Estilos de la aplicación
  - `assets/`: Archivos estáticos como íconos o imágenes
    - `business-to-do-list-flat-icon-modern-style-free-vector.ico`: Ícono de la app

### Frontend Angular (Nuevo - Recomendado)
- `frontend-angular/`: Frontend mejorado desarrollado con Angular 17
  - Arquitectura modular con componentes reutilizables
  - TypeScript para mayor seguridad de tipos
  - Reactive Forms para formularios robustos
  - Servicios centralizados para lógica de negocio
  - Observables para manejo reactivo de datos
  - Standalone Components sin necesidad de módulos

### Backend
- `backend/`: Servidor backend (Node.js + Express + SQLite)
  - `server.js`: Servidor principal
  - `package.json`: Dependencias del backend
  - `todo.db`: Base de datos SQLite

## 🛠️ Cómo usar

### Opción 1: Frontend Angular (Recomendado)

1. **Instala las dependencias del backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Inicia el servidor backend:**
   ```bash
   node server.js
   ```
   El backend estará disponible en [http://localhost:3001](http://localhost:3001)

3. **Instala las dependencias del frontend Angular:**
   ```bash
   cd frontend-angular
   npm install
   ```

4. **Inicia el servidor de desarrollo Angular:**
   ```bash
   npm start
   ```
   El frontend estará disponible en [http://localhost:4201](http://localhost:4201)

   **Opciones adicionales:**
   ```bash
   npm run start:custom    # Puerto 4201 (configurado por defecto)
   npm run start:dev       # Puerto 4202
   ```

### Opción 2: Frontend Original (Vanilla JavaScript)

1. **Instala las dependencias del backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Inicia el servidor backend:**
   ```bash
   node server.js
   ```

3. **Abre el archivo `frontend/index.html` en tu navegador web**

## 🎯 Ventajas del Frontend Angular

### Mejoras Implementadas:
1. **Arquitectura Modular**: Componentes reutilizables y bien organizados
2. **TypeScript**: Tipado estático para mayor seguridad y mejor desarrollo
3. **Reactive Forms**: Formularios más robustos y validación mejorada
4. **Servicios Centralizados**: Lógica de negocio separada y reutilizable
5. **Observables**: Manejo reactivo de datos con RxJS
6. **Standalone Components**: Componentes independientes sin necesidad de módulos
7. **Mejor Performance**: Detección de cambios optimizada
8. **Código más Limpio**: Estructura más mantenible y escalable

### Características Técnicas:
- ✅ Angular 17 con Standalone Components
- ✅ TypeScript para tipado estático
- ✅ Reactive Forms para formularios
- ✅ HTTP Client para comunicación con API
- ✅ RxJS Observables para manejo de datos
- ✅ Component-based architecture
- ✅ CSS modular por componente

## 📋 Scripts Disponibles

### Frontend Angular:
```bash
npm start          # Inicia el servidor de desarrollo (puerto 4201)
npm run start:custom # Puerto 4201 (configurado por defecto)
npm run start:dev    # Puerto 4202
npm run build        # Construye la aplicación para producción
npm run test         # Ejecuta las pruebas unitarias
```

### Backend:
```bash
npm start          # Inicia el servidor backend
```

## 🔧 Configuración

### Requisitos:
- Node.js (versión 16 o superior)
- npm (incluido con Node.js)

### Puertos:
- Backend: `http://localhost:3001`
- Frontend Angular: `http://localhost:4201` (configurado)
- Frontend Angular (alternativo): `http://localhost:4202` (usando `npm run start:dev`)

## 📝 Notas de Desarrollo

- El frontend Angular es compatible con el backend existente
- Ambos frontends utilizan la misma API REST
- La base de datos SQLite se crea automáticamente
- Los estilos se han adaptado para mantener la consistencia visual

## 👨‍💻 Autor
- Desarrollado por Isaac
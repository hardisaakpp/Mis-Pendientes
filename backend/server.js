const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar base de datos
const db = new sqlite3.Database('./todo.db', (err) => {
  if (err) return console.error(err.message);
  console.log('Conectado a la base de datos SQLite.');
});

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT '📋',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    inProgress INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS task_categories (
    task_id INTEGER,
    category_id INTEGER,
    PRIMARY KEY (task_id, category_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  )`);
  
  // Agregar campos si no existen (para bases de datos existentes)
  db.run("PRAGMA table_info(tasks)", [], (err, rows) => {
    if (err) return console.error('Error checking table schema:', err);
    if (!rows) return console.log('No table info available for tasks');
    
    const hasDeletedAt = rows.some(row => row.name === 'deleted_at');
    if (!hasDeletedAt) {
      db.run('ALTER TABLE tasks ADD COLUMN deleted_at DATETIME', (err) => {
        if (err) console.error('Error adding deleted_at column:', err);
        else console.log('Added deleted_at column to tasks table');
      });
    }
    
    const hasCreatedAt = rows.some(row => row.name === 'created_at');
    if (!hasCreatedAt) {
      db.run('ALTER TABLE tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
        if (err) console.error('Error adding created_at column:', err);
        else console.log('Added created_at column to tasks table');
      });
    }
    
    const hasUpdatedAt = rows.some(row => row.name === 'updated_at');
    if (!hasUpdatedAt) {
      db.run('ALTER TABLE tasks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
        if (err) console.error('Error adding updated_at column:', err);
        else console.log('Added updated_at column to tasks table');
      });
    }
  });
  
  db.run("PRAGMA table_info(categories)", [], (err, rows) => {
    if (err) return console.error('Error checking categories table schema:', err);
    if (!rows) return console.log('No table info available for categories');
    
    const hasColor = rows.some(row => row.name === 'color');
    if (!hasColor) {
      db.run('ALTER TABLE categories ADD COLUMN color TEXT DEFAULT "#6366f1"', (err) => {
        if (err) console.error('Error adding color column:', err);
        else console.log('Added color column to categories table');
      });
    }
    
    const hasIcon = rows.some(row => row.name === 'icon');
    if (!hasIcon) {
      db.run('ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT "📋"', (err) => {
        if (err) console.error('Error adding icon column:', err);
        else console.log('Added icon column to categories table');
      });
    }
    
    const hasOrderIndex = rows.some(row => row.name === 'order_index');
    if (!hasOrderIndex) {
      db.run('ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0', (err) => {
        if (err) console.error('Error adding order_index column:', err);
        else console.log('Added order_index column to categories table');
      });
    }
    
    const hasCreatedAt = rows.some(row => row.name === 'created_at');
    if (!hasCreatedAt) {
      db.run('ALTER TABLE categories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
        if (err) console.error('Error adding created_at column:', err);
        else console.log('Added created_at column to categories table');
      });
    }
    
    const hasUpdatedAt = rows.some(row => row.name === 'updated_at');
    if (!hasUpdatedAt) {
      db.run('ALTER TABLE categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
        if (err) console.error('Error adding updated_at column:', err);
        else console.log('Added updated_at column to categories table');
      });
    }
  });
});

// --- ENDPOINTS DE CATEGORÍAS ---
app.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY order_index ASC, name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Agregar campos por defecto si no existen
    const categories = rows.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color || '#6366f1',
      icon: cat.icon || '📋',
      order_index: cat.order_index || 0,
      created_at: cat.created_at || new Date().toISOString(),
      updated_at: cat.updated_at || new Date().toISOString()
    }));
    
    res.json(categories);
  });
});

app.post('/categories', (req, res) => {
  const { name, color, icon, order_index } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  
  // Obtener el siguiente orden disponible si no se especifica
  let finalOrderIndex = order_index;
  if (finalOrderIndex === undefined) {
    db.get('SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM categories', [], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      finalOrderIndex = row.next_order;
      insertCategory();
    });
  } else {
    insertCategory();
  }
  
  function insertCategory() {
    const insertQuery = `
      INSERT INTO categories (name, color, icon, order_index, created_at, updated_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    db.run(insertQuery, [
      name, 
      color || '#6366f1', 
      icon || '📋', 
      finalOrderIndex || 0
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newCategory = {
        id: this.lastID,
        name,
        color: color || '#6366f1',
        icon: icon || '📋',
        order_index: finalOrderIndex || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      res.json(newCategory);
    });
  }
});

app.delete('/categories/:id', (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.put('/categories/:id', (req, res) => {
  const { name, color, icon, order_index } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  
  const updateFields = [];
  const updateValues = [];
  
  if (name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(name);
  }
  
  if (color !== undefined) {
    updateFields.push('color = ?');
    updateValues.push(color);
  }
  
  if (icon !== undefined) {
    updateFields.push('icon = ?');
    updateValues.push(icon);
  }
  
  if (order_index !== undefined) {
    updateFields.push('order_index = ?');
    updateValues.push(order_index);
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(req.params.id);
  
  const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, updateValues, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Reordenar categorías
app.put('/categories/reorder', async (req, res) => {
  console.log('Reorder request body:', req.body);
  console.log('Reorder request headers:', req.headers);
  const { categories } = req.body;
  
  if (!categories || !Array.isArray(categories)) {
    console.log('Categories validation failed:', { categories, isArray: Array.isArray(categories) });
    return res.status(400).json({ error: 'Se requiere un array de categorías con id y order' });
  }
  
  // Validar que cada categoría tenga id y order
  console.log('Validating categories:', categories);
  for (const category of categories) {
    console.log('Validating category:', category, { 
      id: category.id, 
      idType: typeof category.id, 
      order: category.order, 
      orderType: typeof category.order 
    });
    if (typeof category.id !== 'number' || typeof category.order !== 'number') {
      return res.status(400).json({ error: 'Cada categoría debe tener id (número) y order (número)' });
    }
  }
  
  // Actualizar el orden de cada categoría usando Promise.all para manejar operaciones asíncronas
  try {
    const updatePromises = categories.map(category => {
      return new Promise((resolve, reject) => {
        db.run('UPDATE categories SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
          [category.order, category.id], function(err) {
            if (err) {
              reject(`Error actualizando categoría ${category.id}: ${err.message}`);
            } else {
              resolve();
            }
          });
      });
    });
    
    await Promise.all(updatePromises);
    
    res.json({ 
      message: 'Categorías reordenadas correctamente',
      updated: categories.length 
    });
  } catch (error) {
    console.error('Error updating categories:', error);
    res.status(500).json({ 
      error: 'Error al actualizar las categorías', 
      details: error 
    });
  }
});

// --- ENDPOINTS DE TAREAS ---
app.get('/tasks', (req, res) => {
  db.all('SELECT * FROM tasks WHERE deleted = 0', [], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    // Obtener categorías asociadas a cada tarea
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return res.json([]);
    db.all(`SELECT tc.task_id, c.id as category_id, c.name FROM task_categories tc JOIN categories c ON tc.category_id = c.id WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`, taskIds, (err2, catRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const taskMap = {};
      tasks.forEach(t => { taskMap[t.id] = { ...t, categories: [] }; });
      catRows.forEach(row => {
        taskMap[row.task_id].categories.push({ id: row.category_id, name: row.name });
      });
      res.json(Object.values(taskMap));
    });
  });
});

app.post('/tasks', (req, res) => {
  const { text, completed = 0, inProgress = 0, categories = [] } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto requerido' });
  db.run('INSERT INTO tasks (text, completed, inProgress) VALUES (?, ?, ?)', [text, completed, inProgress], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const taskId = this.lastID;
    // Insertar categorías asociadas
    if (categories.length > 0) {
      const stmt = db.prepare('INSERT INTO task_categories (task_id, category_id) VALUES (?, ?)');
      categories.forEach(catId => stmt.run(taskId, catId));
      stmt.finalize(() => {
        res.json({ id: taskId, text, completed, inProgress, categories });
      });
    } else {
      res.json({ id: taskId, text, completed, inProgress, categories: [] });
    }
  });
});

app.put('/tasks/:id', (req, res) => {
  const { text, completed, inProgress, categories = [] } = req.body;
  db.run('UPDATE tasks SET text = ?, completed = ?, inProgress = ? WHERE id = ?', [text, completed, inProgress, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // Actualizar categorías asociadas
    db.run('DELETE FROM task_categories WHERE task_id = ?', [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (categories.length > 0) {
        const stmt = db.prepare('INSERT INTO task_categories (task_id, category_id) VALUES (?, ?)');
        categories.forEach(catId => stmt.run(req.params.id, catId));
        stmt.finalize(() => {
          res.json({ updated: this.changes });
        });
      } else {
        res.json({ updated: this.changes });
      }
    });
  });
});

app.delete('/tasks/:id', (req, res) => {
  db.run('UPDATE tasks SET deleted = 1 WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// --- ENDPOINTS DE PAPELERA DE RECICLAJE ---

// Obtener todas las tareas eliminadas
app.get('/deleted-tasks', (req, res) => {
  db.all('SELECT * FROM tasks WHERE deleted = 1 ORDER BY deleted_at DESC, id DESC', [], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Obtener categorías asociadas a cada tarea
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return res.json([]);
    
    db.all(`SELECT tc.task_id, c.id as category_id, c.name FROM task_categories tc JOIN categories c ON tc.category_id = c.id WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`, taskIds, (err2, catRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      const taskMap = {};
      tasks.forEach(t => { 
        taskMap[t.id] = { 
          ...t, 
          categories: [],
          deletedAt: t.deleted_at || new Date().toISOString() // Usar fecha real si existe
        }; 
      });
      
      catRows.forEach(row => {
        if (taskMap[row.task_id]) {
          taskMap[row.task_id].categories.push({ id: row.category_id, name: row.name });
        }
      });
      
      res.json(Object.values(taskMap));
    });
  });
});

// Mover tarea a la papelera (eliminar de forma segura)
app.post('/tasks/:id/delete', (req, res) => {
  const now = new Date().toISOString();
  db.run('UPDATE tasks SET deleted = 1, deleted_at = ? WHERE id = ?', [now, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ movedToRecycleBin: this.changes });
  });
});

// Restaurar tarea desde la papelera
app.post('/deleted-tasks/restore', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'ID de tarea requerido' });
  
  db.run('UPDATE tasks SET deleted = 0, deleted_at = NULL WHERE id = ?', [taskId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ restored: this.changes });
  });
});

// Eliminar permanentemente una tarea
app.delete('/deleted-tasks/:id', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Vaciar toda la papelera
app.delete('/deleted-tasks/empty', (req, res) => {
  db.run('DELETE FROM tasks WHERE deleted = 1', [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Obtener estadísticas de la papelera
app.get('/deleted-tasks/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM tasks WHERE deleted = 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const total = row.total;
    
    if (total === 0) {
      return res.json({ total: 0, oldest: null, newest: null });
    }
    
    // Obtener la tarea más antigua y más reciente
    db.get('SELECT id FROM tasks WHERE deleted = 1 ORDER BY id ASC LIMIT 1', [], (err2, oldestRow) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      db.get('SELECT id FROM tasks WHERE deleted = 1 ORDER BY id DESC LIMIT 1', [], (err3, newestRow) => {
        if (err3) return res.status(500).json({ error: err3.message });
        
        res.json({ 
          total, 
          oldest: oldestRow ? new Date().toISOString() : null, 
          newest: newestRow ? new Date().toISOString() : null 
        });
      });
    });
  });
});

// Buscar tareas eliminadas
app.get('/deleted-tasks/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query de búsqueda requerido' });
  
  db.all('SELECT * FROM tasks WHERE deleted = 1 AND text LIKE ? ORDER BY id DESC', [`%${q}%`], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Obtener categorías asociadas
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return res.json([]);
    
    db.all(`SELECT tc.task_id, c.id as category_id, c.name FROM task_categories tc JOIN categories c ON tc.category_id = c.id WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`, taskIds, (err2, catRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      const taskMap = {};
      tasks.forEach(t => { 
        taskMap[t.id] = { 
          ...t, 
          categories: [],
          deletedAt: new Date().toISOString()
        }; 
      });
      
      catRows.forEach(row => {
        if (taskMap[row.task_id]) {
          taskMap[row.task_id].categories.push({ id: row.category_id, name: row.name });
        }
      });
      
      res.json(Object.values(taskMap));
    });
  });
});

// Obtener tareas eliminadas por categoría
app.get('/deleted-tasks/category/:categoryId', (req, res) => {
  const { categoryId } = req.params;
  
  db.all(`
    SELECT DISTINCT t.* FROM tasks t 
    JOIN task_categories tc ON t.id = tc.task_id 
    WHERE t.deleted = 1 AND tc.category_id = ? 
    ORDER BY t.id DESC
  `, [categoryId], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Obtener categorías asociadas
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return res.json([]);
    
    db.all(`SELECT tc.task_id, c.id as category_id, c.name FROM task_categories tc JOIN categories c ON tc.category_id = c.id WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`, taskIds, (err2, catRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      const taskMap = {};
      tasks.forEach(t => { 
        taskMap[t.id] = { 
          ...t, 
          categories: [],
          deletedAt: new Date().toISOString()
        }; 
      });
      
      catRows.forEach(row => {
        if (taskMap[row.task_id]) {
          taskMap[row.task_id].categories.push({ id: row.category_id, name: row.name });
        }
      });
      
      res.json(Object.values(taskMap));
    });
  });
});

// Obtener tareas eliminadas por fecha (simulado por ahora)
app.get('/deleted-tasks/date/:date', (req, res) => {
  // Por simplicidad, devolvemos todas las tareas eliminadas
  // En una implementación real, se filtraría por fecha
  db.all('SELECT * FROM tasks WHERE deleted = 1 ORDER BY id DESC', [], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return res.json([]);
    
    db.all(`SELECT tc.task_id, c.id as category_id, c.name FROM task_categories tc JOIN categories c ON tc.category_id = c.id WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`, taskIds, (err2, catRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      const taskMap = {};
      tasks.forEach(t => { 
        taskMap[t.id] = { 
          ...t, 
          categories: [],
          deletedAt: new Date().toISOString()
        }; 
      });
      
      catRows.forEach(row => {
        if (taskMap[row.task_id]) {
          taskMap[row.task_id].categories.push({ id: row.category_id, name: row.name });
        }
      });
      
      res.json(Object.values(taskMap));
    });
  });
});

// Obtener tareas eliminadas en un rango de fechas (simulado por ahora)
app.get('/deleted-tasks/date-range', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'Fechas de inicio y fin requeridas' });
  
  // Por simplicidad, devolvemos todas las tareas eliminadas
  // En una implementación real, se filtraría por rango de fechas
  db.all('SELECT * FROM tasks WHERE deleted = 1 ORDER BY id DESC', [], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return res.json([]);
    
    db.all(`SELECT tc.task_id, c.id as category_id, c.name FROM task_categories tc JOIN categories c ON tc.category_id = c.id WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`, taskIds, (err2, catRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      const taskMap = {};
      tasks.forEach(t => { 
        taskMap[t.id] = { 
          ...t, 
          categories: [],
          deletedAt: new Date().toISOString()
        }; 
      });
      
      catRows.forEach(row => {
        if (taskMap[row.task_id]) {
          taskMap[row.task_id].categories.push({ id: row.category_id, name: row.name });
        }
      });
      
      res.json(Object.values(taskMap));
    });
  });
});

// Endpoint de salud para verificar la conexión
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    port: PORT,
    database: 'SQLite'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
}); 
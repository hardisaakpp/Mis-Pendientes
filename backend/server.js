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
    name TEXT UNIQUE NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    inProgress INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS task_categories (
    task_id INTEGER,
    category_id INTEGER,
    PRIMARY KEY (task_id, category_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  )`);
  
  // Agregar columna deleted si no existe
  db.run(`ALTER TABLE tasks ADD COLUMN deleted INTEGER DEFAULT 0`);
});

// --- ENDPOINTS DE CATEGORÍAS ---
app.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.delete('/categories/:id', (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.put('/categories/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
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
app.get('/tasks/deleted', (req, res) => {
  db.all('SELECT * FROM tasks WHERE deleted = 1', [], (err, tasks) => {
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

app.post('/tasks/:id/restore', (req, res) => {
  db.run('UPDATE tasks SET deleted = 0 WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ restored: this.changes });
  });
});

app.delete('/tasks/:id/permanent', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
}); 
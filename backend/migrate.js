const sqlite3 = require('sqlite3').verbose();

// Conectar a la base de datos
const db = new sqlite3.Database('./todo.db', (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos SQLite.');
});

// Función para ejecutar migraciones
function runMigrations() {
  console.log('Iniciando migraciones...');
  
  // Agregar columnas a la tabla tasks
  db.run('ALTER TABLE tasks ADD COLUMN deleted_at DATETIME', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error agregando deleted_at a tasks:', err.message);
    } else {
      console.log('Columna deleted_at agregada a tasks (o ya existía)');
    }
    
    db.run('ALTER TABLE tasks ADD COLUMN created_at DATETIME', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando created_at a tasks:', err.message);
      } else {
        console.log('Columna created_at agregada a tasks (o ya existía)');
        // Actualizar valores existentes
        db.run('UPDATE tasks SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL', (err) => {
          if (err) console.error('Error actualizando created_at:', err.message);
          else console.log('Valores de created_at actualizados');
        });
      }
      
      db.run('ALTER TABLE tasks ADD COLUMN updated_at DATETIME', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error agregando updated_at a tasks:', err.message);
        } else {
          console.log('Columna updated_at agregada a tasks (o ya existía)');
          // Actualizar valores existentes
          db.run('UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL', (err) => {
            if (err) console.error('Error actualizando updated_at:', err.message);
            else console.log('Valores de updated_at actualizados');
          });
        }
        
        // Agregar columnas a la tabla categories
        db.run('ALTER TABLE categories ADD COLUMN color TEXT', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error agregando color a categories:', err.message);
          } else {
            console.log('Columna color agregada a categories (o ya existía)');
            // Actualizar valores existentes
            db.run('UPDATE categories SET color = "#6366f1" WHERE color IS NULL', (err) => {
              if (err) console.error('Error actualizando color:', err.message);
              else console.log('Valores de color actualizados');
            });
          }
          
          db.run('ALTER TABLE categories ADD COLUMN icon TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Error agregando icon a categories:', err.message);
            } else {
              console.log('Columna icon agregada a categories (o ya existía)');
              // Actualizar valores existentes
              db.run('UPDATE categories SET icon = "📋" WHERE icon IS NULL', (err) => {
                if (err) console.error('Error actualizando icon:', err.message);
                else console.log('Valores de icon actualizados');
              });
            }
            
            db.run('ALTER TABLE categories ADD COLUMN order_index INTEGER', (err) => {
              if (err && !err.message.includes('duplicate column name')) {
                console.error('Error agregando order_index a categories:', err.message);
              } else {
                console.log('Columna order_index agregada a categories (o ya existía)');
                // Actualizar valores existentes
                db.run('UPDATE categories SET order_index = 0 WHERE order_index IS NULL', (err) => {
                  if (err) console.error('Error actualizando order_index:', err.message);
                  else console.log('Valores de order_index actualizados');
                });
              }
              
              db.run('ALTER TABLE categories ADD COLUMN created_at DATETIME', (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('Error agregando created_at a categories:', err.message);
                } else {
                  console.log('Columna created_at agregada a categories (o ya existía)');
                  // Actualizar valores existentes
                  db.run('UPDATE categories SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL', (err) => {
                    if (err) console.error('Error actualizando created_at:', err.message);
                    else console.log('Valores de created_at actualizados');
                  });
                }
                
                db.run('ALTER TABLE categories ADD COLUMN updated_at DATETIME', (err) => {
                  if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error agregando updated_at a categories:', err.message);
                  } else {
                    console.log('Columna updated_at agregada a categories (o ya existía)');
                    // Actualizar valores existentes
                    db.run('UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL', (err) => {
                      if (err) console.error('Error actualizando updated_at:', err.message);
                      else console.log('Valores de updated_at actualizados');
                    });
                  }
                  
                  console.log('Migraciones completadas.');
                  db.close();
                });
              });
            });
          });
        });
      });
    });
  });
}

// Ejecutar migraciones
runMigrations();

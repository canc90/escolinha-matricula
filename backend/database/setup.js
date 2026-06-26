const db = require('./connection');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  try {
    // Run migrations
    console.log('🔧 Running migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations complete.');

    // Check if admin user exists
    const admin = await db('usuarios').where({ usuario: 'admin' }).first();
    if (!admin) {
      if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
        console.log('⚠️  Nenhum usuário admin encontrado. Defina ADMIN_PASSWORD no .env para criar.');
      } else {
        const senha = process.env.ADMIN_PASSWORD || 'admin123';
        const hash = await bcrypt.hash(senha, 10);
        await db('usuarios').insert({
          usuario: 'admin',
          senha: hash,
          nome: 'Administrador',
          role: 'admin',
        });
        if (senha === 'admin123') {
          console.log('⚠️  Admin criado com senha padrão (admin123). Altere após o primeiro login.');
        }
        console.log('✅ Admin user created.');
      }
    } else {
      console.log('✅ Admin user already exists.');
    }
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    process.exit(1);
  }
}

module.exports = setupDatabase;

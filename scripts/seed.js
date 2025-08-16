// scripts/seed.mjs
import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);

    await pool.query(`
      INSERT INTO admins (email, password_hash, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [adminEmail, hash, 'Admin User']);

    await pool.query(`
      INSERT INTO categories (slug, name) VALUES
        ('domestic','Home Purifiers'),
        ('commercial','Commercial Plants'),
        ('dispenser','Dispensers'),
        ('filters','Filter Systems')
      ON CONFLICT (slug) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO products (id, title, brand, sku, category_slug, price, mrp, rating, reviews, badge, thumbnail, tags)
      VALUES
      ('prod_ultra_pure_01','UltraPure RO+UV+UF Water Purifier','Opor','OP-RO-UV-01','domestic',12999,16999,4.6,214,'top','','ro,uv,uf,home,top-selling'),
      ('prod_steel_plant_200l','Commercial SS Water Plant 200 LPH','Opor','OP-SS-200','commercial',149999,179999,4.3,58,'deal','','industrial,b2b,deal')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Seed complete. Admin:', adminEmail);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed', err);
    process.exit(1);
  }
})();

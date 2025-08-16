const express = require('express');
const cors = require('cors');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const AUTH_PREFIX = '/api/auth';
const API_PREFIX = '/api';

// --- Helper middleware ---
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Auth routes ---
// POST /api/auth/login
app.post(AUTH_PREFIX + '/login', async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: 'Invalid input' });
  try {
    const r = await pool.query('SELECT id, email, password_hash FROM admins WHERE email = $1', [value.email]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const admin = r.rows[0];
    const ok = await bcrypt.compare(value.password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '6h' });
    res.json({ token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Protected: create product
app.post(API_PREFIX + '/products', requireAuth, async (req, res) => {
  const schema = Joi.object({
    id: Joi.string().optional(),
    title: Joi.string().required(),
    brand: Joi.string().optional(),
    sku: Joi.string().optional(),
    category_slug: Joi.string().optional(),
    price: Joi.number().required(),
    mrp: Joi.number().optional(),
    rating: Joi.number().optional(),
    reviews: Joi.number().optional(),
    badge: Joi.string().optional(),
    thumbnail: Joi.string().optional(),
    tags: Joi.string().optional()
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: 'Invalid input', details: error.details.map(d=>d.message) });
  try {
    const id = value.id || 'prod_' + nanoid(8);
    await pool.query(`INSERT INTO products (id,title,brand,sku,category_slug,price,mrp,rating,reviews,badge,thumbnail,tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id, value.title, value.brand||null, value.sku||null, value.category_slug||null, value.price, value.mrp||null, value.rating||null, value.reviews||0, value.badge||null, value.thumbnail||null, value.tags||null]);
    res.status(201).json({ message: 'Product created', id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

// Protected: update product
app.put(API_PREFIX + '/products/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const allowed = ['title','brand','sku','category_slug','price','mrp','rating','reviews','badge','thumbnail','tags'];
  const set = [];
  const vals = [];
  let i = 1;
  for (const k of allowed) {
    if (k in fields) { set.push(k + ' = $' + i); vals.push(fields[k]); i++; }
  }
  if (!set.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(id);
  const sql = 'UPDATE products SET ' + set.join(', ') + ' WHERE id = $' + i;
  try {
    await pool.query(sql, vals);
    res.json({ message: 'Updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

// Protected: delete product
app.delete(API_PREFIX + '/products/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

// Public product endpoints (list & get)
app.get(API_PREFIX + '/products', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.get(API_PREFIX + '/products/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

// Categories CRUD (admin protected for write)
app.get(API_PREFIX + '/categories', async (req, res) => {
  try { const r = await pool.query('SELECT slug,name FROM categories ORDER BY name'); res.json(r.rows); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.post(API_PREFIX + '/categories', requireAuth, async (req, res) => {
  const { slug, name } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug & name required' });
  try { await pool.query('INSERT INTO categories (slug,name) VALUES ($1,$2)', [slug, name]); res.status(201).json({ message: 'Created' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.put(API_PREFIX + '/categories/:slug', requireAuth, async (req, res) => {
  const slug = req.params.slug; const name = req.body.name;
  if (!name) return res.status(400).json({ error: 'name required' });
  try { await pool.query('UPDATE categories SET name=$1 WHERE slug=$2', [name, slug]); res.json({ message: 'Updated' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.delete(API_PREFIX + '/categories/:slug', requireAuth, async (req, res) => {
  try { await pool.query('DELETE FROM categories WHERE slug=$1', [req.params.slug]); res.json({ message: 'Deleted' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

// Deals CRUD
app.get(API_PREFIX + '/deals', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM deals ORDER BY valid_till DESC'); res.json(r.rows); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.post(API_PREFIX + '/deals', requireAuth, async (req, res) => {
  const id = 'deal_' + nanoid(8);
  const { title, subtitle, cta_label, cta_url, image, valid_till } = req.body;
  try { await pool.query('INSERT INTO deals (id,title,subtitle,cta_label,cta_url,image,valid_till) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,title,subtitle,cta_label,cta_url,image,valid_till]); res.status(201).json({ id }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.put(API_PREFIX + '/deals/:id', requireAuth, async (req, res) => {
  const id = req.params.id; const fields = req.body; const allowed=['title','subtitle','cta_label','cta_url','image','valid_till']; const set=[]; const vals=[]; let i=1; for(const k of allowed){ if(k in fields){ set.push(k+'=$'+i); vals.push(fields[k]); i++; }} if(!set.length) return res.status(400).json({ error:'No fields' }); vals.push(id); try{ await pool.query('UPDATE deals SET '+set.join(', ')+' WHERE id=$'+i, vals); res.json({ message:'Updated' }); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

app.delete(API_PREFIX + '/deals/:id', requireAuth, async (req, res) => {
  try{ await pool.query('DELETE FROM deals WHERE id=$1',[req.params.id]); res.json({ message:'Deleted' }); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

// Testimonials CRUD (public read, admin write)
app.get(API_PREFIX + '/testimonials', async (req, res) => {
  try{ const r = await pool.query('SELECT * FROM testimonials ORDER BY date DESC'); res.json(r.rows); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

app.post(API_PREFIX + '/testimonials', requireAuth, async (req, res) => {
  const id = 't_' + nanoid(8);
  const { name, rating, comment, location, date } = req.body;
  try{ await pool.query('INSERT INTO testimonials (id,name,rating,comment,location,date) VALUES ($1,$2,$3,$4,$5,$6)', [id,name,rating,comment,location,date]); res.status(201).json({ id }); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

// FAQs CRUD
app.get(API_PREFIX + '/faqs', async (req, res) => {
  try{ const r = await pool.query('SELECT * FROM faqs ORDER BY id ASC'); res.json(r.rows); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

app.post(API_PREFIX + '/faqs', requireAuth, async (req, res) => {
  const { q, a } = req.body;
  if (!q || !a) return res.status(400).json({ error: 'q and a required' });
  try{ const r = await pool.query('INSERT INTO faqs (q,a) VALUES ($1,$2) RETURNING id', [q,a]); res.status(201).json({ id: r.rows[0].id }); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

// Enquiries: public submit and admin list/delete
app.post(API_PREFIX + '/enquiry', async (req, res) => {
  const schema = Joi.object({ name: Joi.string().min(2).required(), email: Joi.string().email().required(), phone: Joi.string().required(), message: Joi.string().min(3).required(), productId: Joi.string().optional() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: 'Invalid input', details: error.details.map(d=>d.message) });
  const id = 'enq_' + nanoid(8);
  try{ await pool.query('INSERT INTO enquiries (id,name,email,phone,message,product_id) VALUES ($1,$2,$3,$4,$5,$6)', [id, value.name, value.email, value.phone, value.message, value.productId||null]); res.status(201).json({ message:'Submitted', id }); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

app.get(API_PREFIX + '/enquiry', requireAuth, async (req, res) => {
  try{ const r = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC'); res.json(r.rows); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

app.delete(API_PREFIX + '/enquiry/:id', requireAuth, async (req, res) => {
  try{ await pool.query('DELETE FROM enquiries WHERE id=$1',[req.params.id]); res.json({ message:'Deleted' }); }catch(e){ console.error(e); res.status(500).json({ error:'DB error' }); }
});

module.exports = app;
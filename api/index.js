import express from "express";
import cors from "cors";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { nanoid } from "nanoid";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const AUTH_PREFIX = "/api/auth";
const API_PREFIX = "/api";

// ========================== Middleware ==========================
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const token = h.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ========================== Auth ==========================
app.post(AUTH_PREFIX + "/login", async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: "Invalid input" });

  try {
    const r = await pool.query(
      "SELECT id, email, password_hash FROM admins WHERE email = $1",
      [value.email]
    );
    if (!r.rows.length) return res.status(401).json({ error: "Invalid credentials" });
    const admin = r.rows[0];
    const ok = await bcrypt.compare(value.password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: "6h" }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== Products ==========================
app.get(API_PREFIX + "/products", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(API_PREFIX + "/products", requireAuth, async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().required(),
    image_url: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: "Invalid input" });

  try {
    const id = nanoid();
    await pool.query(
      "INSERT INTO products (id, name, description, price, image_url) VALUES ($1,$2,$3,$4,$5)",
      [id, value.name, value.description, value.price, value.image_url]
    );
    res.json({ id, ...value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== Categories ==========================
app.get(API_PREFIX + "/categories", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== Deals ==========================
app.get(API_PREFIX + "/deals", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM deals ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== Testimonials ==========================
app.get(API_PREFIX + "/testimonials", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM testimonials ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== FAQs ==========================
app.get(API_PREFIX + "/faqs", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM faqs ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== Enquiry ==========================
app.post(API_PREFIX + "/enquiry", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    message: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: "Invalid input" });

  try {
    const id = nanoid();
    await pool.query(
      "INSERT INTO enquiries (id, name, email, message) VALUES ($1,$2,$3,$4)",
      [id, value.name, value.email, value.message]
    );
    res.json({ id, ...value });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================== Default ==========================
app.get("/", (req, res) => {
  res.send("✅ Water Purifier API running on Vercel");
});

export default app;

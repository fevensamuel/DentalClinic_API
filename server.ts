// server.ts - BACKEND ONLY VERSION

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbInstance, generateId, AppointmentStatus } from './src/database';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_super_secret_key_2026';

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS - Allow Vercel frontends
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dental-clinic-website.vercel.app',
  'https://dental-clinic-admin.vercel.app',
  // Add your custom domains
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// AUTHENTICATION ENDPOINTS (Same as yours)
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

// ==========================================
// PUBLIC ENDPOINTS (Same as yours)
// ==========================================

app.get('/api/services', (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.get('/api/doctors', (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.get('/api/public/announcement', (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.get('/api/slots', (req, res) => {
  // ... YOUR EXISTING CODE ...
});

// ==========================================
// PATIENT ENDPOINTS (Same as yours)
// ==========================================

app.post('/api/appointments', authenticateToken, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.get('/api/appointments/me', authenticateToken, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/appointments/:id/cancel', authenticateToken, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

// ==========================================
// ADMIN ENDPOINTS (Same as yours)
// ==========================================

app.get('/api/admin/config', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.get('/api/admin/appointments', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.post('/api/admin/appointments', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/appointments/:id/status', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.post('/api/admin/services', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/services/:title', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.delete('/api/admin/services/:title', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.post('/api/admin/doctors', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/doctors/:id', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/doctors/:id/feature', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.delete('/api/admin/doctors/:id', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/availability', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.delete('/api/admin/availability/:date', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.post('/api/admin/blocked-dates', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.delete('/api/admin/blocked-dates/:date', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/announcement', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

app.put('/api/admin/cutoff', authenticateToken, requireAdmin, (req, res) => {
  // ... YOUR EXISTING CODE ...
});

// ==========================================
// START SERVER (NO FRONTEND SERVING)
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Dental Clinic API Server running on http://localhost:${PORT}`);
});
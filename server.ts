import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import multer from 'multer';
import fs from 'fs';
import { dbInstance, generateId, AppointmentStatus } from './src/database';

// ✅ Resolve paths from the project root so the built server works in development and on Render
const appRoot = process.cwd();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_super_secret_key_2026';

// ✅ Get the deployed backend URL for production
const DEPLOYED_BACKEND_URL = 'https://dental-clinic-backend-0vjn.onrender.com';

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://dental-clinic-public-website.vercel.app',
  'https://dental-clinic-admin-sooty.vercel.app',
  'https://dental-clinic-backend-0vjn.onrender.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 2. FILE UPLOAD CONFIGURATION
// ==========================================

// Ensure upload directories exist
const uploadDir = path.join(appRoot, 'uploads', 'doctors');
const mainUploadDir = path.join(appRoot, 'uploads');

if (!fs.existsSync(mainUploadDir)) {
  fs.mkdirSync(mainUploadDir, { recursive: true });
  console.log('📁 Created main uploads directory');
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads/doctors directory');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doctor-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any, false);
    }
  }
});

// ✅ Serve static files from uploads folder
app.use('/uploads', express.static(path.join(appRoot, 'uploads')));
app.use('/assets', express.static(path.join(appRoot, 'assets')));

app.use(express.json());

app.use(helmet({
  contentSecurityPolicy: false,
}));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// 3. SWAGGER CONFIGURATION (FULL)
// ==========================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dental Clinic API',
      version: '1.0.0',
      description: 'Complete REST API for Dental Clinic Management System',
      contact: {
        name: 'Dental Clinic Support',
        email: 'support@clinic.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://dental-clinic-backend-0vjn.onrender.com'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from login/register'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr1' },
            name: { type: 'string', example: 'John Doe' },
            phone: { type: 'string', example: '+251911123456' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', enum: ['patient', 'admin'], example: 'patient' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'srv1' },
            category: { type: 'string', enum: ['preventive', 'cosmetic', 'restorative'], example: 'preventive' },
            title: { type: 'string', example: 'Preventative Cleaning & Exam' },
            description: { type: 'string', example: 'Comprehensive dental hygiene appointment' },
            price: { type: 'string', example: '1500 ETB' },
            duration: { type: 'string', example: '45 mins' },
            promotionActive: { type: 'boolean', example: false },
            promotionDetails: { type: 'string', example: '' },
            discountPercent: { type: 'string', example: '' },
            discountAmount: { type: 'string', example: '' }
          }
        },
        Doctor: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'doc1' },
            name: { type: 'string', example: 'Dr. Evelyn Smith' },
            title: { type: 'string', example: 'Family Dentist' },
            bio: { type: 'string', example: 'Specializes in...' },
            imageUrl: { type: 'string', example: '' },
            email: { type: 'string', example: 'doctor@clinic.com' },
            phone: { type: 'string', example: '+251911000000' },
            isFeatured: { type: 'boolean', example: true }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'app1' },
            patientId: { type: 'string', example: 'usr1' },
            patientName: { type: 'string', example: 'John Doe' },
            patientEmail: { type: 'string', example: 'john@example.com' },
            patientPhone: { type: 'string', example: '+251911000000' },
            date: { type: 'string', format: 'date', example: '2026-08-15' },
            time: { type: 'string', example: '10:00 AM' },
            dentist: { type: 'string', example: 'Dr. Evelyn Smith' },
            status: { type: 'string', enum: ['Pending', 'Confirmed', 'Arrived', 'Completed', 'No Show', 'Canceled'], example: 'Pending' },
            service: { type: 'string', example: 'Preventative Cleaning & Exam' },
            autoCanceled: { type: 'boolean', example: false }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid credentials' }
          }
        },
        SlotResponse: {
          type: 'object',
          properties: {
            slots: {
              type: 'array',
              items: { type: 'string' },
              example: ['09:00 AM', '10:00 AM', '11:00 AM']
            }
          }
        },
        AvailabilityResponse: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date', example: '2026-08-15' },
            doctorIds: {
              type: 'array',
              items: { type: 'string' },
              example: ['doc1', 'doc2']
            }
          }
        },
        BlockedDate: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date', example: '2026-09-01' },
            reason: { type: 'string', example: 'Annual Holiday' }
          }
        },
        AdminConfig: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { $ref: '#/components/schemas/Service' } },
            doctors: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } },
            appointments: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
            availability: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            blockedDates: { type: 'array', items: { $ref: '#/components/schemas/BlockedDate' } },
            announcement: { type: 'string' },
            bookingCutoffTime: { type: 'string', example: '14:00' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Public', description: 'Public endpoints (no auth required)' },
      { name: 'Patient', description: 'Patient endpoints (requires authentication)' },
      { name: 'Admin', description: 'Admin endpoints (requires admin role)' }
    ]
  },
  apis: ['./server.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ✅ Swagger UI with "Try it out" enabled by default
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dental Clinic API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    defaultModelExpandDepth: 3,
    defaultModelsExpandDepth: 3,
    tryItOutEnabled: true, // ✅ This enables "Try it out" by default
    filter: true,
    displayRequestDuration: true,
  }
}));

// ✅ Alternative: Add a separate route for the raw spec
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ==========================================
// 4. AUTHENTICATION MIDDLEWARE
// ==========================================

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Bearer token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authorization token.' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
  }
  next();
};

// ==========================================
// 5. AUTH ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new patient
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+251911123456"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/auth/register', authLimiter, (req, res) => {
  const { name, phone, email, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone number, and password are required.' });
  }

  const db = dbInstance.getData();

  const existingPhone = db.users.find((u: any) => u.phone && u.phone.trim() === phone.trim());
  if (existingPhone) {
    return res.status(400).json({ error: 'An account with this phone number already exists.' });
  }

  if (email && email.trim()) {
    const existingEmail = db.users.find((u: any) => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUserId = generateId('usr');

  const newUser = {
    _id: newUserId,
    id: newUserId,
    name: name.trim(),
    phone: phone.trim(),
    email: email && email.trim() ? email.trim().toLowerCase() : undefined,
    passwordHash,
    role: 'patient' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users.push(newUser);
  dbInstance.save();

  const userPayload = {
    id: newUser.id,
    name: newUser.name,
    phone: newUser.phone,
    email: newUser.email,
    role: newUser.role
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

  return res.status(201).json({ token, user: userPayload });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@clinic.com"
 *               phone:
 *                 type: string
 *                 example: "+251911123456"
 *               password:
 *                 type: string
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password) {
    return res.status(400).json({ error: 'Email or phone and password are required.' });
  }

  const db = dbInstance.getData();
  const user = db.users.find((u: any) => {
    if (email && u.email && u.email.toLowerCase() === email.trim().toLowerCase()) return true;
    if (phone && u.phone && u.phone.trim() === phone.trim()) return true;
    return false;
  });

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const userPayload = {
    id: user.id || user._id,
    name: user.name,
    phone: user.phone || '+251911000000',
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

  return res.json({ token, user: userPayload });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  return res.json({ user: req.user });
});

// ==========================================
// 6. PUBLIC ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of services
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 */
app.get('/api/services', (req, res) => {
  try {
    const db = dbInstance.getData();
    const services = (db.services || []).map((s: any) => ({
      id: s.id || s._id,
      category: s.category || 'preventive',
      title: s.title,
      description: s.description || '',
      price: typeof s.price === 'number' ? `${s.price} ETB` : s.price || '1500 ETB',
      duration: s.duration || '45 mins',
      promotionActive: Boolean(s.promotionActive),
      promotionDetails: s.promotionDetails || '',
      discountPercent: s.discountPercent ? String(s.discountPercent) : '',
      discountAmount: s.discountAmount ? String(s.discountAmount) : ''
    }));
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of doctors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Doctor'
 */
app.get('/api/doctors', (req, res) => {
  try {
    const db = dbInstance.getData();
    const doctors = (db.doctors || []).map((d: any) => ({
      id: d.id || d._id,
      name: d.name,
      title: d.title,
      bio: d.bio || '',
      imageUrl: getDoctorImageUrl(req, d),
      email: d.email || '',
      phone: d.phone || '',
      isFeatured: Boolean(d.isFeatured)
    }));
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/slots:
 *   get:
 *     summary: Get available slots for a date
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-15
 *       - in: query
 *         name: serviceTitle
 *         schema:
 *           type: string
 *         example: "Preventative Cleaning & Exam"
 *     responses:
 *       200:
 *         description: Available slots
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SlotResponse'
 */
app.get('/api/slots', (req, res) => {
  try {
    const date = req.query.date as string;
    const serviceTitle = (req.query.serviceTitle as string) || (req.query.service as string);
    const db = dbInstance.getData();

    if (!date) {
      return res.status(400).json({ error: 'date parameter is required' });
    }

    const blockedDates = db.blockedDates || [];
    const isBlocked = blockedDates.some((b: any) => b.date === date);
    
    if (isBlocked) {
      return res.json({ slots: [] });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (date < todayStr) {
      return res.json({ slots: [] });
    }

    const allSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '01:00 PM', '02:00 PM',
      '03:00 PM', '04:00 PM'
    ];

    let validTimeSlots = allSlots;
    if (date === todayStr) {
      const currentHour = now.getHours();
      validTimeSlots = allSlots.filter(slot => {
        const parts = slot.split(' ');
        let hour = parseInt(parts[0].split(':')[0], 10);
        if (parts[1] === 'PM' && hour !== 12) hour += 12;
        if (parts[1] === 'AM' && hour === 12) hour = 0;
        return hour > currentHour;
      });
    }

    const bookedTimes = new Set(
      (db.appointments || [])
        .filter((a: any) => a.appointmentDate === date && a.status !== 'Canceled')
        .map((a: any) => a.appointmentTime)
    );

    const availableSlots = validTimeSlots.filter(s => !bookedTimes.has(s));
    res.json({ slots: availableSlots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/blocked-dates:
 *   get:
 *     summary: Get all blocked dates
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of blocked dates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BlockedDate'
 */
app.get('/api/blocked-dates', (req, res) => {
  try {
    const db = dbInstance.getData();
    const blockedDates = (db.blockedDates || []).map((b: any) => ({
      date: b.date,
      reason: b.reason || 'Clinic Closed'
    }));
    res.json(blockedDates);
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/availability:
 *   get:
 *     summary: Get availability for a date
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-15
 *     responses:
 *       200:
 *         description: Availability for the date
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 */
app.get('/api/availability', (req, res) => {
  try {
    const dateParam = req.query.date as string;
    const db = dbInstance.getData();

    if (!dateParam) {
      const allAvailabilities = (db.availabilities || []).map((a: any) => ({
        date: a.date,
        doctorIds: a.doctorIds || []
      }));
      return res.json(allAvailabilities);
    }

    const availability = db.availabilities?.find((a: any) => a.date === dateParam);
    res.json(availability || { date: dateParam, doctorIds: [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 7. PATIENT APPOINTMENT ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Book an appointment (patient)
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - time
 *             properties:
 *               serviceTitle:
 *                 type: string
 *                 example: "Preventative Cleaning & Exam"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-15"
 *               time:
 *                 type: string
 *                 example: "10:00 AM"
 *               dentistName:
 *                 type: string
 *                 example: "Dr. Smith"
 *               status:
 *                 type: string
 *                 enum: [Pending, Confirmed]
 *                 example: "Pending"
 *     responses:
 *       201:
 *         description: Appointment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
app.post('/api/appointments', authenticateToken, (req: any, res) => {
  // ... (same as before)
});

// ==========================================
// 8. ADMIN ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/admin/config:
 *   get:
 *     summary: Get admin configuration
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminConfig'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
app.get('/api/admin/config', authenticateToken, requireAdmin, (req: any, res) => {
  // ... (same as before)
});

// ... (rest of the admin endpoints with Swagger annotations)

// ==========================================
// 13. AUTO NO-SHOW CHECKER
// ==========================================

const checkNoShows = async () => {
  try {
    const db = dbInstance.getData();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayAppointments = (db.appointments || []).filter((a: any) => {
      if (a.appointmentDate !== todayStr) return false;
      if (a.status !== 'Confirmed' && a.status !== 'Arrived') return false;
      
      let timeStr = a.appointmentTime || '';
      if (!timeStr) return false;
      
      let hour = 0, minute = 0;
      
      if (timeStr.includes('PM') || timeStr.includes('AM')) {
        const parts = timeStr.split(' ');
        const timeParts = parts[0].split(':');
        hour = parseInt(timeParts[0]);
        minute = parseInt(timeParts[1] || '0');
        if (parts[1] === 'PM' && hour !== 12) hour += 12;
        if (parts[1] === 'AM' && hour === 12) hour = 0;
      } else {
        const parts = timeStr.split(':');
        hour = parseInt(parts[0]);
        minute = parseInt(parts[1] || '0');
      }
      
      const appointmentMinutes = hour * 60 + minute;
      const diffMinutes = currentMinutes - appointmentMinutes;
      return diffMinutes > 30;
    });

    let updated = 0;
    for (const appointment of todayAppointments) {
      appointment.status = 'No Show';
      appointment.updatedAt = new Date().toISOString();
      updated++;
    }

    if (updated > 0) {
      dbInstance.save();
      console.log(`✅ Auto-updated ${updated} appointment(s) to No Show`);
    }
  } catch (error) {
    console.error('Error checking no-shows:', error);
  }
};

setInterval(checkNoShows, 60000);
setTimeout(checkNoShows, 5000);

// ==========================================
// 14. ROOT & HEALTH
// ==========================================

app.get('/', (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  
  res.json({
    status: 'online',
    message: 'Dental Clinic API is running',
    version: '1.0.0',
    documentation: `${protocol}://${host}/api-docs`,
    endpoints: {
      public: [
        'GET /api/services',
        'GET /api/doctors',
        'GET /api/slots',
        'GET /api/blocked-dates'
      ],
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/me'
      ],
      patient: [
        'POST /api/appointments',
        'GET /api/appointments/me',
        'PUT /api/appointments/:id/cancel'
      ],
      admin: [
        'GET /api/admin/config',
        'GET /api/admin/appointments',
        'POST /api/admin/appointments',
        'PUT /api/admin/appointments/:id/status',
        'POST /api/admin/services',
        'PUT /api/admin/services/:title',
        'DELETE /api/admin/services/:title',
        'POST /api/admin/doctors',
        'PUT /api/admin/doctors/:id',
        'PUT /api/admin/doctors/:id/feature',
        'DELETE /api/admin/doctors/:id',
        'GET /api/admin/availability',
        'PUT /api/admin/availability',
        'DELETE /api/admin/availability/:date',
        'GET /api/admin/blocked-dates',
        'POST /api/admin/blocked-dates',
        'DELETE /api/admin/blocked-dates/:date',
        'PUT /api/admin/cutoff'
      ]
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==========================================
// 15. 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
    available: {
      public: '/api/services, /api/doctors, /api/slots, /api/blocked-dates',
      auth: '/api/auth/login, /api/auth/register, /api/auth/me',
      patient: '/api/appointments, /api/appointments/me, /api/appointments/:id/cancel',
      admin: '/api/admin/* (requires admin token)'
    }
  });
});

// ==========================================
// 16. START SERVER
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Dental Clinic API Server running on http://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`✅ Auto No-Show checker enabled (runs every minute)`);
});
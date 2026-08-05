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
// 3. SWAGGER CONFIGURATION
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dental Clinic API Documentation'
}));

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

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  return res.json({ user: req.user });
});

// ==========================================
// 6. PUBLIC ENDPOINTS
// ==========================================

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

app.post('/api/appointments', authenticateToken, (req: any, res) => {
  try {
    const { 
      serviceTitle, 
      serviceName, 
      date, 
      appointmentDate, 
      time, 
      appointmentTime, 
      dentistName, 
      doctorName,
      status 
    } = req.body;

    const finalServiceTitle = serviceTitle || serviceName || 'General Consultation';
    const finalDate = appointmentDate || date;
    const finalTime = appointmentTime || time;
    const finalDentistName = dentistName || doctorName || 'Assigned Specialist';

    if (!finalDate || !finalTime) {
      return res.status(400).json({ error: 'Appointment date and time are required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (finalDate < todayStr) {
      return res.status(400).json({ error: 'Cannot book appointments in the past.' });
    }

    const db = dbInstance.getData();

    const blockedDates = db.blockedDates || [];
    const isBlocked = blockedDates.some((b: any) => b.date === finalDate);
    
    if (isBlocked) {
      return res.status(400).json({ error: 'The clinic is closed on the selected date.' });
    }

    const doubleBooked = (db.appointments || []).some((a: any) => {
      return a.appointmentDate === finalDate &&
             a.appointmentTime === finalTime &&
             a.status !== 'Canceled' &&
             a.dentistName?.toLowerCase() === finalDentistName.toLowerCase();
    });

    if (doubleBooked) {
      return res.status(400).json({ error: 'This time slot is already booked for the selected specialist.' });
    }

    const newAppId = generateId('app');
    const newAppointment = {
      _id: newAppId,
      id: newAppId,
      patientId: req.user!.id,
      patientName: req.user!.name,
      serviceTitle: finalServiceTitle,
      appointmentDate: finalDate,
      appointmentTime: finalTime,
      dentistName: finalDentistName,
      status: status || 'Pending' as AppointmentStatus,
      autoCanceled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.appointments = db.appointments || [];
    db.appointments.push(newAppointment);
    dbInstance.save();

    res.status(201).json({
      appointment: {
        id: newAppointment.id,
        patientId: newAppointment.patientId,
        patientName: newAppointment.patientName,
        date: newAppointment.appointmentDate,
        time: newAppointment.appointmentTime,
        dentist: newAppointment.dentistName,
        status: newAppointment.status,
        service: newAppointment.serviceTitle,
        autoCanceled: newAppointment.autoCanceled
      }
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/appointments/me', authenticateToken, (req: any, res) => {
  try {
    const db = dbInstance.getData();
    const myAppointments = (db.appointments || [])
      .filter((a: any) => a.patientId === req.user!.id)
      .map((a: any) => ({
        id: a.id || a._id,
        patientId: a.patientId,
        patientName: a.patientName,
        date: a.appointmentDate,
        time: a.appointmentTime,
        dentist: a.dentistName,
        status: a.status,
        service: a.serviceTitle,
        autoCanceled: Boolean(a.autoCanceled)
      }));
    res.json(myAppointments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/appointments/:id/cancel', authenticateToken, (req: any, res) => {
  try {
    const { id } = req.params;
    const db = dbInstance.getData();

    const appointment = (db.appointments || []).find((a: any) => a.id === id || a._id === id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (req.user!.role !== 'admin' && appointment.patientId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this appointment.' });
    }

    if (!['Pending', 'Confirmed'].includes(appointment.status) && req.user!.role !== 'admin') {
      return res.status(400).json({ error: 'Only Pending or Confirmed appointments can be canceled.' });
    }

    appointment.status = 'Canceled';
    appointment.updatedAt = new Date().toISOString();
    dbInstance.save();

    res.json({ success: true, message: 'Appointment canceled successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 8. ADMIN ENDPOINTS - ✅ ALL ROUTES INCLUDED
// ==========================================

// ✅ GET /api/admin/config - Admin configuration endpoint
app.get('/api/admin/config', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const db = dbInstance.getData();

    const availabilityMap: Record<string, string[]> = {};
    (db.availabilities || []).forEach((a: any) => {
      availabilityMap[a.date] = a.doctorIds || [];
    });

    const blockedDates = (db.blockedDates || []).map((b: any) => ({
      date: b.date,
      reason: b.reason || 'Clinic Closed'
    }));

    const formattedAppointments = (db.appointments || []).map((a: any) => {
      const patientUser = (db.users || []).find((u: any) => u.id === a.patientId || u._id === a.patientId);
      return {
        id: a.id || a._id,
        patientId: a.patientId,
        patientName: a.patientName || (patientUser ? patientUser.name : 'Unknown Patient'),
        patientEmail: a.patientEmail || (patientUser ? patientUser.email || '' : ''),
        patientPhone: a.patientPhone || (patientUser ? patientUser.phone : '+251922000100'),
        date: a.appointmentDate,
        time: a.appointmentTime,
        dentist: a.dentistName,
        status: a.status,
        service: a.serviceTitle,
        autoCanceled: Boolean(a.autoCanceled)
      };
    });

    const response = {
      services: db.services || [],
      doctors: (db.doctors || []).map((d: any) => ({
        id: d.id || d._id,
        name: d.name,
        title: d.title,
        bio: d.bio || '',
        imageUrl: d.imageUrl || '',
        email: d.email || '',
        phone: d.phone || '',
        isFeatured: Boolean(d.isFeatured)
      })),
      appointments: formattedAppointments,
      availability: availabilityMap,
      blockedDates: blockedDates,
      announcement: db.websiteConfig?.announcement || '',
      bookingCutoffTime: db.websiteConfig?.bookingCutoffTime || '14:00'
    };

    console.log('✅ Admin config fetched:', {
      availabilityKeys: Object.keys(availabilityMap),
      blockedDatesCount: blockedDates.length,
      doctorsCount: response.doctors.length
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching admin config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ GET /api/admin/appointments - Get all appointments
app.get('/api/admin/appointments', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const db = dbInstance.getData();
    const allAppointments = (db.appointments || []).map((a: any) => {
      const patientUser = (db.users || []).find((u: any) => u.id === a.patientId || u._id === a.patientId);
      return {
        id: a.id || a._id,
        patientId: a.patientId,
        patientName: a.patientName || (patientUser ? patientUser.name : 'Unknown Patient'),
        patientEmail: a.patientEmail || (patientUser ? patientUser.email || '' : ''),
        patientPhone: a.patientPhone || (patientUser ? patientUser.phone : '+251922000100'),
        date: a.appointmentDate,
        time: a.appointmentTime,
        dentist: a.dentistName,
        status: a.status,
        service: a.serviceTitle,
        autoCanceled: Boolean(a.autoCanceled)
      };
    });
    res.json(allAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ POST /api/admin/appointments - Create appointment
app.post('/api/admin/appointments', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { patientId, patientName, patientPhone, patientEmail, serviceTitle, date, appointmentDate, time, appointmentTime, dentistId, dentistName, status } = req.body;

    const finalDate = appointmentDate || date;
    const finalTime = appointmentTime || time;

    const db = dbInstance.getData();

    let finalPatientId = patientId;
    let finalPatientName = patientName;

    if (!finalPatientId) {
      if (!patientPhone) {
        return res.status(400).json({ error: 'Patient phone is required when creating a new patient.' });
      }
      
      const existingPatient = db.users.find((u: any) => u.phone === patientPhone);
      
      if (existingPatient) {
        finalPatientId = existingPatient.id;
        finalPatientName = existingPatient.name;
      } else if (patientName && patientPhone) {
        const newPatientId = generateId('usr');
        const passwordHash = bcrypt.hashSync('patient123', 10);
        const newPatient = {
          _id: newPatientId,
          id: newPatientId,
          name: patientName,
          phone: patientPhone,
          email: patientEmail || '',
          passwordHash,
          role: 'patient',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.users.push(newPatient);
        dbInstance.save();
        finalPatientId = newPatientId;
        finalPatientName = patientName;
      } else {
        return res.status(400).json({ error: 'Patient Name and Phone are required to create a new patient.' });
      }
    }

    if (!serviceTitle || !finalDate || !finalTime) {
      return res.status(400).json({ error: 'serviceTitle, date, and time are required.' });
    }

    let finalDentistName = dentistName;
    if (dentistId) {
      const dentist = db.doctors.find((d: any) => d.id === dentistId);
      if (dentist) {
        finalDentistName = dentist.name;
      }
    }

    if (!finalDentistName) {
      const defaultDentist = db.doctors[0];
      finalDentistName = defaultDentist ? defaultDentist.name : 'Assigned Dentist';
    }

    const validStatuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Arrived', 'Completed', 'No Show', 'Canceled'];
    const finalStatus: AppointmentStatus = status && validStatuses.includes(status) ? status : 'Confirmed';

    const newAppId = generateId('app');
    const newAppointment = {
      _id: newAppId,
      id: newAppId,
      patientId: finalPatientId,
      patientName: finalPatientName || patientName || 'Patient',
      patientEmail: patientEmail || '',
      patientPhone: patientPhone || '',
      serviceTitle,
      appointmentDate: finalDate,
      appointmentTime: finalTime,
      dentistName: finalDentistName,
      status: finalStatus,
      autoCanceled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.appointments = db.appointments || [];
    db.appointments.push(newAppointment);
    dbInstance.save();

    const formattedApp = {
      id: newAppointment.id,
      patientId: newAppointment.patientId,
      patientName: newAppointment.patientName,
      patientEmail: newAppointment.patientEmail,
      patientPhone: newAppointment.patientPhone,
      date: newAppointment.appointmentDate,
      time: newAppointment.appointmentTime,
      dentist: newAppointment.dentistName,
      status: newAppointment.status,
      service: newAppointment.serviceTitle,
      autoCanceled: newAppointment.autoCanceled
    };

    res.status(201).json({ appointment: formattedApp });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ PUT /api/admin/appointments/:id/status - Update appointment status
app.put('/api/admin/appointments/:id/status', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Arrived', 'Completed', 'No Show', 'Canceled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const db = dbInstance.getData();
    const appointment = (db.appointments || []).find((a: any) => a.id === id || a._id === id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    dbInstance.save();

    res.json({ 
      success: true, 
      message: 'Appointment status updated.', 
      appointment: {
        id: appointment.id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        dentist: appointment.dentistName,
        status: appointment.status,
        service: appointment.serviceTitle,
        autoCanceled: appointment.autoCanceled
      }
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 9. ADMIN SERVICES ENDPOINTS
// ==========================================

app.post('/api/admin/services', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { title, name, category, description, duration, price, promotionActive, promotionDetails, discountPercent, discountAmount } = req.body;

    const finalTitle = title || name;

    if (!finalTitle || price === undefined) {
      return res.status(400).json({ error: 'Service title and price are required.' });
    }

    const db = dbInstance.getData();
    const existing = db.services.find((s: any) => s.title.toLowerCase() === finalTitle.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'A service with this title already exists.' });
    }

    const newId = generateId('srv');
    const newService = {
      _id: newId,
      id: newId,
      category: category || 'preventive',
      title: finalTitle,
      description: description || '',
      duration: duration || '45 mins',
      price: typeof price === 'number' ? price : price,
      promotionActive: Boolean(promotionActive),
      promotionDetails: promotionDetails || '',
      discountPercent: discountPercent || '0%',
      discountAmount: discountAmount || '0 ETB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.services = db.services || [];
    db.services.push(newService);
    dbInstance.save();

    res.status(201).json({ service: newService });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/services/:title', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const identifier = decodeURIComponent(req.params.title);
    const db = dbInstance.getData();

    const service = db.services.find((s: any) => s.id === identifier || s._id === identifier || s.title.toLowerCase() === identifier.toLowerCase());

    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const { title, category, description, duration, price, promotionActive, promotionDetails, discountPercent, discountAmount } = req.body;

    if (title) service.title = title;
    if (category) service.category = category;
    if (description !== undefined) service.description = description;
    if (duration) service.duration = duration;
    if (price !== undefined) service.price = price;
    if (promotionActive !== undefined) service.promotionActive = Boolean(promotionActive);
    if (promotionDetails !== undefined) service.promotionDetails = promotionDetails;
    if (discountPercent !== undefined) service.discountPercent = discountPercent;
    if (discountAmount !== undefined) service.discountAmount = discountAmount;

    service.updatedAt = new Date().toISOString();
    dbInstance.save();

    res.json({ service });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/services/:title', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const identifier = decodeURIComponent(req.params.title);
    const db = dbInstance.getData();

    const index = db.services.findIndex((s: any) => s.id === identifier || s._id === identifier || s.title.toLowerCase() === identifier.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    db.services.splice(index, 1);
    dbInstance.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 10. ADMIN DOCTORS ENDPOINTS
// ==========================================

// ✅ Get correct image URL based on environment
const getImageUrl = (req: Request, filename: string) => {
  if (!filename) return '';
  
  if (process.env.NODE_ENV === 'production') {
    return `${DEPLOYED_BACKEND_URL}/uploads/doctors/${filename}`;
  }
  
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  return `${protocol}://${host}/uploads/doctors/${filename}`;
};

const getDoctorImageUrl = (req: Request, doctor: { imageUrl?: string }) => {
  if (doctor.imageUrl && doctor.imageUrl.trim()) {
    let url = doctor.imageUrl;
    if (process.env.NODE_ENV === 'production' && url.includes('localhost:3000')) {
      url = url.replace('http://localhost:3000', DEPLOYED_BACKEND_URL);
    }
    return url;
  }
  return '';
};

// ✅ Fix existing image URLs on startup
const fixDoctorImageUrls = () => {
  try {
    const db = dbInstance.getData();
    let updated = false;
    
    (db.doctors || []).forEach((doctor: any) => {
      if (doctor.imageUrl && doctor.imageUrl.includes('localhost:3000')) {
        doctor.imageUrl = doctor.imageUrl.replace('http://localhost:3000', DEPLOYED_BACKEND_URL);
        updated = true;
      }
    });
    
    if (updated) {
      dbInstance.save();
      console.log('✅ Fixed doctor image URLs');
    }
  } catch (error) {
    console.error('Error fixing doctor image URLs:', error);
  }
};

setTimeout(fixDoctorImageUrls, 3000);

app.post('/api/admin/doctors', authenticateToken, requireAdmin, upload.single('image'), (req: any, res) => {
  try {
    const { name, title, bio, imageUrl, email, phone, isFeatured } = req.body;
    
    let finalImageUrl = '';
    if (req.file) {
      finalImageUrl = getImageUrl(req, req.file.filename);
      console.log('📸 Image uploaded:', finalImageUrl);
    } else if (typeof imageUrl === 'string' && imageUrl.trim()) {
      finalImageUrl = imageUrl.trim();
    }

    if (!name) {
      return res.status(400).json({ error: 'Doctor name is required.' });
    }

    const db = dbInstance.getData();

    if (isFeatured) {
      const featuredCount = (db.doctors || []).filter((d: any) => d.isFeatured).length;
      if (featuredCount >= 3) {
        return res.status(400).json({ error: 'Maximum of 3 featured doctors allowed' });
      }
    }

    const newId = generateId('doc');
    const newDoctor = {
      _id: newId,
      id: newId,
      name,
      title: title || 'Specialist Doctor',
      bio: bio || '',
      imageUrl: finalImageUrl,
      email: email || '',
      phone: phone || '',
      isFeatured: Boolean(isFeatured),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.doctors = db.doctors || [];
    db.doctors.push(newDoctor);
    dbInstance.save();

    res.status(201).json({ doctor: newDoctor });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/doctors/:id', authenticateToken, requireAdmin, upload.single('image'), (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, title, bio, imageUrl, email, phone, isFeatured } = req.body;

    const db = dbInstance.getData();
    const doctor = db.doctors.find((d: any) => d.id === id || d._id === id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    let finalImageUrl = doctor.imageUrl || '';
    if (req.file) {
      finalImageUrl = getImageUrl(req, req.file.filename);
      console.log('📸 Image updated:', finalImageUrl);
    } else if (typeof imageUrl === 'string') {
      finalImageUrl = imageUrl.trim();
    }

    if (isFeatured && !doctor.isFeatured) {
      const otherFeaturedCount = (db.doctors || []).filter(
        (d: any) => d.isFeatured && d.id !== doctor.id && d._id !== doctor._id
      ).length;
      if (otherFeaturedCount >= 3) {
        return res.status(400).json({ error: 'Maximum of 3 featured doctors allowed' });
      }
    }

    if (name) doctor.name = name;
    if (title) doctor.title = title;
    if (bio !== undefined) doctor.bio = bio;
    if (email !== undefined) doctor.email = email;
    if (phone !== undefined) doctor.phone = phone;
    doctor.imageUrl = finalImageUrl;
    if (isFeatured !== undefined) doctor.isFeatured = Boolean(isFeatured);

    doctor.updatedAt = new Date().toISOString();
    dbInstance.save();

    res.json({ doctor });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/doctors', authenticateToken, requireAdmin, (req: any, res) => {
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

app.delete('/api/admin/doctors/:id', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { id } = req.params;
    const db = dbInstance.getData();
    const index = db.doctors.findIndex((d: any) => d.id === id || d._id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    db.doctors.splice(index, 1);
    dbInstance.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/doctors/:id/feature', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { id } = req.params;
    const db = dbInstance.getData();
    const doctor = db.doctors.find((d: any) => d.id === id || d._id === id);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    if (!doctor.isFeatured) {
      const currentlyFeatured = (db.doctors || []).filter(
        (d: any) => d.isFeatured && d.id !== doctor.id && d._id !== doctor._id
      ).length;
      if (currentlyFeatured >= 3) {
        return res.status(400).json({ error: 'Maximum of 3 featured doctors allowed' });
      }
      doctor.isFeatured = true;
    } else {
      doctor.isFeatured = false;
    }

    doctor.updatedAt = new Date().toISOString();
    dbInstance.save();
    res.json({ doctor });
  } catch (error) {
    console.error('Error toggling doctor feature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 11. ADMIN AVAILABILITY & BLOCKED DATES
// ==========================================

app.get('/api/admin/availability', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const db = dbInstance.getData();
    const availabilities = (db.availabilities || []).map((a: any) => ({
      date: a.date,
      doctorIds: a.doctorIds || []
    }));
    res.json(availabilities);
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/availability', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { date, doctorIds } = req.body;

    if (!date || !Array.isArray(doctorIds)) {
      return res.status(400).json({ error: 'Date and doctorIds array are required.' });
    }

    const db = dbInstance.getData();
    if (!db.availabilities) db.availabilities = [];

    let existing = db.availabilities.find((a: any) => a.date === date);
    if (existing) {
      existing.doctorIds = doctorIds;
      existing.updatedAt = new Date().toISOString();
    } else {
      const newId = generateId('av');
      db.availabilities.push({
        _id: newId,
        id: newId,
        date,
        doctorIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    dbInstance.save();

    const updated = db.availabilities.map((a: any) => ({ date: a.date, doctorIds: a.doctorIds || [] }));
    res.json({ success: true, availabilities: updated });
  } catch (error) {
    console.error('Error setting availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/availability/:date', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { date } = req.params;
    const db = dbInstance.getData();
    if (!db.availabilities) db.availabilities = [];

    const index = db.availabilities.findIndex((a: any) => a.date === date);
    if (index === -1) {
      return res.status(404).json({ error: 'Availability not found for this date.' });
    }

    db.availabilities.splice(index, 1);
    dbInstance.save();

    const updated = db.availabilities.map((a: any) => ({ date: a.date, doctorIds: a.doctorIds || [] }));
    res.json({ success: true, availabilities: updated });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/blocked-dates', authenticateToken, requireAdmin, (req: any, res) => {
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

app.post('/api/admin/blocked-dates', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    const db = dbInstance.getData();
    if (!db.blockedDates) db.blockedDates = [];
    
    const existingIndex = db.blockedDates.findIndex((b: any) => b.date === date);

    if (existingIndex !== -1) {
      db.blockedDates[existingIndex].reason = reason || db.blockedDates[existingIndex].reason || 'Clinic Closed';
    } else {
      const newId = generateId('blk');
      db.blockedDates.push({
        _id: newId,
        id: newId,
        date,
        reason: reason || 'Clinic Closed'
      });
    }

    dbInstance.save();
    
    const updated = db.blockedDates.map((b: any) => ({ date: b.date, reason: b.reason || 'Clinic Closed' }));
    res.json({ success: true, blockedDates: updated });
  } catch (error) {
    console.error('Error adding blocked date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/blocked-dates/:date', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { date } = req.params;
    const db = dbInstance.getData();
    if (!db.blockedDates) db.blockedDates = [];

    const index = db.blockedDates.findIndex((b: any) => b.date === date);
    if (index === -1) {
      return res.status(404).json({ error: 'Blocked date not found.' });
    }

    db.blockedDates.splice(index, 1);
    dbInstance.save();

    const updated = db.blockedDates.map((b: any) => ({ date: b.date, reason: b.reason || 'Clinic Closed' }));
    res.json({ success: true, blockedDates: updated });
  } catch (error) {
    console.error('Error removing blocked date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 12. ADMIN CUTOFF CONFIGURATION
// ==========================================

app.put('/api/admin/cutoff', authenticateToken, requireAdmin, (req: any, res) => {
  try {
    const { time } = req.body;
    const db = dbInstance.getData();

    db.websiteConfig = db.websiteConfig || { announcement: '', bookingCutoffTime: '14:00' };
    db.websiteConfig.bookingCutoffTime = time || '14:00';
    dbInstance.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating cutoff time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
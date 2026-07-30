import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbInstance, generateId, AppointmentStatus } from './src/database';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_super_secret_key_2026';

// 1. Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles & preview frames
}));

app.use(cors({
  origin: '*', // Allow connections from public frontend & local dev
  credentials: true
}));

app.use(express.json());

// Auth Rate Limiting (5 attempts per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom Authenticated Request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: 'patient' | 'admin';
  };
}

// Auth Middleware: Verify JWT Bearer Token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// Admin Middleware: Verify Admin Role
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
  }
  next();
};

// ==========================================
// 2. AUTHENTICATION ENDPOINTS (/api/auth)
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
  const { name, phone, email, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone number, and password are required.' });
  }

  const db = dbInstance.getData();

  // Phone must be unique
  const existingPhone = db.users.find(u => u.phone && u.phone.trim() === phone.trim());
  if (existingPhone) {
    return res.status(400).json({ error: 'An account with this phone number already exists.' });
  }

  // Email optional, but if provided must be unique
  if (email && email.trim()) {
    const existingEmail = db.users.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUserId = generateId();

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

  const token = jwt.sign(
    userPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(201).json({
    token,
    user: userPayload
  });
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password) {
    return res.status(400).json({ error: 'Email or phone and password are required.' });
  }

  const db = dbInstance.getData();
  const user = db.users.find(u => {
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

  const token = jwt.sign(
    userPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    token,
    user: userPayload
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    user: req.user
  });
});

// ==========================================
// 3. PUBLIC ENDPOINTS (Services, Doctors, Slots, Announcement)
// ==========================================

// GET /api/services
app.get('/api/services', (req: Request, res: Response) => {
  const db = dbInstance.getData();
  const services = (db.services || []).map(s => {
    let priceVal = s.price;
    if (typeof priceVal === 'number') {
      priceVal = `${priceVal} ETB`;
    } else if (!priceVal) {
      priceVal = '1500 ETB';
    }
    return {
      id: s.id || s._id,
      category: s.category || 'preventive',
      title: s.title,
      description: s.description || '',
      price: priceVal,
      duration: s.duration || '45 mins',
      promotionActive: Boolean(s.promotionActive),
      promotionDetails: s.promotionDetails || '',
      discountPercent: s.discountPercent ? String(s.discountPercent) : '',
      discountAmount: s.discountAmount ? String(s.discountAmount) : ''
    };
  });
  return res.json(services);
});

// GET /api/doctors
app.get('/api/doctors', (req: Request, res: Response) => {
  const db = dbInstance.getData();
  const doctors = (db.doctors || []).map(d => ({
    id: d.id || d._id,
    name: d.name,
    title: d.title,
    bio: d.bio || '',
    imageUrl: d.imageUrl || '',
    isFeatured: Boolean(d.isFeatured)
  }));
  return res.json(doctors);
});

// GET /api/public/announcement
app.get('/api/public/announcement', (req: Request, res: Response) => {
  const db = dbInstance.getData();
  return res.json({ text: db.websiteConfig.announcement || '' });
});

// GET /api/availability?date=YYYY-MM-DD
app.get('/api/availability', (req: Request, res: Response) => {
  const dateParam = req.query.date as string;
  const db = dbInstance.getData();

  if (!dateParam) {
    return res.json({ availabilities: db.availabilities || [] });
  }

  const availability = db.availabilities.find(a => a.date === dateParam);
  return res.json(availability || { date: dateParam, doctorIds: [] });
});

// GET /api/slots?date=YYYY-MM-DD&serviceTitle=EncodedServiceTitle
app.get('/api/slots', (req: Request, res: Response) => {
  const date = req.query.date as string;
  const serviceTitle = (req.query.serviceTitle as string) || (req.query.service as string);
  const doctorId = req.query.doctorId as string;
  const dentistName = req.query.dentistName as string;
  const db = dbInstance.getData();

  if (!date) {
    return res.status(400).json({ error: 'date parameter is required' });
  }

  // Check if date is in blocked_dates table
  const isBlocked = db.blockedDates.some(b => b.date === date);
  if (isBlocked) {
    return res.json({ slots: [] });
  }

  // Check if date is in the past
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (date < todayStr) {
    return res.json({ slots: [] });
  }

  // Check doctor availability for date
  const dayAvail = db.availabilities.find(a => a.date === date);
  if (dayAvail && Array.isArray(dayAvail.doctorIds) && dayAvail.doctorIds.length === 0) {
    return res.json({ slots: [] });
  }

  // Generate 1-hour slots: 09:00 AM to 05:00 PM
  const allSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM'
  ];

  // If date is today, exclude times that have already passed
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

  // Filter out slots already booked for same doctor or same time
  const existingAppointments = db.appointments.filter(a => {
    const isSameDate = a.appointmentDate === date;
    const isNotCanceled = a.status !== 'Canceled';
    
    let isSameTarget = true;
    if (doctorId && a.doctorId) {
      isSameTarget = a.doctorId === doctorId;
    } else if (dentistName && a.dentistName) {
      isSameTarget = a.dentistName.toLowerCase().trim() === dentistName.toLowerCase().trim();
    }

    return isSameDate && isNotCanceled && isSameTarget;
  });

  const bookedTimes = new Set(existingAppointments.map(a => a.appointmentTime));
  const availableSlots = validTimeSlots.filter(s => !bookedTimes.has(s));

  return res.json({ slots: availableSlots });
});

// GET /api/config
app.get('/api/config', (req: Request, res: Response) => {
  const db = dbInstance.getData();
  return res.json(db.websiteConfig);
});

// ==========================================
// 4. PATIENT ENDPOINTS (Appointments)
// ==========================================

// POST /api/appointments (Patient Booking)
app.post('/api/appointments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { 
    serviceTitle, 
    serviceName, 
    serviceId, 
    date, 
    appointmentDate, 
    time, 
    appointmentTime, 
    dentistName, 
    doctorName, 
    doctorId 
  } = req.body;

  const finalServiceTitle = serviceTitle || serviceName || 'General Consultation';
  const finalDate = appointmentDate || date;
  const finalTime = appointmentTime || time;
  const finalDentistName = dentistName || doctorName || 'Assigned Specialist';

  if (!finalDate || !finalTime) {
    return res.status(400).json({ error: 'Appointment date and time are required.' });
  }

  // Reject past dates
  const todayStr = new Date().toISOString().split('T')[0];
  if (finalDate < todayStr) {
    return res.status(400).json({ error: 'Cannot book appointments in the past.' });
  }

  const db = dbInstance.getData();

  // Check if date is blocked
  const isBlocked = db.blockedDates.some(b => b.date === finalDate);
  if (isBlocked) {
    return res.status(400).json({ error: 'The clinic is closed on the selected date.' });
  }

  // Double Booking Check for same doctor & time
  const doubleBooked = db.appointments.some(a => {
    const isSameDate = a.appointmentDate === finalDate;
    const isSameTime = a.appointmentTime === finalTime;
    const isNotCanceled = a.status !== 'Canceled';
    const isSameDoctor = (doctorId && a.doctorId === doctorId) || (a.dentistName && a.dentistName.toLowerCase() === finalDentistName.toLowerCase());
    return isSameDate && isSameTime && isNotCanceled && isSameDoctor;
  });

  if (doubleBooked) {
    return res.status(400).json({ error: 'This time slot is already booked for the selected specialist.' });
  }

  const newAppId = generateId();
  const newAppointment = {
    _id: newAppId,
    id: newAppId,
    patientId: req.user!.id,
    patientName: req.user!.name,
    serviceTitle: finalServiceTitle,
    serviceId: serviceId || undefined,
    appointmentDate: finalDate,
    appointmentTime: finalTime,
    dentistName: finalDentistName,
    doctorId: doctorId || undefined,
    status: 'Pending' as AppointmentStatus, // Default status for patient bookings
    autoCanceled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.appointments.push(newAppointment);
  dbInstance.save();

  const formattedApp = {
    id: newAppointment.id,
    patientId: newAppointment.patientId,
    patientName: newAppointment.patientName,
    date: newAppointment.appointmentDate,
    appointmentDate: newAppointment.appointmentDate,
    time: newAppointment.appointmentTime,
    appointmentTime: newAppointment.appointmentTime,
    dentist: newAppointment.dentistName,
    dentistName: newAppointment.dentistName,
    status: newAppointment.status,
    service: newAppointment.serviceTitle,
    serviceTitle: newAppointment.serviceTitle,
    autoCanceled: newAppointment.autoCanceled
  };

  return res.status(201).json({
    appointment: formattedApp
  });
});

// GET /api/appointments/me (Logged-in Patient's Appointments)
app.get('/api/appointments/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = dbInstance.getData();
  const myAppointments = db.appointments
    .filter(a => a.patientId === req.user!.id)
    .map(a => ({
      id: a.id || a._id,
      patientId: a.patientId,
      patientName: a.patientName,
      date: a.appointmentDate,
      appointmentDate: a.appointmentDate,
      time: a.appointmentTime,
      appointmentTime: a.appointmentTime,
      dentist: a.dentistName,
      dentistName: a.dentistName,
      status: a.status,
      service: a.serviceTitle,
      serviceTitle: a.serviceTitle,
      autoCanceled: Boolean(a.autoCanceled)
    }));

  return res.json(myAppointments);
});

// PUT /api/appointments/:id/cancel
app.put('/api/appointments/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = dbInstance.getData();

  const appointment = db.appointments.find(a => a.id === id || a._id === id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  // Only the patient who booked or an admin can cancel
  if (req.user!.role !== 'admin' && appointment.patientId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized to cancel this appointment.' });
  }

  // Check status is Pending or Confirmed
  if (!['Pending', 'Confirmed'].includes(appointment.status) && req.user!.role !== 'admin') {
    return res.status(400).json({ error: 'Only Pending or Confirmed appointments can be canceled.' });
  }

  appointment.status = 'Canceled';
  appointment.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ success: true, message: 'Appointment canceled successfully.' });
});

// ==========================================
// 5. ADMIN ENDPOINTS (Full Control)
// ==========================================

// GET /api/admin/config (Full Admin DB State)
app.get('/api/admin/config', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = dbInstance.getData();

  // Format availability map { "2026-08-05": [1, 2] }
  const availabilityMap: Record<string, string[]> = {};
  (db.availabilities || []).forEach(a => {
    availabilityMap[a.date] = a.doctorIds;
  });

  const formattedAppointments = (db.appointments || []).map(a => {
    const patientUser = (db.users || []).find(u => u.id === a.patientId || u._id === a.patientId);
    return {
      id: a.id || a._id,
      patientId: a.patientId,
      patientName: a.patientName || (patientUser ? patientUser.name : 'Unknown Patient'),
      patientPhone: patientUser ? patientUser.phone : '+251922000100',
      date: a.appointmentDate,
      appointmentDate: a.appointmentDate,
      time: a.appointmentTime,
      appointmentTime: a.appointmentTime,
      dentist: a.dentistName,
      dentistName: a.dentistName,
      status: a.status,
      service: a.serviceTitle,
      serviceTitle: a.serviceTitle,
      autoCanceled: Boolean(a.autoCanceled)
    };
  });

  return res.json({
    services: db.services || [],
    doctors: db.doctors || [],
    appointments: formattedAppointments,
    availability: availabilityMap,
    blockedDates: (db.blockedDates || []).map(b => ({ date: b.date, reason: b.reason || '' })),
    announcement: db.websiteConfig.announcement || '',
    bookingCutoffTime: db.websiteConfig.bookingCutoffTime || '14:00'
  });
});

// GET /api/admin/appointments (View All Appointments)
app.get('/api/admin/appointments', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = dbInstance.getData();
  const allAppointments = (db.appointments || []).map(a => {
    const patientUser = (db.users || []).find(u => u.id === a.patientId || u._id === a.patientId);
    return {
      id: a.id || a._id,
      patientId: a.patientId,
      patientName: a.patientName || (patientUser ? patientUser.name : 'Unknown Patient'),
      patientPhone: patientUser ? patientUser.phone : '+251922000100',
      date: a.appointmentDate,
      appointmentDate: a.appointmentDate,
      time: a.appointmentTime,
      appointmentTime: a.appointmentTime,
      dentist: a.dentistName,
      dentistName: a.dentistName,
      status: a.status,
      service: a.serviceTitle,
      serviceTitle: a.serviceTitle,
      autoCanceled: Boolean(a.autoCanceled)
    };
  });
  return res.json(allAppointments);
});

// POST /api/admin/appointments (Admin Creates Appointment for Patient)
app.post('/api/admin/appointments', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { 
    patientId, 
    patientName, 
    serviceTitle, 
    date, 
    appointmentDate, 
    time, 
    appointmentTime, 
    dentistName, 
    status 
  } = req.body;

  const finalDate = appointmentDate || date;
  const finalTime = appointmentTime || time;

  if (!patientId || !serviceTitle || !finalDate || !finalTime || !dentistName) {
    return res.status(400).json({ error: 'patientId, serviceTitle, date, time, and dentistName are required.' });
  }

  const validStatuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Arrived', 'No Show', 'Canceled'];
  const finalStatus: AppointmentStatus = status && validStatuses.includes(status) ? status : 'Confirmed';

  const db = dbInstance.getData();
  const patientUser = db.users.find(u => u.id === patientId || u._id === patientId);

  const newAppId = generateId();
  const newAppointment = {
    _id: newAppId,
    id: newAppId,
    patientId,
    patientName: patientName || (patientUser ? patientUser.name : 'Patient'),
    serviceTitle,
    appointmentDate: finalDate,
    appointmentTime: finalTime,
    dentistName,
    status: finalStatus,
    autoCanceled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.appointments.push(newAppointment);
  dbInstance.save();

  const formattedApp = {
    id: newAppointment.id,
    patientId: newAppointment.patientId,
    patientName: newAppointment.patientName,
    date: newAppointment.appointmentDate,
    time: newAppointment.appointmentTime,
    dentist: newAppointment.dentistName,
    status: newAppointment.status,
    service: newAppointment.serviceTitle,
    autoCanceled: newAppointment.autoCanceled
  };

  return res.status(201).json({ appointment: formattedApp });
});

// PUT /api/admin/appointments/:id/status (Update Appointment Status)
app.put('/api/admin/appointments/:id/status', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Arrived', 'No Show', 'Canceled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }

  const db = dbInstance.getData();
  const appointment = db.appointments.find(a => a.id === id || a._id === id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  appointment.status = status;
  appointment.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ success: true, message: 'Appointment status updated.', appointment });
});

// --- SERVICES ADMIN MANAGEMENT ---

// POST /api/admin/services
app.post('/api/admin/services', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { title, name, category, description, duration, price, promotionActive, promotionDetails, discountPercent, discountAmount } = req.body;

  const finalTitle = title || name;

  if (!finalTitle || price === undefined) {
    return res.status(400).json({ error: 'Service title and price are required.' });
  }

  const db = dbInstance.getData();
  const existing = db.services.find(s => s.title.toLowerCase() === finalTitle.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A service with this title already exists.' });
  }

  const newId = generateId();
  const newService = {
    _id: newId,
    id: newId,
    category: category || 'preventive',
    title: finalTitle,
    description: description || '',
    duration: duration || '45 mins',
    price: Number(price) || price,
    promotionActive: Boolean(promotionActive),
    promotionDetails: promotionDetails || '',
    discountPercent: discountPercent || '0%',
    discountAmount: discountAmount || '$0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.services.push(newService);
  dbInstance.save();

  return res.status(201).json({ service: newService });
});

// PUT /api/admin/services/:title (Update by title or ID)
app.put('/api/admin/services/:title', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const identifier = decodeURIComponent(req.params.title);
  const db = dbInstance.getData();

  const service = db.services.find(s => s.id === identifier || s._id === identifier || s.title.toLowerCase() === identifier.toLowerCase());

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

  return res.json({ service });
});

// DELETE /api/admin/services/:title
app.delete('/api/admin/services/:title', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const identifier = decodeURIComponent(req.params.title);
  const db = dbInstance.getData();

  const index = db.services.findIndex(s => s.id === identifier || s._id === identifier || s.title.toLowerCase() === identifier.toLowerCase());

  if (index === -1) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  db.services.splice(index, 1);
  dbInstance.save();

  return res.json({ success: true });
});

// --- DOCTORS ADMIN MANAGEMENT ---

// POST /api/admin/doctors
app.post('/api/admin/doctors', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, title, bio, imageUrl, isFeatured } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Doctor name is required.' });
  }

  const db = dbInstance.getData();

  // Enforce MAX 3 FEATURED DOCTORS RULE
  if (isFeatured) {
    const featuredCount = db.doctors.filter(d => d.isFeatured).length;
    if (featuredCount >= 3) {
      return res.status(400).json({ error: 'Maximum of 3 featured doctors allowed' });
    }
  }

  const newId = generateId();
  const newDoctor = {
    _id: newId,
    id: newId,
    name,
    title: title || 'Specialist Doctor',
    bio: bio || '',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    isFeatured: Boolean(isFeatured),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.doctors.push(newDoctor);
  dbInstance.save();

  return res.status(201).json({ doctor: newDoctor });
});

// PUT /api/admin/doctors/:id
app.put('/api/admin/doctors/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = dbInstance.getData();

  const doctor = db.doctors.find(d => d.id === id || d._id === id);

  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  const { name, title, bio, imageUrl, isFeatured } = req.body;

  // Enforce MAX 3 FEATURED DOCTORS RULE if isFeatured is being set to true
  if (isFeatured && !doctor.isFeatured) {
    const otherFeaturedCount = db.doctors.filter(d => d.isFeatured && d.id !== doctor.id && d._id !== doctor._id).length;
    if (otherFeaturedCount >= 3) {
      return res.status(400).json({ error: 'Maximum of 3 featured doctors allowed' });
    }
  }

  if (name) doctor.name = name;
  if (title) doctor.title = title;
  if (bio !== undefined) doctor.bio = bio;
  if (imageUrl !== undefined) doctor.imageUrl = imageUrl;
  if (isFeatured !== undefined) doctor.isFeatured = Boolean(isFeatured);

  doctor.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ doctor });
});

// PUT /api/admin/doctors/:id/feature (Toggle or Set Featured status with max 3 rule)
app.put('/api/admin/doctors/:id/feature', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = dbInstance.getData();

  const doctor = db.doctors.find(d => d.id === id || d._id === id);

  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // If currently not featured and trying to feature it
  if (!doctor.isFeatured) {
    const currentlyFeatured = db.doctors.filter(d => d.isFeatured && d.id !== doctor.id && d._id !== doctor._id).length;
    if (currentlyFeatured >= 3) {
      return res.status(400).json({ error: 'Maximum of 3 featured doctors allowed' });
    }
    doctor.isFeatured = true;
  } else {
    doctor.isFeatured = false;
  }

  doctor.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ doctor });
});

// DELETE /api/admin/doctors/:id
app.delete('/api/admin/doctors/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = dbInstance.getData();

  const index = db.doctors.findIndex(d => d.id === id || d._id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  db.doctors.splice(index, 1);
  dbInstance.save();

  return res.json({ success: true });
});

// --- AVAILABILITY & BLOCKED DATES ADMIN ---

// PUT /api/admin/availability
app.put('/api/admin/availability', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { date, doctorIds } = req.body;

  if (!date || !Array.isArray(doctorIds)) {
    return res.status(400).json({ error: 'Date and doctorIds array are required.' });
  }

  const db = dbInstance.getData();
  let availability = db.availabilities.find(a => a.date === date);

  if (availability) {
    availability.doctorIds = doctorIds;
    availability.updatedAt = new Date().toISOString();
  } else {
    const newId = generateId();
    availability = {
      _id: newId,
      id: newId,
      date,
      doctorIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.availabilities.push(availability);
  }

  dbInstance.save();
  return res.json({ success: true });
});

// DELETE /api/admin/availability/:date
app.delete('/api/admin/availability/:date', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { date } = req.params;
  const db = dbInstance.getData();

  const index = db.availabilities.findIndex(a => a.date === date);

  if (index !== -1) {
    db.availabilities.splice(index, 1);
    dbInstance.save();
  }

  return res.json({ success: true });
});

// POST /api/admin/blocked-dates
app.post('/api/admin/blocked-dates', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { date, reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  const db = dbInstance.getData();
  const existing = db.blockedDates.find(b => b.date === date);

  if (existing) {
    existing.reason = reason || existing.reason;
  } else {
    const newId = generateId();
    db.blockedDates.push({
      _id: newId,
      id: newId,
      date,
      reason: reason || 'Clinic Closed'
    });
  }

  dbInstance.save();
  return res.json({ success: true });
});

// DELETE /api/admin/blocked-dates/:date
app.delete('/api/admin/blocked-dates/:date', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { date } = req.params;
  const db = dbInstance.getData();

  const index = db.blockedDates.findIndex(b => b.date === date);

  if (index !== -1) {
    db.blockedDates.splice(index, 1);
    dbInstance.save();
  }

  return res.json({ success: true });
});

// PUT /api/admin/announcement
app.put('/api/admin/announcement', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  const db = dbInstance.getData();

  db.websiteConfig.announcement = text || '';
  dbInstance.save();

  return res.json({ success: true });
});

// PUT /api/admin/cutoff
app.put('/api/admin/cutoff', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { time } = req.body;
  const db = dbInstance.getData();

  db.websiteConfig.bookingCutoffTime = time || '14:00';
  dbInstance.save();

  return res.json({ success: true });
});

// ==========================================
// 6. VITE FRONTEND / SPA FALLBACK
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dental Clinic REST API Server running on http://localhost:${PORT}`);
  });
}

startServer();

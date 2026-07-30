import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  _id: string;
  id: string;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: 'patient' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  id: string;
  category: string;
  title: string;
  description: string;
  duration: string;
  price: string | number;
  promotionActive: boolean;
  promotionDetails?: string;
  discountPercent?: string | number;
  discountAmount?: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  _id: string;
  id: string;
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Availability {
  _id: string;
  id: string;
  date: string; // YYYY-MM-DD
  doctorIds: string[]; // Doctor IDs
  createdAt: string;
  updatedAt: string;
}

export interface BlockedDate {
  _id: string;
  id: string;
  date: string; // YYYY-MM-DD
  reason?: string;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Arrived' | 'No Show' | 'Canceled';

export interface Appointment {
  _id: string;
  id: string;
  patientId: string;
  patientName: string;
  serviceTitle: string;
  serviceId?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // "10:00 AM", etc.
  dentistName: string;
  doctorId?: string;
  status: AppointmentStatus;
  autoCanceled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteConfig {
  announcement: string;
  bookingCutoffTime: string; // e.g. "14:00"
}

export interface DatabaseSchema {
  users: User[];
  services: Service[];
  doctors: Doctor[];
  availabilities: Availability[];
  blockedDates: BlockedDate[];
  appointments: Appointment[];
  websiteConfig: WebsiteConfig;
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getInitialData(): DatabaseSchema {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const patientHash = bcrypt.hashSync('password123', 10);

  const defaultDoctors: Doctor[] = [
    {
      _id: 'doc1',
      id: 'doc1',
      name: 'Dr. Selamawit Moges',
      title: 'DDS Cosmetic & Restorative Specialist',
      bio: 'Over 12 years of clinical excellence specializing in digital smile design, veneers, and full mouth rehabilitations.',
      imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
      isFeatured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'doc2',
      id: 'doc2',
      name: 'Dr. Marcus Vance',
      title: 'Orthodontics & Clear Aligner Specialist',
      bio: 'Certified Invisalign provider focusing on non-invasive bite corrections and aesthetic aligners for teens and adults.',
      imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
      isFeatured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'doc3',
      id: 'doc3',
      name: 'Dr. Elena Rostova',
      title: 'Pediatric & Family Hygiene Expert',
      bio: 'Compassionate pediatric dental care establishing lifelong healthy habits with fun, stress-free clinical visits.',
      imageUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=400',
      isFeatured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultServices: Service[] = [
    {
      _id: 'srv1',
      id: 'srv1',
      category: 'preventive',
      title: 'Preventative Cleaning & Exam',
      description: 'Comprehensive dental hygiene appointment including ultrasonic scaling, polishing, flossing, and oral cancer screening.',
      duration: '45 mins',
      price: '1500 ETB',
      promotionActive: false,
      promotionDetails: '',
      discountPercent: '',
      discountAmount: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'srv2',
      id: 'srv2',
      category: 'cosmetic',
      title: 'Professional Teeth Whitening',
      description: 'Advanced laser-activated in-office teeth whitening that brightens your smile up to 8 shades in a single safe 1-hour session.',
      duration: '60 mins',
      price: '3500 ETB',
      promotionActive: true,
      promotionDetails: '20% Off Summer Special for New Patients',
      discountPercent: '20%',
      discountAmount: '700 ETB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'srv3',
      id: 'srv3',
      category: 'cosmetic',
      title: 'Clear Aligners Consultation',
      description: 'Comprehensive 3D digital scan and alignment plan for Invisalign and invisible aligners.',
      duration: '30 mins',
      price: '2000 ETB',
      promotionActive: true,
      promotionDetails: 'Free 3D Scan Included',
      discountPercent: '15%',
      discountAmount: '300 ETB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'srv4',
      id: 'srv4',
      category: 'restorative',
      title: 'Root Canal Therapy',
      description: 'Micro-dentistry therapy designed to eliminate infection, relieve pain, and preserve your natural tooth.',
      duration: '90 mins',
      price: '6000 ETB',
      promotionActive: false,
      promotionDetails: '',
      discountPercent: '',
      discountAmount: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Generate availability for the next 30 days
  const defaultAvailabilities: Availability[] = [];
  const start = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Skip Sundays
    if (d.getDay() !== 0) {
      let docIds: string[] = ['doc1', 'doc2', 'doc3'];
      defaultAvailabilities.push({
        _id: 'av_' + dateStr,
        id: 'av_' + dateStr,
        date: dateStr,
        doctorIds: docIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  const defaultBlockedDates: BlockedDate[] = [
    {
      _id: 'blk1',
      id: 'blk1',
      date: '2026-12-25',
      reason: 'Christmas Holiday Closure'
    }
  ];

  const defaultUsers: User[] = [
    {
      _id: 'usr1',
      id: 'usr1',
      name: 'Admin User',
      email: 'admin@clinic.com',
      phone: '+251911000000',
      passwordHash: adminHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'usr2',
      id: 'usr2',
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '+251922000000',
      passwordHash: patientHash,
      role: 'patient',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultAppointments: Appointment[] = [
    {
      _id: 'app1',
      id: 'app1',
      patientId: 'usr2',
      patientName: 'Jane Doe',
      serviceTitle: 'Teeth Cleaning & Oral Checkup',
      serviceId: 'srv1',
      appointmentDate: '2026-08-05',
      appointmentTime: '10:00 AM',
      dentistName: 'Dr. Selamawit Moges',
      doctorId: 'doc1',
      status: 'Confirmed',
      autoCanceled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return {
    users: defaultUsers,
    services: defaultServices,
    doctors: defaultDoctors,
    availabilities: defaultAvailabilities,
    blockedDates: defaultBlockedDates,
    appointments: defaultAppointments,
    websiteConfig: {
      announcement: '✨ Summer Promotion: 20% Off In-Office Teeth Whitening sessions this month!',
      bookingCutoffTime: '14:00'
    }
  };
}

class Database {
  private data: DatabaseSchema | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(fileContent);
        this.migrateIfNeeded();
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (error) {
      console.error('Error reading/initializing database, creating clean file', error);
      this.data = getInitialData();
      this.save();
    }
  }

  private migrateIfNeeded() {
    if (!this.data) return;
    let modified = false;

    // Ensure users have phone numbers
    this.data.users = (this.data.users || []).map((u: any, idx: number) => ({
      _id: u._id || u.id || generateId(),
      id: u.id || u._id || generateId(),
      name: u.name || 'User',
      email: u.email || undefined,
      phone: u.phone || (u.role === 'admin' ? '+251911000000' : `+251922000${100 + idx}`),
      passwordHash: u.passwordHash,
      role: u.role || 'patient',
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString()
    }));

    // Ensure all services have title, category, etc.
    this.data.services = (this.data.services || []).map((s: any) => {
      const title = s.title || s.name || 'Dental Service';
      const category = s.category || 'preventive';
      const duration = s.duration || '45 mins';
      let priceVal = s.price;
      if (typeof priceVal === 'number') {
        priceVal = `${priceVal} ETB`;
      } else if (!priceVal) {
        priceVal = '1500 ETB';
      }
      return {
        _id: s._id || s.id || generateId(),
        id: s.id || s._id || generateId(),
        category,
        title,
        description: s.description || '',
        duration,
        price: priceVal,
        promotionActive: Boolean(s.promotionActive),
        promotionDetails: s.promotionDetails || '',
        discountPercent: s.discountPercent ? String(s.discountPercent) : '',
        discountAmount: s.discountAmount ? String(s.discountAmount) : '',
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString()
      };
    });

    // Ensure doctors have id field
    this.data.doctors = this.data.doctors.map((d: any) => ({
      _id: d._id || d.id || generateId(),
      id: d.id || d._id || generateId(),
      name: d.name || '',
      title: d.title || '',
      bio: d.bio || '',
      imageUrl: d.imageUrl || '',
      isFeatured: Boolean(d.isFeatured),
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString()
    }));

    // Ensure appointments have serviceTitle, dentistName, appointmentDate, appointmentTime, status, autoCanceled
    this.data.appointments = this.data.appointments.map((a: any) => ({
      _id: a._id || a.id || generateId(),
      id: a.id || a._id || generateId(),
      patientId: a.patientId || 'usr2',
      patientName: a.patientName || 'Patient',
      serviceTitle: a.serviceTitle || a.serviceName || 'Dental Cleaning',
      serviceId: a.serviceId,
      appointmentDate: a.appointmentDate || a.date || '2026-08-01',
      appointmentTime: a.appointmentTime || a.time || '10:00 AM',
      dentistName: a.dentistName || a.doctorName || 'Dr. Selamawit Moges',
      doctorId: a.doctorId,
      status: (['Pending', 'Confirmed', 'Completed', 'Arrived', 'No Show', 'Canceled'].includes(a.status) ? a.status : 'Confirmed') as AppointmentStatus,
      autoCanceled: Boolean(a.autoCanceled),
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || new Date().toISOString()
    }));

    // Enforce max 3 featured doctors rule
    const featuredDocs = this.data.doctors.filter(d => d.isFeatured);
    if (featuredDocs.length > 3) {
      featuredDocs.slice(3).forEach(d => {
        d.isFeatured = false;
      });
      modified = true;
    }

    this.save();
  }

  public save() {
    if (!this.data) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write db file:', err);
    }
  }

  public getData(): DatabaseSchema {
    if (!this.data) {
      this.init();
    }
    return this.data!;
  }
}

export const dbInstance = new Database();

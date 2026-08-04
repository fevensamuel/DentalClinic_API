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

type IdPrefix = 'usr' | 'doc' | 'srv' | 'app' | 'av' | 'blk';

const idCounters: Record<IdPrefix, number> = {
  usr: 0,
  doc: 0,
  srv: 0,
  app: 0,
  av: 0,
  blk: 0
};

function normalizePrefix(prefix?: string): IdPrefix {
  const normalizedPrefix = (prefix || 'usr').toLowerCase();

  switch (normalizedPrefix) {
    case 'user':
    case 'users':
    case 'patient':
    case 'patients':
      return 'usr';
    case 'doctor':
    case 'doctors':
      return 'doc';
    case 'service':
    case 'services':
      return 'srv';
    case 'appointment':
    case 'appointments':
      return 'app';
    case 'availability':
    case 'availabilities':
      return 'av';
    case 'blockeddate':
    case 'blockeddates':
    case 'blocked':
    case 'block':
      return 'blk';
    default:
      return normalizedPrefix as IdPrefix;
  }
}

export function generateId(prefix?: string): string {
  const normalizedPrefix = normalizePrefix(prefix);
  idCounters[normalizedPrefix] = (idCounters[normalizedPrefix] || 0) + 1;
  return `${normalizedPrefix}${idCounters[normalizedPrefix]}`;
}

export function syncIdCounters(data: Partial<DatabaseSchema>) {
  const collections: Array<[keyof DatabaseSchema, IdPrefix]> = [
    ['users', 'usr'],
    ['services', 'srv'],
    ['doctors', 'doc'],
    ['appointments', 'app'],
    ['availabilities', 'av'],
    ['blockedDates', 'blk']
  ];

  collections.forEach(([collectionKey, prefix]) => {
    const items = (data[collectionKey] as Array<{ id?: string; _id?: string }> | undefined) || [];
    const maxNumber = items.reduce((max, item) => {
      const match = (item.id || item._id || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
      if (!match) return max;
      return Math.max(max, parseInt(match[1], 10));
    }, 0);

    if (maxNumber > (idCounters[prefix] || 0)) {
      idCounters[prefix] = maxNumber;
    }
  });
}

function assignSequentialIds<T extends { id?: string; _id?: string }>(items: T[], prefix: IdPrefix): T[] {
  const usedNumbers = new Set<number>();

  items.forEach((item) => {
    const match = (item.id || item._id || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (match) {
      usedNumbers.add(Number(match[1]));
    }
  });

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;

  return items.map((item) => {
    const match = (item.id || item._id || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (match) {
      const normalizedId = `${prefix}${match[1]}`;
      item._id = normalizedId;
      item.id = normalizedId;
      return item;
    }

    const assignedId = `${prefix}${nextNumber}`;
    usedNumbers.add(nextNumber);
    nextNumber += 1;
    item._id = assignedId;
    item.id = assignedId;
    return item;
  });
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
      imageUrl: '',
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
      imageUrl: '',
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
      imageUrl: '',
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
      const docIds: string[] = ['doc1', 'doc2', 'doc3'];
      const availabilityId = generateId('av');
      defaultAvailabilities.push({
        _id: availabilityId,
        id: availabilityId,
        date: dateStr,
        doctorIds: docIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  const blockedDateId = generateId('blk');
  const defaultBlockedDates: BlockedDate[] = [
    {
      _id: blockedDateId,
      id: blockedDateId,
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
        syncIdCounters(this.data);
        this.migrateIfNeeded();
      } else {
        this.data = getInitialData();
        syncIdCounters(this.data);
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

    const userCandidates = (this.data.users || []).map((u: any, idx: number) => ({
      ...u,
      name: u.name || 'User',
      email: u.email || undefined,
      phone: u.phone || (u.role === 'admin' ? '+251911000000' : `+251922000${100 + idx}`),
      passwordHash: u.passwordHash,
      role: u.role || 'patient',
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString()
    }));
    const previousUserIds = userCandidates.map((u: any) => u.id || u._id || '');
    const normalizedUsers = assignSequentialIds(userCandidates, 'usr');
    const userIdMap = new Map<string, string>();
    previousUserIds.forEach((previousId, index) => {
      const newId = normalizedUsers[index]?.id || normalizedUsers[index]?._id || '';
      if (previousId && previousId !== newId) {
        userIdMap.set(previousId, newId);
      }
    });
    this.data.users = normalizedUsers;

    const serviceCandidates = (this.data.services || []).map((s: any) => {
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
        ...s,
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
    const previousServiceIds = serviceCandidates.map((s: any) => s.id || s._id || '');
    const normalizedServices = assignSequentialIds(serviceCandidates, 'srv');
    const serviceIdMap = new Map<string, string>();
    previousServiceIds.forEach((previousId, index) => {
      const newId = normalizedServices[index]?.id || normalizedServices[index]?._id || '';
      if (previousId && previousId !== newId) {
        serviceIdMap.set(previousId, newId);
      }
    });
    this.data.services = normalizedServices;

    const doctorCandidates = this.data.doctors.map((d: any) => ({
      ...d,
      name: d.name || '',
      title: d.title || '',
      bio: d.bio || '',
      imageUrl: d.imageUrl || '',
      isFeatured: Boolean(d.isFeatured),
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString()
    }));
    const previousDoctorIds = doctorCandidates.map((d: any) => d.id || d._id || '');
    const normalizedDoctors = assignSequentialIds(doctorCandidates, 'doc');
    const doctorIdMap = new Map<string, string>();
    previousDoctorIds.forEach((previousId, index) => {
      const newId = normalizedDoctors[index]?.id || normalizedDoctors[index]?._id || '';
      if (previousId && previousId !== newId) {
        doctorIdMap.set(previousId, newId);
      }
    });
    this.data.doctors = normalizedDoctors;

    const appointmentCandidates = this.data.appointments.map((a: any) => ({
      ...a,
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
    const normalizedAppointments = assignSequentialIds(appointmentCandidates, 'app');
    normalizedAppointments.forEach((appointment: any) => {
      if (appointment.patientId && userIdMap.has(appointment.patientId)) {
        appointment.patientId = userIdMap.get(appointment.patientId)!;
      }
      if (appointment.serviceId && serviceIdMap.has(appointment.serviceId)) {
        appointment.serviceId = serviceIdMap.get(appointment.serviceId)!;
      }
      if (appointment.doctorId && doctorIdMap.has(appointment.doctorId)) {
        appointment.doctorId = doctorIdMap.get(appointment.doctorId)!;
      }
    });
    this.data.appointments = normalizedAppointments;

    const availabilityCandidates = (this.data.availabilities || []).map((a: any) => ({
      ...a,
      date: a.date || '',
      doctorIds: a.doctorIds || [],
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || new Date().toISOString()
    }));
    const normalizedAvailabilities = assignSequentialIds(availabilityCandidates, 'av');
    normalizedAvailabilities.forEach((availability: any) => {
      availability.doctorIds = (availability.doctorIds || []).map((doctorId: string) => {
        return doctorIdMap.has(doctorId) ? doctorIdMap.get(doctorId)! : doctorId;
      });
    });
    this.data.availabilities = normalizedAvailabilities;

    const blockedDateCandidates = (this.data.blockedDates || []).map((b: any) => ({
      ...b,
      date: b.date || '',
      reason: b.reason || 'Clinic Closed'
    }));
    this.data.blockedDates = assignSequentialIds(blockedDateCandidates, 'blk');

    syncIdCounters(this.data);

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

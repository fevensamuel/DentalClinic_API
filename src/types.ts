export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'admin';
}

export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  promotionActive: boolean;
  promotionDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  _id: string;
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
  date: string;
  doctorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockedDate {
  _id: string;
  date: string;
  reason?: string;
}

export interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  serviceId: string;
  serviceName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteConfig {
  announcement: string;
  bookingCutoffTime: string;
}

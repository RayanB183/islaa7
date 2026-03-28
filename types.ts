export enum Language {
  ENGLISH = 'en',
  ARABIC = 'ar',
  RUSSIAN = 'ru',
  HINDI = 'hi'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum UserRole {
  CITIZEN = 'CITIZEN',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN'
}

export enum RepairStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED'
}

export enum RepairCategory {
  APPLIANCE = 'APPLIANCE',
  FURNITURE = 'FURNITURE',
  GARMENT = 'GARMENT',
  HOUSEHOLD = 'HOUSEHOLD',
  ELECTRONICS = 'ELECTRONICS',
  KITCHENWARE = 'KITCHENWARE',
  OTHER = 'OTHER'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export interface User {
  id: string;
  name: string;
  emirate: string;
  address?: string;
  role: UserRole;
  points: number;
  repairsCount: number;
  status: 'ACTIVE' | 'SUSPENDED';
  verificationStatus?: VerificationStatus; // Added field
  avatarUrl?: string;
  email?: string;
  phone?: string;
  emiratesId?: string;
}

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
}

export interface RepairRequest {
  id: string;
  userId: string;
  userName: string;
  itemName: string;
  category: RepairCategory;
  description: string;
  photoUrl: string | null;
  status: RepairStatus;
  dateCreated: string;
  scheduledDate: string;
  technicianId?: string;
  technicianName?: string;
  outcomeNotes?: string;
  address?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: RepairCategory[];
  verificationStatus: VerificationStatus;
  rating: number;
  activeJobs: number;
  completedJobs: number;
  joinDate: string;
  emiratesId: string;
}

export interface DisposalRequest {
  id: string;
  userId: string;
  userName: string;
  itemId: string;
  itemDescription: string;
  reason: string;
  status: 'PENDING' | 'APPROVED_PERMISSION_SLIP' | 'REJECTED';
  date: string;
}

export interface Violation {
  id: string;
  userId: string;
  userName: string;
  type: string; // e.g., "Illegal Disposal", "No Permission Slip"
  fineAmount: number;
  date: string;
  status: 'UNPAID' | 'PAID';
}

export interface TranslationDictionary {
  [key: string]: {
    [key in Language]: string;
  };
}
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import { AnimatedCharactersSidebar } from '@/components/ui/animated-characters';
import { Language, User, UserRole, Theme, AccessibilitySettings, VerificationStatus, RepairStatus, RepairCategory, RepairRequest } from './types';
import { TRANSLATIONS, APP_LOGO_URL } from './constants';
import { db } from './services/mockDatabase';
import { supabase } from './services/supabase';
import { 
  HomeIcon, 
  WrenchScrewdriverIcon, 
  ClipboardDocumentListIcon, 
  GiftIcon, 
  UserIcon, 
  ChartBarIcon, 
  GlobeAltIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  PhotoIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  UsersIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
  EyeIcon,
  PencilSquareIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon,
  PlayIcon,
  HandRaisedIcon,
  ScaleIcon,
  ArrowPathIcon,
  LightBulbIcon,
  TicketIcon,
  ShoppingBagIcon,
  TagIcon,
  ArrowUpTrayIcon,
  EnvelopeIcon,
  LockClosedIcon,
  BriefcaseIcon as BriefcaseOutline,
  PhoneIcon,
  DocumentDuplicateIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

// --- Global Context ---
interface AppContextType {
  user: User | null;
  language: Language;
  theme: Theme;
  accessibility: AccessibilitySettings;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  login: (role: UserRole) => void;
  loginByEmail: (email: string, password?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  logout: () => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | null>(null);

// --- Utilities for Formatting and AI ---

// GROQ_API_KEY is intentionally absent here — it lives server-side only.
// The validateWithAI function calls /api/validate-spam (a Vercel serverless function)
// which holds the key in process.env and never exposes it to the browser.
const UAE_PASS_LOGO = "https://i.postimg.cc/d0BQ6FdX/uaepasslogogreen-removebg-preview.png";

// Format: 784-1234-1234567-1
const formatEmiratesID = (value: string) => {
  // 1. Clean input: only keep digits
  const digits = value.replace(/\D/g, '').slice(0, 15);
  
  // 2. Build with dashes
  let res = "";
  if (digits.length > 0) res += digits.slice(0, 3);
  if (digits.length > 3) res += "-" + digits.slice(3, 7);
  if (digits.length > 7) res += "-" + digits.slice(7, 14);
  if (digits.length > 14) res += "-" + digits.slice(14, 15);
  
  return res;
};

// Format: +971 50 123 4567
const formatUAEPhone = (value: string) => {
  // 1. Clean input: only keep digits
  let digits = value.replace(/\D/g, '');

  // 2. Handle 971 prefix duplication (if user pastes it)
  if (digits.startsWith('971')) {
    digits = digits.slice(3);
  }

  // 3. Limit length to 9 digits (standard UAE mobile/landline without country code)
  digits = digits.slice(0, 9);

  // 4. Return formatted string
  if (digits.length === 0) return "+971 ";
  
  // Format as +971 XX XXX XXXX
  let formatted = "+971 ";
  if (digits.length > 0) formatted += digits.slice(0, 2);
  if (digits.length > 2) formatted += " " + digits.slice(2, 5);
  if (digits.length > 5) formatted += " " + digits.slice(5, 9);
  
  return formatted;
};

// Simple regex check for obvious spam to save API calls
const isObviousSpam = (text: string) => {
    const lower = text.toLowerCase();
    // Repeated characters (e.g., "aaaaa")
    if (/(.)\1{4,}/.test(lower)) return true;
    // Keyboard rows
    if (lower.includes('qwerty') || lower.includes('asdfgh') || lower.includes('zxcvbn')) return true;
    if (lower.includes('12345') || lower.includes('09876')) return true;
    return false;
};

const validateWithAI = async (name: string, email: string): Promise<boolean> => {
  // 1. Local pre-check — catches obvious spam without a network call
  if (isObviousSpam(name) || isObviousSpam(email)) {
    console.warn("Spam detected by local regex");
    return true;
  }

  try {
    // 2. Call the server-side proxy — the Groq API key NEVER reaches the browser.
    //    In dev: run `vercel dev` so /api/* routes are served locally.
    //    In prod: Vercel automatically routes /api/* to the serverless function.
    const response = await fetch("/api/validate-spam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (!response.ok) {
      console.error(`Spam API error (${response.status})`);
      return false; // Fail open — don't block users on service errors
    }

    const data = await response.json();
    console.log("AI Validation Result:", data.isSpam);
    return data.isSpam ?? false;

  } catch (error) {
    console.error("AI Validation Exception:", error);
    return false; // Fail open on network errors
  }
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

// --- Components ---

const LanguageSwitcher = () => {
  const { language, setLanguage } = useApp();
  
  const languages = [
    { code: Language.ENGLISH, label: 'EN' },
    { code: Language.ARABIC, label: 'عربي' },
    { code: Language.RUSSIAN, label: 'RU' },
    { code: Language.HINDI, label: 'HI' },
  ];

  return (
    <div className="flex gap-2">
      {languages.map(l => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${
            language === l.code 
              ? 'bg-uae-gold text-white shadow-md' 
              : 'bg-white text-gray-600 hover:bg-yellow-50 border border-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

const NavBar = () => {
  const { user, logout, t, language, setLanguage, theme, setTheme } = useApp();
  const navigate = useNavigate();
  const isRTL = language === Language.ARABIC;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const languages = [
    { code: Language.ENGLISH, label: 'EN' },
    { code: Language.ARABIC, label: 'عربي' },
    { code: Language.RUSSIAN, label: 'RU' },
    { code: Language.HINDI, label: 'HI' },
  ];

  const roleLabels: Record<string, string> = {
    [UserRole.CITIZEN]: 'Citizen',
    [UserRole.TECHNICIAN]: 'Technician',
    [UserRole.ADMIN]: 'Admin',
  };

  const roleBadgeColors: Record<string, string> = {
    [UserRole.CITIZEN]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    [UserRole.TECHNICIAN]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    [UserRole.ADMIN]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <nav className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-200/80 dark:border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer hidden md:flex items-center gap-1" title="Back to landing page">
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold tracking-wide">Site</span>
            </button>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/home')}>
              <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <span className="text-white font-black text-base leading-none">إ</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight">{t('app_name')}</h1>
                <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase leading-tight">Repair Platform</p>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Points chip — Citizen only */}
            {user?.role === UserRole.CITIZEN && (
              <button
                onClick={() => navigate('/rewards')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-uae-gold/30 bg-uae-gold/8 dark:bg-uae-gold/15 hover:bg-uae-gold/15 dark:hover:bg-uae-gold/20 transition-colors"
              >
                <GiftIcon className="h-3.5 w-3.5 text-uae-gold" />
                <span className="text-sm font-black text-uae-goldDark dark:text-uae-gold">{user.points}</span>
                <span className="text-[10px] text-gray-500 hidden sm:block">pts</span>
              </button>
            )}
            {/* Verified chip — Technician only */}
            {user?.role === UserRole.TECHNICIAN && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-uae-green/30 bg-uae-green/8 dark:bg-uae-green/15">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-uae-green" />
                <span className="text-xs font-bold text-uae-green hidden sm:block">Verified</span>
              </div>
            )}

            {/* Profile dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className={`w-9 h-9 rounded-full gold-gradient flex items-center justify-center text-white font-black text-sm shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-950 ${dropdownOpen ? 'ring-uae-gold' : 'ring-transparent'}`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden z-50 animate-fade-in-up" style={{animationDuration:'0.2s'}}>
                    {/* User info header */}
                    <div className="px-5 py-4 bg-gradient-to-br from-uae-gold/10 to-transparent dark:from-uae-gold/5 border-b border-gray-100 dark:border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full gold-gradient flex items-center justify-center text-white font-black text-base shadow-md flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email || '—'}</p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadgeColors[user.role] || roleBadgeColors[UserRole.CITIZEN]}`}>
                            {roleLabels[user.role] || user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 space-y-0.5">
                      {/* Dark / Light toggle */}
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2.5">
                          {theme === Theme.DARK
                            ? <MoonIcon className="h-4 w-4 text-uae-gold" />
                            : <SunIcon className="h-4 w-4 text-uae-gold" />}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {theme === Theme.DARK ? 'Dark Mode' : 'Light Mode'}
                          </span>
                        </div>
                        {/* Toggle switch */}
                        <button
                          onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${theme === Theme.DARK ? 'bg-uae-gold' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${theme === Theme.DARK ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>
                      </div>

                      {/* Language switcher */}
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <GlobeAltIcon className="h-3 w-3" /> Language
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {languages.map(l => (
                            <button
                              key={l.code}
                              onClick={() => setLanguage(l.code)}
                              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                                language === l.code
                                  ? 'bg-uae-gold text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/8 dark:text-gray-300 dark:hover:bg-white/12'
                              }`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-2" />

                      {/* Settings link */}
                      <button
                        onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Settings</span>
                      </button>

                      {/* Sign out */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group"
                      >
                        <ArrowRightOnRectangleIcon className={`h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors ${isRTL ? 'rotate-180' : ''}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">{t('logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

// --- Pages ---

const AdminDashboard = () => {
  const stats = db.getStats();
  const allRepairs = db.getAllRepairs();
  const [pendingTechs, setPendingTechs] = useState(
    db.getAllTechnicians().filter(t => t.verificationStatus === VerificationStatus.PENDING)
  );
  
  // Email Popup State
  const [emailState, setEmailState] = useState<{ isOpen: boolean; email: string; name: string; isApprove: boolean } | null>(null);

  const handleVerify = (id: string, approved: boolean) => {
    // 1. Get user details for email
    const allUsers = db.getAllUsers();
    const techUser = allUsers.find(u => u.id === id);
    const techEmail = techUser?.email || "candidate@email.com";
    const techName = techUser?.name || "Candidate";

    // 2. Perform DB update
    const status = approved ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    db.verifyTechnician(id, status);
    
    // 3. Update UI list
    setPendingTechs(db.getAllTechnicians().filter(t => t.verificationStatus === VerificationStatus.PENDING));

    // 4. Show Email Popup
    setEmailState({
        isOpen: true,
        email: techEmail,
        name: techName,
        isApprove: approved
    });
  };

  const getEmailContent = () => {
      if (!emailState) return "";
      
      if (emailState.isApprove) {
          return `Dear ${emailState.name},

We are pleased to inform you that you have been successful in your application for the position of Technician at ISLAA7.

After reviewing your application, we believe your skills and experience align well with what we are looking for, and we are excited about the possibility of you joining our team.

Our team will be in touch shortly with the next steps, including details regarding the offer, onboarding process, and start date. Should you have any questions in the meantime, please feel free to reach out.

Congratulations, and we look forward to working with you.

Kind regards,
ISLAA7 Admin Team
ISLAA7`;
      } else {
          return `Dear ${emailState.name},

Thank you for taking the time to apply for the Technician role at ISLAA7. We appreciate your interest and the effort you put into your application.

After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. We had a strong pool of candidates, and this decision was not an easy one.

We encourage you to apply again in the future should a role open that matches your skills and experience. We wish you every success in your job search and future endeavors.

Kind regards,
ISLAA7 Admin Team
ISLAA7`;
      }
  };

  const copyToClipboard = () => {
      const content = getEmailContent();
      navigator.clipboard.writeText(content);
      alert("Email content copied to clipboard!");
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 relative">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers },
          { label: 'Total Repairs', value: stats.totalRepairs },
          { label: 'Technicians', value: stats.activeTechnicians },
          { label: 'Compliance', value: stats.complianceRate },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
             <div className="text-3xl font-bold text-uae-gold">{stat.value}</div>
             <div className="text-xs text-gray-500 uppercase font-bold mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Technician Applications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-[#FFFDF5] dark:bg-gray-900">
           <div className="flex items-center gap-3">
             <ShieldCheckIcon className="h-6 w-6 text-uae-gold" />
             <h3 className="font-bold text-lg text-gray-900 dark:text-white">Pending Technician Approvals</h3>
           </div>
           <span className="bg-uae-gold text-white text-xs font-bold px-3 py-1 rounded-full">
             {pendingTechs.length} Pending
           </span>
        </div>
        
        {pendingTechs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
            <p>No pending applications to review.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingTechs.map(tech => (
              <div key={tech.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300">
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{tech.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                         <span className="font-semibold text-uae-gold">{tech.specialty.join(", ")}</span>
                         <span>•</span>
                         <span>ID: {tech.emiratesId}</span>
                      </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={() => handleVerify(tech.id, false)}
                     className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm flex items-center gap-2"
                   >
                     <XCircleIcon className="h-5 w-5" />
                     Reject
                   </button>
                   <button 
                     onClick={() => handleVerify(tech.id, true)}
                     className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold text-sm flex items-center gap-2 shadow-sm"
                   >
                     <CheckCircleIcon className="h-5 w-5" />
                     Approve Application
                   </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Notification Popup */}
      {emailState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-uae-gold/20 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-[#FFFDF5] dark:bg-gray-900 p-4 border-b border-uae-gold/10 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <EnvelopeIcon className="h-5 w-5 text-uae-gold" />
                          Send Notification Email
                      </h3>
                      <button onClick={() => setEmailState(null)} className="text-gray-400 hover:text-red-500">
                          <XMarkIcon className="h-6 w-6" />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                          <span className="font-bold text-gray-800 dark:text-white">To:</span> 
                          <span className="font-mono text-blue-600 dark:text-blue-400">{emailState.email}</span>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Message Body</label>
                          <textarea 
                              readOnly
                              className="w-full h-64 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-sans text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-uae-gold"
                              value={getEmailContent()}
                          />
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                          <button 
                              onClick={() => setEmailState(null)}
                              className="px-6 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                              Close
                          </button>
                          <button 
                              onClick={copyToClipboard}
                              className="px-6 py-2 rounded-lg bg-uae-gold text-white font-bold hover:bg-uae-goldDark shadow-md flex items-center gap-2"
                          >
                              <ClipboardDocumentListIcon className="h-5 w-5" />
                              Copy to Clipboard
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Repairs List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
           <h3 className="font-bold text-lg text-gray-900 dark:text-white">Recent System Activity</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {allRepairs.map(repair => (
            <div key={repair.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-uae-gold/10 flex items-center justify-center text-uae-gold">
                    <WrenchScrewdriverIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{repair.itemName}</h4>
                    <p className="text-xs text-gray-500">{repair.userName} • {repair.dateCreated}</p>
                  </div>
               </div>
               <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                 {repair.status}
               </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TechnicianDashboard = () => {
    const { user } = useApp();
    const [activeTab, setActiveTab] = useState<'NEW' | 'MY_JOBS'>('NEW');
    
    // Fetch jobs manually
    const [availableJobs, setAvailableJobs] = useState(db.getOpenRepairs([RepairCategory.APPLIANCE, RepairCategory.ELECTRONICS, RepairCategory.FURNITURE, RepairCategory.GARMENT, RepairCategory.HOUSEHOLD, RepairCategory.KITCHENWARE, RepairCategory.OTHER]));
    const [myJobs, setMyJobs] = useState(db.getRepairsByTechnician(user?.id || ''));
    const [ignoredJobIds, setIgnoredJobIds] = useState<string[]>([]);
    
    // State for update status modal
    const [updatingJob, setUpdatingJob] = useState<RepairRequest | null>(null);

    useEffect(() => {
        // Refresh jobs (simulating real-time fetch)
        const interval = setInterval(() => {
             // In a real app we'd fetch from DB based on user specialty. 
             // Here we just grab all open repairs for demo purposes since we don't strictly track tech specialty in the mock context efficiently
             const open = db.getOpenRepairs(Object.values(RepairCategory));
             setAvailableJobs(open);
             setMyJobs(db.getRepairsByTechnician(user?.id || ''));
        }, 2000);
        return () => clearInterval(interval);
    }, [user]);

    const handleAcceptJob = (jobId: string) => {
        if (!user) return;
        try {
            db.acceptRepair(jobId, user.id, user.name);
            // Optimistic update
            const job = availableJobs.find(j => j.id === jobId);
            if (job) {
                setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
                setMyJobs(prev => [...prev, { ...job, status: RepairStatus.ASSIGNED, technicianId: user.id }]);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleDeclineJob = (jobId: string) => {
        setIgnoredJobIds(prev => [...prev, jobId]);
    };

    const completeJob = (status: RepairStatus) => {
        if (!updatingJob) return;
        try {
            db.updateRepairStatus(updatingJob.id, status);
            // Optimistic update
            setMyJobs(prev => prev.map(j => j.id === updatingJob.id ? { ...j, status } : j));
            setUpdatingJob(null);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const displayableAvailableJobs = availableJobs.filter(j => !ignoredJobIds.includes(j.id));

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Technician Portal</h2>
            
            <div className="flex gap-4 mb-6">
                <button 
                   onClick={() => setActiveTab('NEW')}
                   className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-2 border transition-all ${activeTab === 'NEW' ? 'bg-uae-gold text-white border-uae-gold shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700'}`}
                >
                    <BriefcaseOutline className="h-6 w-6" />
                    <span>New Opportunities <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">{displayableAvailableJobs.length}</span></span>
                </button>
                <button 
                   onClick={() => setActiveTab('MY_JOBS')}
                   className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-2 border transition-all ${activeTab === 'MY_JOBS' ? 'bg-uae-gold text-white border-uae-gold shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700'}`}
                >
                    <WrenchScrewdriverIcon className="h-6 w-6" />
                    <span>My Active Jobs <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">{myJobs.filter(j => j.status !== RepairStatus.COMPLETED).length}</span></span>
                </button>
            </div>

            {activeTab === 'NEW' && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <StarIcon className="h-5 w-5 text-uae-gold" />
                        Available Jobs for You
                    </h3>
                    
                    {displayableAvailableJobs.length === 0 ? (
                         <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border border-dashed border-gray-300 dark:border-gray-700">
                             <BriefcaseOutline className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                             <p className="text-gray-500">No new jobs available right now.</p>
                             <p className="text-xs text-gray-400 mt-1">Check back later!</p>
                         </div>
                    ) : (
                        displayableAvailableJobs.map(job => (
                            <div key={job.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase">{job.category}</span>
                                        <span className="text-gray-400 text-xs flex items-center gap-1"><ClockIcon className="h-3 w-3" /> Posted: {job.dateCreated}</span>
                                    </div>
                                    <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{job.itemName}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 mb-3">
                                        "{job.description}"
                                    </p>
                                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                        <span className="flex items-center gap-1"><UserIcon className="h-4 w-4" /> Client: {job.userName}</span>
                                        <span className="flex items-center gap-1"><MapPinIcon className="h-4 w-4" /> Dubai (Standard)</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 justify-center min-w-[140px]">
                                    <button 
                                        onClick={() => handleAcceptJob(job.id)}
                                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckIcon className="h-5 w-5" /> Accept
                                    </button>
                                    <button 
                                        onClick={() => handleDeclineJob(job.id)}
                                        className="w-full py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-red-600 hover:border-red-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XMarkIcon className="h-5 w-5" /> Decline
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'MY_JOBS' && (
                <div className="space-y-4">
                     <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <BriefcaseOutline className="h-5 w-5 text-uae-gold" />
                        Your Active Assignments
                    </h3>
                    {myJobs.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border border-dashed border-gray-300 dark:border-gray-700">
                             <p className="text-gray-500">You haven't accepted any jobs yet.</p>
                             <button onClick={() => setActiveTab('NEW')} className="text-uae-gold font-bold text-sm mt-2 hover:underline">Find Jobs</button>
                         </div>
                    ) : (
                        myJobs.map(job => (
                            <div key={job.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{job.itemName}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${job.status === RepairStatus.COMPLETED ? 'bg-green-100 text-green-700' : job.status === RepairStatus.FAILED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setUpdatingJob(job)}
                                        disabled={job.status === RepairStatus.COMPLETED || job.status === RepairStatus.FAILED}
                                        className="text-sm font-bold text-uae-gold border border-uae-gold px-3 py-1 rounded-lg hover:bg-uae-gold hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Update Status
                                    </button>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase">Customer</span>
                                        <span className="font-bold">{job.userName}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase">Scheduled</span>
                                        <span className="font-bold">{job.scheduledDate}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            
            {/* Status Update Modal */}
            {updatingJob && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-uae-gold/20 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-uae-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <WrenchScrewdriverIcon className="h-8 w-8 text-uae-gold" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Update Job Status</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Select the outcome for <span className="font-bold text-gray-800 dark:text-gray-200">{updatingJob.itemName}</span>
                            </p>
                        </div>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => completeJob(RepairStatus.COMPLETED)}
                                className="w-full py-4 rounded-xl bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold border border-green-200 dark:border-green-800 flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                            >
                                <CheckCircleIcon className="h-6 w-6" />
                                Fixed successfully
                            </button>
                            
                            <button 
                                onClick={() => completeJob(RepairStatus.FAILED)}
                                className="w-full py-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-bold border border-red-200 dark:border-red-800 flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                                <TrashIcon className="h-6 w-6" />
                                Unable to fix and diverting to Islaa7 Landfill
                            </button>
                            
                            <button 
                                onClick={() => setUpdatingJob(null)}
                                className="w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600 dark:hover:text-gray-200 mt-2 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Dashboard = () => {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const repairs = user ? db.getRepairs(user.id) : [];
  const [showLandfillModal, setShowLandfillModal] = useState(false);

  useEffect(() => {
      // Check for failed items that need diversion
      const hasFailedItems = repairs.some(r => r.status === RepairStatus.FAILED);
      if (hasFailedItems) {
          setShowLandfillModal(true);
      }
  }, [repairs]);

  const stats = [
    { label: t('total_requests'), value: repairs.length, icon: WrenchScrewdriverIcon },
    { label: t('active_repairs'), value: repairs.filter(r => r.status !== RepairStatus.COMPLETED && r.status !== RepairStatus.REJECTED).length, icon: ClockIcon },
    { label: t('completed'), value: repairs.filter(r => r.status === RepairStatus.COMPLETED).length, icon: CheckCircleIcon },
    { label: t('points_balance'), value: user?.points || 0, icon: GiftIcon },
  ];

  const sustainabilitySteps = [
    { label: t('refuse'), desc: t('refuse_desc'), icon: HandRaisedIcon },
    { label: t('reduce'), desc: t('reduce_desc'), icon: ScaleIcon },
    { label: t('reuse'), desc: t('reuse_desc'), icon: ArrowPathIcon },
    { label: t('repurpose'), desc: t('repurpose_desc'), icon: LightBulbIcon },
    { label: t('recycle'), desc: t('recycle_desc'), icon: GlobeAltIcon },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusConfig: Record<RepairStatus, { bg: string; text: string; dot: string }> = {
    [RepairStatus.COMPLETED]:  { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-500' },
    [RepairStatus.PENDING]:    { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400',  dot: 'bg-amber-400' },
    [RepairStatus.APPROVED]:   { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500' },
    [RepairStatus.ASSIGNED]:   { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500' },
    [RepairStatus.IN_PROGRESS]:{ bg: 'bg-purple-100 dark:bg-purple-900/30',text: 'text-purple-700 dark:text-purple-400',dot: 'bg-purple-500' },
    [RepairStatus.REJECTED]:   { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400',      dot: 'bg-red-500' },
    [RepairStatus.FAILED]:     { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400',      dot: 'bg-red-500' },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-28">
      {/* Landfill Diversion Modal */}
      {showLandfillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" style={{ animation: 'fadeInUp 0.3s ease both' }}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-red-200/50 dark:border-red-900/50">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <TrashIcon className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Action Required</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              One of your items could not be repaired.{' '}
              <span className="font-bold text-red-500">Please take it to an ISLAA7 drop-off point.</span>
            </p>
            <button onClick={() => setShowLandfillModal(false)} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Greeting banner */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{greeting},</p>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{user?.name?.split(' ')[0]} 👋</h2>
        </div>
        <button
          onClick={() => navigate('/book')}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full gold-gradient text-black font-bold text-sm hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-md"
        >
          <WrenchScrewdriverIcon className="h-4 w-4" />
          New Repair
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.06] flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-uae-gold/10 dark:bg-uae-gold/15 flex items-center justify-center mb-3">
              <stat.icon className="h-5 w-5 text-uae-gold" />
            </div>
            <span className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/book')}
          className="group relative overflow-hidden gold-gradient text-black py-5 rounded-2xl font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center">
            <WrenchScrewdriverIcon className="h-4 w-4" />
          </div>
          <span className="text-base">{t('book_repair')}</span>
        </button>
        <button
          onClick={() => navigate('/rewards')}
          className="group relative overflow-hidden bg-gray-900 dark:bg-white/5 text-white border border-gray-800 dark:border-white/10 py-5 rounded-2xl font-bold shadow-sm hover:bg-gray-800 dark:hover:bg-white/10 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-uae-gold/20 flex items-center justify-center">
            <GiftIcon className="h-4 w-4 text-uae-gold" />
          </div>
          <span className="text-base">{t('browse_rewards')}</span>
        </button>
      </div>

      {/* Recent Requests */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.06]">
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
          <h3 className="text-base font-black text-gray-900 dark:text-white">{t('recent_requests')}</h3>
          <button onClick={() => navigate('/history')} className="text-xs font-bold text-uae-gold hover:brightness-110 transition-all">
            {t('view_all')} →
          </button>
        </div>
        <div className="px-6 pb-6">
          {repairs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <WrenchScrewdriverIcon className="h-7 w-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('no_repairs')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{t('start_repair_hint')}</p>
              <button
                onClick={() => navigate('/book')}
                className="mt-5 px-5 py-2 rounded-full gold-gradient text-black text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Book your first repair
              </button>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {repairs.slice(0, 3).map(repair => {
                const sc = statusConfig[repair.status] || statusConfig[RepairStatus.PENDING];
                return (
                  <div key={repair.id} className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-white/[0.03] rounded-xl border border-gray-100/80 dark:border-white/[0.05] hover:border-uae-gold/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-uae-gold/10 dark:bg-uae-gold/15 flex items-center justify-center flex-shrink-0">
                        <WrenchScrewdriverIcon className="h-4 w-4 text-uae-gold" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{repair.itemName || repair.category}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">{repair.dateCreated}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {repair.status.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5 Rs Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.06] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-uae-green/10 flex items-center justify-center">
            <GlobeAltIcon className="h-4 w-4 text-uae-green" />
          </div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">The 5 Rs of Sustainability</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {sustainabilitySteps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] text-center hover:border-uae-gold/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-uae-gold/10 dark:bg-uae-gold/15 flex items-center justify-center">
                <step.icon className="h-5 w-5 text-uae-gold" />
              </div>
              <h4 className="font-black text-xs text-gray-900 dark:text-white">{step.label}</h4>
              <p className="text-[10px] text-gray-400 leading-tight">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BookRepair = () => {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    itemName: '',
    category: RepairCategory.APPLIANCE,
    description: '',
    photoUrl: null as string | null,
    address: user?.address || '', // Pre-fill with user address if available
    scheduledDate: new Date().toISOString().split('T')[0]
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview using FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setTimeout(() => {
      db.createRepair({
        userId: user.id,
        userName: user.name,
        itemName: formData.itemName,
        category: formData.category,
        description: formData.description,
        photoUrl: formData.photoUrl,
        scheduledDate: formData.scheduledDate,
        address: formData.address // Passed address
      });
      setLoading(false);
      navigate('/history');
    }, 1000);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/home')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 text-uae-gold">
           <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-3xl font-bold text-uae-goldDark dark:text-uae-gold">
          {t('book_repair')}
        </h2>
      </div>

      <div className="bg-[#FFFDF5] dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-uae-gold/20">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('item_name')} *</label>
            <input 
              type="text"
              required
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-uae-gold/50 bg-white"
              placeholder="e.g., Kitchen Blender"
              value={formData.itemName}
              onChange={e => setFormData({...formData, itemName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('category')} *</label>
            <select 
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-uae-gold/50 bg-white"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value as RepairCategory})}
            >
              {Object.values(RepairCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('description')} *</label>
            <textarea 
              required
              rows={4}
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-uae-gold/50 bg-white"
              placeholder="Describe what's broken or needs repair..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* New Address Field */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Collection Address *</label>
            <textarea 
              required
              rows={2}
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-uae-gold/50 bg-white"
              placeholder="Building/Villa Name, Street No, Area"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('upload_photo')}</label>
            
            {/* Hidden File Input for Camera/Gallery Access */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />
            
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-uae-gold/40 bg-white/50 dark:bg-gray-700/50 rounded-xl p-6 text-center hover:bg-uae-gold/5 transition-colors cursor-pointer group relative overflow-hidden"
            >
              {formData.photoUrl ? (
                  <div className="relative">
                      <img src={formData.photoUrl} alt="Preview" className="h-48 w-full object-cover rounded-lg mx-auto shadow-md" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <span className="text-white font-bold flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                              <CameraIcon className="h-5 w-5" /> Retake Photo
                          </span>
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-uae-gold/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <ArrowUpTrayIcon className="h-6 w-6 text-uae-gold" />
                    </div>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Click to take photo or upload</p>
                    <p className="text-[10px] text-gray-400 mt-1">Supports Camera & Files (PNG, JPG)</p>
                  </>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full gold-gradient text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg mt-4"
          >
            {loading ? 'Submitting...' : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
};

const RepairHistory = () => {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | RepairStatus>('ALL');
  const repairs = user ? db.getRepairs(user.id) : [];

  const filteredRepairs = filter === 'ALL' 
    ? repairs 
    : repairs.filter(r => r.status === filter);

  const getStatusColor = (status: RepairStatus) => {
    switch(status) {
      case RepairStatus.COMPLETED: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case RepairStatus.PENDING: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case RepairStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: RepairStatus.PENDING, label: 'Pending' },
    { id: RepairStatus.ASSIGNED, label: 'Assigned' },
    { id: RepairStatus.IN_PROGRESS, label: 'In Progress' },
    { id: RepairStatus.COMPLETED, label: 'Completed' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/home')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 text-uae-gold">
           <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('my_repairs')}
          </h2>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === tab.id 
                  ? 'bg-[#FFFDF5] border border-uae-gold text-uae-goldDark shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRepairs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-400 font-medium">No requests found</p>
          </div>
        ) : (
          filteredRepairs.map(repair => (
            <div key={repair.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-6 transition-all hover:shadow-md">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="font-bold text-xl text-gray-900 dark:text-white">{repair.itemName || repair.category}</h4>
                   <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${getStatusColor(repair.status)}`}>
                    {repair.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-xs font-bold text-uae-gold uppercase tracking-widest">{repair.category}</span>
                   <span className="text-gray-300">•</span>
                   <span className="text-xs text-gray-400">{repair.dateCreated}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{repair.description}</p>
                {repair.technicianName && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 bg-[#FFFDF5] dark:bg-gray-900 border border-uae-gold/20 p-3 rounded-lg w-fit">
                    <UserIcon className="h-4 w-4 text-uae-gold" />
                    <span className="font-bold">Technician:</span> {repair.technicianName}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const RewardsPage = () => {
  const { user, t } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL');

  const rewards = [
    { id: 1, title: 'Restaurant Voucher', desc: 'Enjoy a meal at participating restaurants', cost: 150, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80', category: 'MEAL' },
    { id: 2, title: 'Coffee Shop Voucher', desc: '$10 voucher for local coffee shops', cost: 100, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&q=80', category: 'MEAL' },
    { id: 3, title: '50% Off Next Repair', desc: 'Get half off your next repair service', cost: 200, image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&q=80', category: 'DISCOUNT' },
    { id: 4, title: 'Reusable Shopping Bag Set', desc: 'Set of 5 eco-friendly reusable bags', cost: 120, image: 'https://images.unsplash.com/photo-1605600659873-d808a13a4d2d?w=500&q=80', category: 'ECO' },
    { id: 5, title: 'Bamboo Cutlery Set', desc: 'Sustainable bamboo cutlery for on-the-go', cost: 180, image: 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?w=500&q=80', category: 'ECO' },
  ];

  const tabs = [
    { id: 'ALL', label: 'All Rewards' },
    { id: 'MEAL', label: 'Meal Vouchers' },
    { id: 'DISCOUNT', label: 'Discounts' },
    { id: 'ECO', label: 'Eco Products' },
  ];

  const filteredRewards = activeTab === 'ALL' ? rewards : rewards.filter(r => r.category === activeTab);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/home')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 text-uae-gold">
           <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Rewards Catalog
        </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#FFFDF5] border border-uae-gold text-uae-goldDark shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRewards.map(reward => (
          <div key={reward.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full group">
            <div className="h-48 overflow-hidden relative">
              <img src={reward.image} alt={reward.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                {reward.category}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{reward.title}</h3>
              <p className="text-sm text-gray-500 mb-4 flex-1">{reward.desc}</p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                <span className="font-bold text-uae-goldDark flex items-center gap-1 bg-[#FFFDF5] px-3 py-1 rounded-lg border border-uae-gold/20">
                  {reward.cost} pts
                </span>
                <button className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-bold hover:opacity-90">
                  Redeem
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SignupPage = ({ onBack, onLoginEmail }: { onBack: () => void; onLoginEmail: (email: string, password?: string) => Promise<void> }) => {
  const { register } = useApp();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // stored so the confirmation screen can auto-login
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState('');
  // resend cooldown (seconds)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    emirate: 'Dubai',
    address: '',
    emiratesId: '',
    phone: '',
    role: UserRole.CITIZEN
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidating(true);

    try {
      const isSpam = await validateWithAI(formData.name, formData.email);
      if (isSpam) {
        setValidating(false);
        setLoading(false);
        setError("Registration blocked: Input detected as spam or invalid. Please provide a real name.");
        return;
      }
      setValidating(false);
      await register(formData);
      setSubmittedEmail(formData.email);
      setSubmittedPassword(formData.password);
      setSuccess(true);
      setResendCooldown(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await supabase.auth.resend({ type: 'signup', email: submittedEmail });
    } catch (_) { /* silent */ }
    setResendLoading(false);
    setResendCooldown(60);
  };

  const handleContinueToApp = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await onLoginEmail(submittedEmail, submittedPassword);
      // onLoginEmail navigates to /home on success — nothing more needed here
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again from the login screen.');
      setLoginLoading(false);
    }
  };

  const handleEmiratesIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, emiratesId: formatEmiratesID(e.target.value) });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatUAEPhone(e.target.value) });
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
        {/* Ambient orbs */}
        <div className="absolute w-[600px] h-[600px] rounded-full hero-orb-1 -top-48 -left-48 pointer-events-none" style={{ filter: 'blur(90px)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none" style={{ filter: 'blur(90px)' }} />

        <div className="w-full max-w-sm relative z-10 landing-glass rounded-3xl border border-white/10 p-8 text-center" style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
          {/* Animated envelope icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 rounded-2xl bg-uae-gold/15 border border-uae-gold/30 flex items-center justify-center animate-pulse-glow">
              <EnvelopeIcon className="h-10 w-10 text-uae-gold" />
            </div>
            {/* Badge */}
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-uae-green border-2 border-black flex items-center justify-center">
              <CheckIcon className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Check your inbox</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-uae-gold font-bold text-sm mb-6 break-all">{submittedEmail}</p>

          <ol className="text-left space-y-3 mb-7">
            {[
              'Open the email from ISLAA7',
              'Click the "Confirm your email" link',
              'Come back here and tap the button below',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full gold-gradient text-black text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-300 text-sm">{step}</span>
              </li>
            ))}
          </ol>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs font-medium text-left">{loginError}</p>
            </div>
          )}

          {/* Primary CTA */}
          <button
            onClick={handleContinueToApp}
            disabled={loginLoading}
            className="w-full py-4 rounded-xl font-bold text-black gold-gradient hover:opacity-90 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 mb-3 disabled:opacity-60 disabled:scale-100"
          >
            {loginLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-black/60" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing you in…
              </>
            ) : (
              <>I've confirmed my email — Continue to App →</>
            )}
          </button>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resendLoading ? 'Sending…' : resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : 'Resend confirmation email'}
          </button>

          <button onClick={onBack} className="mt-4 text-gray-600 hover:text-gray-400 text-xs transition-colors">
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      <div className="absolute w-[600px] h-[600px] rounded-full hero-orb-1 -top-48 -left-48 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="w-full max-w-md relative z-10 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 group">
          <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>
      <div className="landing-glass border border-white/10 p-8 rounded-3xl overflow-y-auto max-h-[85vh]">
        
        <div className="w-full flex flex-col items-center text-center mb-6">
          <h2 className="text-2xl font-black text-white">Create Citizen Account</h2>
          <p className="text-sm text-gray-500 mt-1">Register for sustainable repair services</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs font-medium text-left">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Legal Name</label>
            <input 
              type="text" 
              required 
              className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
              placeholder="Mohamed Al-Mansoori" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Emirates ID</label>
            <input 
              type="text" 
              required 
              maxLength={18}
              className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
              placeholder="784-YEAR-XXXXXXX-X" 
              value={formData.emiratesId}
              onChange={handleEmiratesIdChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Emirate</label>
              <select 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold"
                value={formData.emirate}
                onChange={e => setFormData({...formData, emirate: e.target.value})}
              >
                <option>Abu Dhabi</option>
                <option>Dubai</option>
                <option>Sharjah</option>
                <option>Ajman</option>
                <option>Umm Al Quwain</option>
                <option>Ras Al Khaimah</option>
                <option>Fujairah</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
              <input 
                type="tel" 
                required 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
                placeholder="+971 50 123 4567" 
                value={formData.phone}
                onChange={handlePhoneChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Residential Address</label>
            <textarea 
              required 
              rows={2}
              className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
              placeholder="Villa/Apartment No, Street Name, Community" 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <EnvelopeIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input 
                type="email" 
                required 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
                placeholder="email@uae.ae" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
            <div className="relative">
              <LockClosedIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input 
                type="password" 
                required 
                minLength={6}
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
                placeholder="••••••••" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 gold-gradient text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {validating ? "AI Checking..." : "Processing..."}
              </span>
            ) : "Register Now"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};

const TechnicianSignup = ({ onBack }: { onBack: () => void }) => {
  const { register } = useApp();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    emiratesId: '',
    specialty: RepairCategory.APPLIANCE,
    experience: 0,
    email: '',
    password: '',
    phone: '',
    role: UserRole.TECHNICIAN
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidating(true);
    setError(null);
    
    try {
        // 1. AI Check
        const isSpam = await validateWithAI(formData.name, formData.email);
        
        if (isSpam) {
            setValidating(false);
            setLoading(false);
            setError("Registration blocked: Input detected as spam or invalid. Please provide a real name.");
            return;
        }

        setValidating(false);
        // 2. Register
        await register(formData);
        setLoading(false);
        setSubmitted(true);
    } catch (err: any) {
        setError(err.message || "Registration failed");
        setLoading(false);
        setValidating(false);
    }
  };

  const handleEmiratesIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEmiratesID(e.target.value);
    setFormData({ ...formData, emiratesId: formatted });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUAEPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
        <div className="absolute w-[600px] h-[600px] rounded-full hero-orb-1 -top-48 -left-48 pointer-events-none" style={{ filter: 'blur(90px)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none" style={{ filter: 'blur(90px)' }} />

        <div className="w-full max-w-sm relative z-10 landing-glass rounded-3xl border border-white/10 p-8 text-center" style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 rounded-2xl bg-uae-gold/15 border border-uae-gold/30 flex items-center justify-center animate-pulse-glow">
              <EnvelopeIcon className="h-10 w-10 text-uae-gold" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-uae-green border-2 border-black flex items-center justify-center">
              <CheckIcon className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-uae-gold/30 bg-uae-gold/10 mb-4">
            <span className="text-uae-gold text-xs font-bold uppercase tracking-wider">Application Received</span>
          </div>

          <h2 className="text-2xl font-black text-white mb-3">Two things left to do</h2>

          <ol className="text-left space-y-3 mb-7">
            {[
              { step: 'Confirm your email — check your inbox for a link from ISLAA7', color: 'text-uae-gold' },
              { step: 'Wait for admin verification — we review all technician applications manually. This takes 1–3 business days.', color: 'text-gray-300' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full gold-gradient text-black text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className={`text-sm ${item.color}`}>{item.step}</span>
              </li>
            ))}
          </ol>

          <p className="text-gray-600 text-xs mb-6">
            Once verified by an admin, you'll be able to log in and start accepting jobs.
          </p>

          <button
            onClick={onBack}
            className="w-full py-4 rounded-xl font-bold text-black gold-gradient hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            Back to Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      <div className="absolute w-[600px] h-[600px] rounded-full hero-orb-1 -top-48 -left-48 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="w-full max-w-md relative z-10 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 group">
          <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>
      <div className="landing-glass border border-white/10 p-8 rounded-3xl overflow-y-auto max-h-[85vh]">
        <div className="w-full flex flex-col items-center text-center mb-6">
          <h2 className="text-2xl font-black text-white">Technician Application</h2>
          <p className="text-sm text-gray-500 mt-1">Join ISLAA7 as a verified repair professional</p>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs font-medium text-left">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Legal Name</label>
            <input 
              type="text" required placeholder="Full Name" 
              className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none" 
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Emirates ID</label>
            <input 
              type="text" required placeholder="784-YEAR-XXXXXXX-X" 
              maxLength={18}
              className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none" 
              value={formData.emiratesId} onChange={handleEmiratesIdChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Specialty</label>
              <select 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none"
                value={formData.specialty}
                onChange={e => setFormData({...formData, specialty: e.target.value as RepairCategory})}
              >
                {Object.values(RepairCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Experience (Yrs)</label>
              <input 
                type="number" min="0" required
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none" 
                value={formData.experience} onChange={e => setFormData({...formData, experience: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
            <input 
                type="tel" required placeholder="+971 50 123 4567" 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none" 
                value={formData.phone} onChange={handlePhoneChange}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
            <input 
                type="email" required placeholder="tech@company.com" 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
            <input 
                type="password" required placeholder="••••••••" minLength={6}
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 rounded-lg outline-none" 
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full gold-gradient text-white py-3 rounded-lg font-bold">
             {loading ? (
                <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {validating ? 'AI Checking...' : 'Processing...'}
                </span>
             ) : 'Apply Now'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};

const LoginForm = ({ role, onBack, onLogin, onLoginEmail, onTypingChange }: { role: UserRole, onBack: () => void, onLogin: (role: UserRole) => void, onLoginEmail: (email: string, password?: string) => Promise<void>, onTypingChange?: (v: boolean) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Allow React state to update loading before processing
    await new Promise(r => setTimeout(r, 100));

    try {
        if (email.trim().toLowerCase() === 'islaa7uae@gmail.com') {
             onLogin(UserRole.ADMIN);
        } else {
             await onLoginEmail(email, password); // Pass password
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const [mounted2, setMounted2] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMounted2(true), 60); return () => clearTimeout(id); }, []);

  const isTech = role === UserRole.TECHNICIAN;
  const accentColor = isTech ? '#00732F' : '#C29B40';

  return (
    <>
      <div className="absolute w-[600px] h-[600px] rounded-full hero-orb-1 -top-48 -left-48 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

      <div
        className="w-full max-w-md relative z-10"
        style={{ opacity: mounted2 ? 1 : 0, transform: mounted2 ? 'translateY(0)' : 'translateY(28px)', transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="landing-glass rounded-3xl p-8 border border-white/10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}
            >
              {isTech ? (
                <WrenchScrewdriverIcon className="h-6 w-6" style={{ color: accentColor }} />
              ) : (
                <UserIcon className="h-6 w-6" style={{ color: accentColor }} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {role === UserRole.CITIZEN ? 'Citizen' : role === UserRole.TECHNICIAN ? 'Technician' : 'Admin'} Login
              </h2>
              <p className="text-gray-500 text-sm">Enter your credentials to continue</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <EnvelopeIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <input
                  type="email"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-uae-gold/60 focus:bg-white/8 transition-all duration-200"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => onTypingChange?.(true)}
                  onBlur={() => onTypingChange?.(false)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <input
                  type="password"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-uae-gold/60 focus:bg-white/8 transition-all duration-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => onTypingChange?.(true)}
                  onBlur={() => onTypingChange?.(false)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 rounded-xl font-bold text-black gold-gradient hover:opacity-90 hover:scale-[1.02] transition-all duration-200 flex justify-center items-center gap-2 shadow-lg disabled:opacity-60 disabled:scale-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black/60" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying…
                </>
              ) : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

const LoginPage = () => {
  const { login, loginByEmail, t } = useApp();
  const [view, setView] = useState<'LOGIN' | 'SIGNUP' | 'TECH_SIGNUP' | 'EMAIL_LOGIN'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CITIZEN);
  const [mounted, setMounted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMounted(true), 60); return () => clearTimeout(id); }, []);

  if (view === 'SIGNUP') return <SignupPage onBack={() => setView('LOGIN')} onLoginEmail={loginByEmail} />;
  if (view === 'TECH_SIGNUP') return <TechnicianSignup onBack={() => setView('LOGIN')} />;

  const roleCards = [
    {
      role: UserRole.CITIZEN,
      icon: UserIcon,
      label: 'Citizen Login',
      sublabel: 'Book repairs, earn rewards',
      accent: 'border-uae-gold/40 hover:border-uae-gold',
      iconBg: 'bg-uae-gold/10',
      iconColor: 'text-uae-gold',
    },
    {
      role: UserRole.TECHNICIAN,
      icon: WrenchScrewdriverIcon,
      label: 'Technician Login',
      sublabel: 'Manage your job queue',
      accent: 'border-uae-green/40 hover:border-uae-green',
      iconBg: 'bg-uae-green/10',
      iconColor: 'text-uae-green',
    },
    {
      role: UserRole.ADMIN,
      icon: TicketIcon,
      label: 'Point Redemption Admin',
      sublabel: 'Manage reward redemptions',
      accent: 'border-purple-500/40 hover:border-purple-500',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: animated characters — stays mounted for both views */}
      <AnimatedCharactersSidebar isTyping={isTyping} />

      {/* Right: role selection OR email form */}
      <div className="flex items-center justify-center p-8 bg-black relative overflow-hidden">
      {view === 'EMAIL_LOGIN' ? (
        <LoginForm
          role={selectedRole}
          onBack={() => { setView('LOGIN'); setIsTyping(false); }}
          onLogin={login}
          onLoginEmail={loginByEmail}
          onTypingChange={setIsTyping}
        />
      ) : (
      <>
      {/* Ambient orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full hero-orb-1 -top-48 -left-48 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none" style={{ filter: 'blur(90px)' }} />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

      <div
        className="w-full max-w-md relative z-10"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(28px)', transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)' }}
      >
        {/* Card */}
        <div className="landing-glass rounded-3xl p-8 border border-white/10">
          {/* Logo + brand */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse-glow">
              <span className="text-white font-black text-2xl">إ</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-1">{t('app_name')}</h1>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">{t('slogan')}</p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roleCards.map(({ role, icon: Icon, label, sublabel, accent, iconBg, iconColor }, idx) => (
              <button
                key={role}
                onClick={() => { setSelectedRole(role); setView('EMAIL_LOGIN'); }}
                className={`group p-4 rounded-2xl border bg-white/5 text-left transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5 ${accent} ${idx === 2 ? 'col-span-2' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <p className="text-white font-bold text-sm leading-tight">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-tight">{sublabel}</p>
              </button>
            ))}
          </div>

          {/* Sign up links */}
          <div className="pt-5 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm mb-3">New to ISLAA7?</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setView('SIGNUP')} className="text-uae-gold font-bold text-sm hover:brightness-125 transition-all">
                Register as Citizen
              </button>
              <span className="text-white/20">|</span>
              <button onClick={() => setView('TECH_SIGNUP')} className="text-uae-gold font-bold text-sm hover:brightness-125 transition-all">
                Join as Technician
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-5">
          ISLAA7 · Sustainable Repair Platform · Secure &amp; Private
        </p>
      </div>
      </>
      )}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { user, language, setLanguage, theme, setTheme, accessibility, setAccessibility, logout, t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/home')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 text-uae-gold">
           <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Language */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <GlobeAltIcon className="h-6 w-6 text-uae-gold" />
            <h3 className="font-bold text-gray-900 dark:text-white">Language</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {[
               { code: Language.ENGLISH, label: 'English' },
               { code: Language.ARABIC, label: 'العربية' },
               { code: Language.RUSSIAN, label: 'Русский' },
               { code: Language.HINDI, label: 'हिंदी' },
             ].map(l => (
               <button 
                 key={l.code}
                 onClick={() => setLanguage(l.code)}
                 className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    language === l.code 
                      ? 'border-uae-gold bg-[#FFFDF5] text-uae-goldDark' 
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-uae-gold/50'
                 }`}
               >
                 {l.label}
               </button>
             ))}
          </div>
        </div>

        {/* Theme */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
           <div className="flex items-center gap-3 mb-4">
            <EyeIcon className="h-6 w-6 text-uae-gold" />
            <h3 className="font-bold text-gray-900 dark:text-white">Appearance</h3>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setTheme(Theme.LIGHT)}
               className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                 theme === Theme.LIGHT 
                   ? 'border-uae-gold bg-[#FFFDF5] text-uae-goldDark' 
                   : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
               }`}
             >
               <SunIcon className="h-6 w-6" />
               <span className="font-bold text-sm">Light Mode</span>
             </button>
             <button 
               onClick={() => setTheme(Theme.DARK)}
               className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                 theme === Theme.DARK 
                   ? 'border-uae-gold bg-gray-800 text-uae-gold' 
                   : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
               }`}
             >
               <MoonIcon className="h-6 w-6" />
               <span className="font-bold text-sm">Dark Mode</span>
             </button>
          </div>
        </div>

        {/* Accessibility */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <HandRaisedIcon className="h-6 w-6 text-uae-gold" />
            <h3 className="font-bold text-gray-900 dark:text-white">Accessibility</h3>
          </div>
          <div className="space-y-3">
             <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
               <span className="font-medium text-gray-700 dark:text-gray-300">Large Text</span>
               <button 
                 onClick={() => setAccessibility({...accessibility, largeText: !accessibility.largeText})}
                 className={`w-12 h-6 rounded-full transition-colors relative ${accessibility.largeText ? 'bg-uae-gold' : 'bg-gray-300 dark:bg-gray-600'}`}
               >
                 <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${accessibility.largeText ? 'left-7' : 'left-1'}`} />
               </button>
             </div>
             <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
               <span className="font-medium text-gray-700 dark:text-gray-300">High Contrast</span>
               <button 
                 onClick={() => setAccessibility({...accessibility, highContrast: !accessibility.highContrast})}
                 className={`w-12 h-6 rounded-full transition-colors relative ${accessibility.highContrast ? 'bg-uae-gold' : 'bg-gray-300 dark:bg-gray-600'}`}
               >
                 <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${accessibility.highContrast ? 'left-7' : 'left-1'}`} />
               </button>
             </div>
          </div>
        </div>

        {/* Profile */}
        <div className="p-6">
           <div className="flex items-center gap-3 mb-4">
            <UserIcon className="h-6 w-6 text-uae-gold" />
            <h3 className="font-bold text-gray-900 dark:text-white">Account</h3>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-full bg-uae-gold/20 flex items-center justify-center text-uae-gold font-bold text-xl">
               {user?.name.charAt(0)}
             </div>
             <div>
               <h4 className="font-bold text-gray-900 dark:text-white">{user?.name}</h4>
               <p className="text-xs text-gray-500">{user?.role} • {user?.emirate}</p>
             </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('islaa7_language');
    return (saved as Language) || Language.ENGLISH;
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('islaa7_theme');
    return (saved as Theme) || Theme.LIGHT;
  });
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({ largeText: false, highContrast: false });

  // Restore session after email confirmation redirect — Supabase sets a session cookie
  // automatically when the user clicks the confirmation link, so on next load we pick it up.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || user) return;
      const meta = session.user.user_metadata || {};
      const restored: User = {
        id: session.user.id,
        name: meta.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email,
        role: meta.role || UserRole.CITIZEN,
        emirate: meta.emirate || 'Dubai',
        address: meta.residential_address || '',
        points: 0,
        repairsCount: 0,
        status: 'ACTIVE',
        verificationStatus: meta.role === UserRole.TECHNICIAN ? VerificationStatus.PENDING : VerificationStatus.VERIFIED,
      };
      if (restored.role === UserRole.TECHNICIAN && restored.verificationStatus === VerificationStatus.PENDING) return;
      try { db.loginByEmail(session.user.email!); } catch { db.registerUser({ ...restored }); }
      setUser(restored);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      const meta = session.user.user_metadata || {};
      const restored: User = {
        id: session.user.id,
        name: meta.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email,
        role: meta.role || UserRole.CITIZEN,
        emirate: meta.emirate || 'Dubai',
        address: meta.residential_address || '',
        points: 0,
        repairsCount: 0,
        status: 'ACTIVE',
        verificationStatus: meta.role === UserRole.TECHNICIAN ? VerificationStatus.PENDING : VerificationStatus.VERIFIED,
      };
      if (restored.role === UserRole.TECHNICIAN && restored.verificationStatus === VerificationStatus.PENDING) return;
      try { db.loginByEmail(session.user.email!); } catch { db.registerUser({ ...restored }); }
      setUser(prev => prev ?? restored);
    });
    return () => subscription.unsubscribe();
  }, []);

  const t = (key: string): string => {
    return TRANSLATIONS[key]?.[language] || key;
  };

  const login = (role: UserRole) => {
    try {
      const u = db.login(role);
      setUser(u);
    } catch (e) {
      alert((e as Error).message);
    }
  };
  
  const loginByEmail = async (email: string, password?: string) => {
      let sbUser = null;
      let loginError = null;

      try {
          // 1. Attempt Supabase Login if password is provided
          if (password) {
              const { data, error } = await supabase.auth.signInWithPassword({
                  email,
                  password
              });

              if (error) {
                  console.warn("Supabase login failed, attempting local fallback:", error.message);
                  // "Email not confirmed" means the user exists but hasn't confirmed yet —
                  // treat it as a soft error so the mock-DB fallback can still let them in.
                  if (error.message.toLowerCase().includes('email not confirmed')) {
                      loginError = "Please confirm your email first — check your inbox for the link we sent.";
                  } else {
                      loginError = error.message;
                  }
              } else if (data.user) {
                  sbUser = data.user;
              }
          }
      } catch(e: any) {
          console.warn("Supabase exception:", e);
          loginError = e.message;
      }

      if (sbUser) {
          try {
              const meta = sbUser.user_metadata;
              
              // Construct user from Supabase data
              const supabaseUser: User = {
                  id: sbUser.id,
                  name: meta.full_name || 'User',
                  email: sbUser.email,
                  role: meta.role || UserRole.CITIZEN,
                  emirate: meta.emirate || 'Dubai',
                  address: meta.residential_address || '',
                  points: 0,
                  repairsCount: 0,
                  status: 'ACTIVE',
                  verificationStatus: meta.role === UserRole.TECHNICIAN ? VerificationStatus.PENDING : VerificationStatus.VERIFIED
              };

              // Technician Check
              if (supabaseUser.role === UserRole.TECHNICIAN && supabaseUser.verificationStatus === VerificationStatus.PENDING) {
                   throw new Error("Application under review. Please check your email.");
              }

              // Sync with Mock DB
              try {
                  db.loginByEmail(email); 
                  const u = db.updateUser(db.loginByEmail(email).id, supabaseUser);
                  setUser(u);
              } catch (e) {
                  db.registerUser({
                      ...supabaseUser,
                      specialty: meta.specialty,
                      experience: meta.experience
                  });
                  setUser(supabaseUser);
              }
              return;
          } catch(e: any) {
              // If sync fails or tech check fails, throw
              throw new Error(e.message);
          }
      }
      
      // Fallback for mock-only users or if Supabase failed
      try {
          const u = db.loginByEmail(email);
          setUser(u);
      } catch (e) {
          // If both failed, throw the original Supabase error if it exists, or generic
          throw new Error(loginError || "Invalid login credentials");
      }
  };

  const logout = () => {
    setUser(null);
  };

  // Updated register function to be robust against "Error sending confirmation email"
  // It registers in the Mock Database first (to ensure login works), then attempts Supabase.
  const register = async (data: any) => {
    // 1. Register in Mock DB (Ensures instant login capability despite Supabase status)
    db.registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        emirate: data.emirate,
        address: data.address,
        emiratesId: data.emiratesId,
        role: data.role,
        specialty: data.specialty,
        experience: data.experience
    });

    // 2. Try Supabase (Best effort) with METADATA
    try {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: window.location.origin, 
            data: {
              // THESE KEYS MUST MATCH THE SQL TRIGGER
              full_name: data.name,
              emirates_id: data.emiratesId,
              emirate: data.emirate,
              phone: data.phone,
              residential_address: data.address,
              role: data.role,
              specialty: data.specialty,
              experience: data.experience
            }
          }
        });

        if (error) {
             console.warn("Supabase auth warning:", error.message);
             // Re-throw if it's a critical error for the UI to display
             throw error; 
        }
    } catch (err) {
        console.warn("Supabase registration skipped or failed:", err);
        throw err; // Allow UI to see error
    }
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updated = db.updateUser(user.id, data);
      setUser(updated);
    }
  };
  
  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('islaa7_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('islaa7_language', language);
  }, [language]);

  const value = {
    user,
    language,
    theme,
    accessibility,
    setLanguage,
    setTheme,
    setAccessibility,
    login,
    loginByEmail,
    register,
    updateProfile,
    logout,
    t
  };
  
  // Decide which dashboard to show based on role
  const renderDashboard = () => {
      if (!user) return <Navigate to="/login" />;
      switch(user.role) {
          case UserRole.ADMIN: return <AdminDashboard />;
          case UserRole.TECHNICIAN: return <TechnicianDashboard />;
          default: return <Dashboard />;
      }
  };

  return (
    <AppContext.Provider value={value}>
      <HashRouter>
        <div className={`min-h-screen transition-colors duration-500 ${theme === Theme.DARK ? 'dark app-bg-dark' : 'app-bg-light'}`}>
           <Routes>
             <Route path="/" element={<LandingPage />} />
             <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/home" />} />
             <Route path="/home" element={<><NavBar />{renderDashboard()}</>} />
             <Route path="/book" element={user ? <><NavBar /><BookRepair /></> : <Navigate to="/login" />} />
             <Route path="/history" element={user ? <><NavBar /><RepairHistory /></> : <Navigate to="/login" />} />
             <Route path="/rewards" element={user ? <><NavBar /><RewardsPage /></> : <Navigate to="/login" />} />
             <Route path="/settings" element={user ? <><NavBar /><SettingsPage /></> : <Navigate to="/login" />} />
             <Route path="*" element={<Navigate to="/" />} />
           </Routes>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
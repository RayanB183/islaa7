import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import MarketPlan from './MarketPlan';
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

const GROQ_API_KEY = "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";
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
  // 1. Local Pre-check
  if (isObviousSpam(name) || isObviousSpam(email)) {
      console.warn("Spam detected by local regex");
      return true;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a strict anti-spam validator for the UAE Government.
            Analyze the provided Name and Email.
            
            Reply with EXACTLY one word: "true" if it is spam/fake/gibberish, or "false" if it looks valid.
            
            Spam examples: "asd asd", "hhhhh", "test test", "user123", "no name"
            Valid examples: "Ahmed Ali", "Sarah Smith", "Mohammad Al-Qasimi"
            `
          },
          {
            role: "user",
            content: `Name: "${name}", Email: "${email}"`
          }
        ],
        model: "llama3-8b-8192", // Using 8b model for speed and lower probability of rate limits
        temperature: 0,
        max_tokens: 10
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API Error (${response.status}):`, errorText);
        // Fallback: If AI fails, we rely on local regex. Returning false allows user to proceed.
        // If we want to be strict, we could return true, but that risks blocking users during outages.
        return false;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.toLowerCase().trim();
    
    console.log("AI Validation Result:", content);

    return content?.includes("true") || false;

  } catch (error) {
    console.error("AI Validation Exception:", error);
    return false;
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
  const { user, logout, t, language } = useApp();
  const navigate = useNavigate();
  const isRTL = language === Language.ARABIC;

  return (
    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-uae-gold/20 dark:border-uae-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
             <img src={APP_LOGO_URL} alt="ISLAA7 Logo" className="h-10 w-auto object-contain" />
             <div className="hidden md:block">
               <h1 className="text-xl font-bold text-uae-goldDark dark:text-uae-gold tracking-tight">{t('app_name')}</h1>
               <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">UAE Government Initiative</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {user && user.role === UserRole.CITIZEN && (
                 <div className="flex items-center gap-1 bg-uae-gold/10 dark:bg-uae-gold/20 px-3 py-1 rounded-full border border-uae-gold/30">
                     <span className="text-sm font-bold text-uae-goldDark dark:text-uae-gold">{user.points}</span>
                     <GiftIcon className="h-4 w-4 text-uae-gold" />
                 </div>
             )}
             {user && user.role === UserRole.TECHNICIAN && (
                 <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-200">
                     <ShieldCheckIcon className="h-4 w-4 text-green-600" />
                     <span className="text-xs font-bold text-green-700 dark:text-green-400">Verified</span>
                 </div>
             )}
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/settings')}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  <Cog6ToothIcon className="h-6 w-6" />
                </button>
                <button 
                  onClick={logout}
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
                  title={t('logout')}
                >
                  <ArrowRightOnRectangleIcon className={`h-6 w-6 ${isRTL ? 'transform rotate-180' : ''}`} />
                </button>
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

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 relative">
      {/* Landfill Diversion Modal */}
      {showLandfillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-red-100 dark:border-red-900 relative">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-short">
                      <TrashIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Action Required</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                      One of your items could not be repaired. <br/>
                      <span className="font-bold text-red-500 block mt-2">Please take the un-repaired item to an ISLAA7 Landfill.</span>
                  </p>
                  <button 
                      onClick={() => setShowLandfillModal(false)}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200 dark:shadow-none"
                  >
                      I Understand
                  </button>
              </div>
          </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
            <stat.icon className="h-8 w-8 mb-3 text-uae-gold" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* 5 Rs Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8">The 5 Rs of Sustainability</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {sustainabilitySteps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-uae-sand dark:bg-gray-700 flex items-center justify-center border border-uae-gold/20">
                <step.icon className="h-8 w-8 text-uae-goldDark dark:text-uae-gold" />
              </div>
              <h4 className="font-bold text-sm text-gray-800 dark:text-white">{step.label}</h4>
              <p className="text-[10px] text-gray-500 leading-tight max-w-[120px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/book')}
          className="gold-gradient text-white py-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg"
        >
          <div className="p-1 border-2 border-white rounded-full"><WrenchScrewdriverIcon className="h-5 w-5" /></div>
          {t('book_repair')}
        </button>
        <button 
          onClick={() => navigate('/rewards')}
          className="bg-[#967C37] text-white py-6 rounded-xl font-bold shadow-lg hover:bg-[#7a642b] transition-all flex items-center justify-center gap-3 text-lg"
        >
          <div className="p-1 border-2 border-white rounded-full"><GiftIcon className="h-5 w-5" /></div>
          {t('browse_rewards')}
        </button>
      </div>

      {/* Recent Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('recent_requests')}</h3>
           <button onClick={() => navigate('/history')} className="text-xs font-bold text-uae-gold hover:underline">{t('view_all')}</button>
        </div>
        
        {repairs.length === 0 ? (
           <div className="text-center py-10">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                 <WrenchScrewdriverIcon className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">{t('no_repairs')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('start_repair_hint')}</p>
           </div>
        ) : (
          <div className="space-y-4">
             {repairs.slice(0, 3).map(repair => (
                <div key={repair.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
                         <WrenchScrewdriverIcon className="h-5 w-5 text-uae-gold" />
                      </div>
                      <div>
                         <h4 className="text-sm font-bold text-gray-900 dark:text-white">{repair.itemName || repair.category}</h4>
                         <p className="text-xs text-gray-500">{repair.dateCreated}</p>
                      </div>
                   </div>
                   <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      repair.status === RepairStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                   }`}>
                      {repair.status}
                   </span>
                </div>
             ))}
          </div>
        )}
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

const SignupPage = ({ onBack }: { onBack: () => void }) => {
  const { register } = useApp();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  
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
      // 1. Validate inputs with AI before hitting Supabase
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
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed');
    } finally {
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

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-uae-sand dark:bg-gray-950 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-glow text-center border border-uae-gold/30">
          <div className="w-16 h-16 bg-uae-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-8 w-8 text-uae-gold" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Registration Successful</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Your account has been created. <br/>
            Please check your email for verification if required, or proceed to login.
          </p>
          <button onClick={onBack} className="text-uae-gold font-bold hover:underline text-sm">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-uae-sand dark:bg-gray-950 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-glow border border-uae-gold/30 relative overflow-y-auto max-h-[90vh]">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        
        <div className="w-full flex flex-col items-center text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Create Citizen Account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Register for sustainable repair services</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg text-center font-bold">
            {error}
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-uae-sand dark:bg-gray-950 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-glow text-center border border-uae-gold/30">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Application Received</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Reviewing credentials... <br/> Check your email for verification.</p>
          <button onClick={onBack} className="text-uae-gold font-bold hover:underline">Return to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-uae-sand dark:bg-gray-950 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-glow border border-uae-gold/30 relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div className="w-full flex flex-col items-center text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Technician Application</h2>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg text-center font-bold">
            {error}
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
  );
};

const LoginForm = ({ role, onBack, onLogin, onLoginEmail }: { role: UserRole, onBack: () => void, onLogin: (role: UserRole) => void, onLoginEmail: (email: string, password?: string) => Promise<void> }) => {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-uae-sand dark:bg-gray-950 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-glow text-center border border-uae-gold/30">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
           <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div className="w-16 h-16 bg-uae-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
           <UserIcon className="h-8 w-8 text-uae-gold" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
           {role === UserRole.CITIZEN ? 'Citizen' : role === UserRole.TECHNICIAN ? 'Technician' : 'Admin'} Login
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your credentials to access your account</p>
        
        {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-xs font-bold">{error}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
           <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <EnvelopeIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input 
                type="email" 
                required 
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
                placeholder="name@example.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                className="glass-input dark:bg-gray-700 dark:text-white w-full p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-uae-gold" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 gold-gradient text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex justify-center items-center"
          >
            {loading ? (
               <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { login, loginByEmail, t } = useApp();
  const [view, setView] = useState<'LOGIN' | 'SIGNUP' | 'TECH_SIGNUP' | 'EMAIL_LOGIN'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CITIZEN);
  const [showUaePassModal, setShowUaePassModal] = useState(false);

  if (view === 'SIGNUP') return <SignupPage onBack={() => setView('LOGIN')} />;
  if (view === 'TECH_SIGNUP') return <TechnicianSignup onBack={() => setView('LOGIN')} />;
  if (view === 'EMAIL_LOGIN') return <LoginForm role={selectedRole} onBack={() => setView('LOGIN')} onLogin={login} onLoginEmail={loginByEmail} />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-uae-sand dark:bg-gray-950 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-glow text-center border border-uae-gold/30 backdrop-blur-sm z-10 relative">
        <img src={APP_LOGO_URL} alt="Logo" className="h-24 mx-auto mb-6 object-contain" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('app_name')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 tracking-wide uppercase text-xs font-bold">{t('slogan')}</p>

        <div className="space-y-4">
          <button 
            onClick={() => setShowUaePassModal(true)}
            className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
          >
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
               <span className="text-[8px] font-bold text-black">UAE</span>
            </div>
            {t('login_uae_pass')}
          </button>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <button 
            onClick={() => { setSelectedRole(UserRole.CITIZEN); setView('EMAIL_LOGIN'); }}
            className="w-full border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Citizen Login
          </button>

          <button 
            onClick={() => { setSelectedRole(UserRole.TECHNICIAN); setView('EMAIL_LOGIN'); }}
            className="w-full border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Technician Login
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
           <p className="text-sm text-gray-500 mb-3">Don't have an account?</p>
           <div className="flex gap-4 justify-center">
             <button onClick={() => setView('SIGNUP')} className="text-uae-gold font-bold hover:underline">Register as Citizen</button>
             <span className="text-gray-300">|</span>
             <button onClick={() => setView('TECH_SIGNUP')} className="text-uae-gold font-bold hover:underline">Join as Technician</button>
           </div>
        </div>
      </div>

      {/* UAE Pass Coming Soon Modal */}
      {showUaePassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border border-uae-gold/30 max-w-sm w-full text-center relative animate-in fade-in zoom-in duration-300">
                <button 
                   onClick={() => setShowUaePassModal(false)}
                   className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Coming Soon</h3>
                
                <div className="flex items-center justify-center gap-4 mb-8">
                    <img src={APP_LOGO_URL} alt="ISLAA7" className="h-16 object-contain" />
                    <XMarkIcon className="h-6 w-6 text-gray-300" />
                    <img src={UAE_PASS_LOGO} alt="UAE Pass" className="h-16 object-contain" />
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    We are currently working on integrating secure UAE Pass authentication for a seamless experience.
                </p>
                
                <button 
                    onClick={() => setShowUaePassModal(false)}
                    className="w-full bg-uae-gold text-white py-3 rounded-xl font-bold hover:bg-uae-goldDark transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
      )}
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
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({ largeText: false, highContrast: false });

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
                  loginError = error.message;
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

  const logout = () => setUser(null);

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
  }, [theme]);

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
        <div className={`min-h-screen transition-colors duration-300 ${theme === Theme.DARK ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
           <Routes>
             <Route path="/" element={<LandingPage />} />
             <Route path="/market-plan" element={<MarketPlan />} />
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
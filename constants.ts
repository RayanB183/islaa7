import { Language, RepairCategory, RepairStatus, TranslationDictionary, UserRole, User, Technician, RepairRequest, VerificationStatus, DisposalRequest, Violation } from './types';

export const APP_LOGO_URL = "https://i.postimg.cc/T3LTKksg/ISLAA7-LOGO-BLACK.png";

export const TRANSLATIONS: TranslationDictionary = {
  app_name: {
    en: "ISLAA7",
    ar: "إصلاح",
    ru: "ИСЛАА7",
    hi: "इसला7"
  },
  slogan: {
    en: "Don't Bin It, Book It",
    ar: "لا ترميها، أصلحها",
    ru: "Не выбрасывайте, забронируйте ремонт",
    hi: "इसे फेंकें नहीं, इसे बुक करें"
  },
  login_uae_pass: {
    en: "Login with UAE Pass",
    ar: "تسجيل الدخول باستخدام الهوية الرقمية",
    ru: "Войти с UAE Pass",
    hi: "यूएई पास के साथ लॉगिन करें"
  },
  welcome: {
    en: "Welcome",
    ar: "مرحباً",
    ru: "Добро пожаловать",
    hi: "स्वागत हे"
  },
  dashboard: {
    en: "Dashboard",
    ar: "لوحة القيادة",
    ru: "Панель управления",
    hi: "डैशबोर्ड"
  },
  book_repair: {
    en: "Request New Repair",
    ar: "طلب إصلاح جديد",
    ru: "Заказать ремонт",
    hi: "नई मरम्मत का अनुरोध करें"
  },
  my_repairs: {
    en: "My Repair Requests",
    ar: "طلبات الإصلاح الخاصة بي",
    ru: "Мои ремонты",
    hi: "मेरी मरम्मत के अनुरोध"
  },
  rewards: {
    en: "Rewards",
    ar: "المكافآت",
    ru: "Награды",
    hi: "पुरस्कार"
  },
  browse_rewards: {
    en: "Browse Rewards",
    ar: "تصفح المكافآت",
    ru: "Просмотреть награды",
    hi: "पुरस्कार ब्राउज़ करें"
  },
  category: {
    en: "Category",
    ar: "الفئة",
    ru: "Категория",
    hi: "श्रेणी"
  },
  description: {
    en: "Problem Description",
    ar: "وصف المشكلة",
    ru: "Описание проблемы",
    hi: "समस्या का विवरण"
  },
  item_name: {
    en: "Item Name",
    ar: "اسم العنصر",
    ru: "Название предмета",
    hi: "वस्तु का नाम"
  },
  upload_photo: {
    en: "Upload Photo",
    ar: "تحميل صورة",
    ru: "Загрузить фото",
    hi: "फोटो अपलोड करें"
  },
  submit: {
    en: "Submit Request",
    ar: "إرسال الطلب",
    ru: "Отправить запрос",
    hi: "अनुरोध जमा करें"
  },
  status: {
    en: "Status",
    ar: "الحالة",
    ru: "Статус",
    hi: "स्थिति"
  },
  points_balance: {
    en: "Points Earned",
    ar: "النقاط المكتسبة",
    ru: "Заработанные баллы",
    hi: "अंक अर्जित"
  },
  logout: {
    en: "Logout",
    ar: "تسجيل خروج",
    ru: "Выйти",
    hi: "लॉग आउट"
  },
  total_requests: {
    en: "Total Requests",
    ar: "إجمالي الطلبات",
    ru: "Всего запросов",
    hi: "कुल अनुरोध"
  },
  active_repairs: {
    en: "Active Repairs",
    ar: "الإصلاحات النشطة",
    ru: "Активные ремонты",
    hi: "सक्रिय मरम्मत"
  },
  completed: {
    en: "Completed",
    ar: "مكتمل",
    ru: "Завершено",
    hi: "पूरा हुआ"
  },
  recent_requests: {
    en: "Recent Requests",
    ar: "الطلبات الأخيرة",
    ru: "Недавние запросы",
    hi: "हाल के अनुरोध"
  },
  view_all: {
    en: "View All",
    ar: "عرض الكل",
    ru: "Посмотреть все",
    hi: "सभी देखें"
  },
  no_repairs: {
    en: "No repair requests yet",
    ar: "لا توجد طلبات إصلاح بعد",
    ru: "Запросов на ремонт пока нет",
    hi: "अभी तक कोई मरम्मत अनुरोध नहीं"
  },
  start_repair_hint: {
    en: "Start by requesting your first repair!",
    ar: "ابدأ بطلب إصلاحك الأول!",
    ru: "Начните с запроса вашего первого ремонта!",
    hi: "अपनी पहली मरम्मत का अनुरोध करके शुरुआत करें!"
  },
  refuse: {
    en: "Refuse",
    ar: "ارفض",
    ru: "Откажитесь",
    hi: "अस्वीकार"
  },
  reduce: {
    en: "Reduce",
    ar: "قلل",
    ru: "Сократите",
    hi: "कम करें"
  },
  reuse: {
    en: "Reuse",
    ar: "أعد الاستخدام",
    ru: "Используйте повторно",
    hi: "पुन: उपयोग"
  },
  repurpose: {
    en: "Repurpose",
    ar: "أعد الغرض",
    ru: "Перепрофилируйте",
    hi: "पुनर्उद्देश्य"
  },
  recycle: {
    en: "Recycle",
    ar: "أعد التدوير",
    ru: "Переработайте",
    hi: "पुनर्चक्रण"
  },
  refuse_desc: {
    en: "Say no to unnecessary items",
    ar: "قل لا للأشياء غير الضرورية",
    ru: "Скажи нет ненужным вещам",
    hi: "अनावश्यक वस्तुओं को ना कहें"
  },
  reduce_desc: {
    en: "Minimize what you consume",
    ar: "قلل ما تستهلكه",
    ru: "Минимизируйте потребление",
    hi: "आप जो उपभोग करते हैं उसे कम करें"
  },
  reuse_desc: {
    en: "Give items a second life",
    ar: "امنح الأشياء حياة ثانية",
    ru: "Дайте вещам вторую жизнь",
    hi: "वस्तुओं को दूसरा जीवन दें"
  },
  repurpose_desc: {
    en: "Transform into something new",
    ar: "حولها إلى شيء جديد",
    ru: "Превратите во что-то новое",
    hi: "कुछ नया बनाएं"
  },
  recycle_desc: {
    en: "Process materials responsibly",
    ar: "عالج المواد بمسؤولية",
    ru: "Ответственно перерабатывайте",
    hi: "सामग्री को जिम्मेदारी से संसाधित करें"
  }
};

export const INITIAL_USERS: User[] = [
  {
    id: 'a1',
    name: 'Admin Official',
    emirate: 'Dubai',
    role: UserRole.ADMIN,
    points: 0,
    repairsCount: 0,
    status: 'ACTIVE'
  }
];

export const INITIAL_TECHNICIANS: Technician[] = [];

export const INITIAL_REPAIRS: RepairRequest[] = [];

export const INITIAL_DISPOSAL_REQUESTS: DisposalRequest[] = [];

export const INITIAL_VIOLATIONS: Violation[] = [];
export type Language =
  | "en" | "es" | "zh" | "fr" | "de" | "pt" | "ar" | "ru" | "sw" | "ha" | "am"
  // Indic languages — added to give the Navbar i18n parity with the
  // patient-side dictionaries in lib/i18n/dictionaries.ts. Each Indic
  // locale here has a full nested TranslationSet so any component
  // reading from `translations[lang]` works without fallback gymnastics.
  | "hi" | "ta" | "te" | "mr" | "bn";

export interface TranslationSet {
  nav: {
    home: string;
    doctors: string;
    departments: string;
    videoConsult: string;
    blog: string;
    gallery: string;
    shop: string;
    about: string;
    contact: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  common: {
    bookNow: string;
    learnMore: string;
    readMore: string;
    search: string;
    login: string;
    signUp: string;
    submit: string;
    cancel: string;
    viewAll: string;
    loading: string;
    noResults: string;
  };
  footer: {
    forPatients: string;
    forDoctors: string;
    more: string;
    rights: string;
    findDoctors: string;
    videoConsult: string;
    labTests: string;
    surgeries: string;
    healthArticles: string;
    help: string;
    privacy: string;
    terms: string;
    directory: string;
    wiki: string;
  };
  doctors: {
    searchPlaceholder: string;
    bookAppointment: string;
    videoConsult: string;
    experience: string;
    rating: string;
    consultation: string;
    filters: string;
    allSpecialties: string;
    sortBy: string;
  };
  booking: {
    selectDate: string;
    selectTime: string;
    confirmBooking: string;
    appointmentDetails: string;
    patientName: string;
    phone: string;
    email: string;
    reason: string;
  };
}

export const translations: Record<Language, TranslationSet> = {
  en: {
    nav: { home: "Home", doctors: "Find Doctors", departments: "Departments", videoConsult: "Video Consult", blog: "Blog", gallery: "Gallery", shop: "Shop", about: "About", contact: "Contact" },
    hero: { title: "Your Health, Our Priority", subtitle: "Find and book appointments with top doctors near you" },
    common: { bookNow: "Book Now", learnMore: "Learn More", readMore: "Read More", search: "Search", login: "Login", signUp: "Sign Up", submit: "Submit", cancel: "Cancel", viewAll: "View All", loading: "Loading...", noResults: "No results found" },
    footer: { forPatients: "For Patients", forDoctors: "For Doctors", more: "More", rights: "All rights reserved.", findDoctors: "Find Doctors", videoConsult: "Video Consult", labTests: "Lab Tests", surgeries: "Surgeries", healthArticles: "Health Articles", help: "Help", privacy: "Privacy Policy", terms: "Terms & Conditions", directory: "Healthcare Directory", wiki: "OduDoc Health Wiki" },
    doctors: { searchPlaceholder: "Search doctors, specialties...", bookAppointment: "Book Appointment", videoConsult: "Video Consult", experience: "Experience", rating: "Rating", consultation: "Consultation", filters: "Filters", allSpecialties: "All Specialties", sortBy: "Sort By" },
    booking: { selectDate: "Select Date", selectTime: "Select Time", confirmBooking: "Confirm Booking", appointmentDetails: "Appointment Details", patientName: "Patient Name", phone: "Phone", email: "Email", reason: "Reason for Visit" },
  },
  es: {
    nav: { home: "Inicio", doctors: "Buscar Doctores", departments: "Departamentos", videoConsult: "Consulta Video", blog: "Blog", gallery: "Galeria", shop: "Tienda", about: "Nosotros", contact: "Contacto" },
    hero: { title: "Tu Salud, Nuestra Prioridad", subtitle: "Encuentra y reserva citas con los mejores doctores cerca de ti" },
    common: { bookNow: "Reservar Ahora", learnMore: "Saber Mas", readMore: "Leer Mas", search: "Buscar", login: "Iniciar Sesion", signUp: "Registrarse", submit: "Enviar", cancel: "Cancelar", viewAll: "Ver Todo", loading: "Cargando...", noResults: "No se encontraron resultados" },
    footer: { forPatients: "Para Pacientes", forDoctors: "Para Doctores", more: "Mas", rights: "Todos los derechos reservados.", findDoctors: "Buscar Doctores", videoConsult: "Consulta Video", labTests: "Pruebas de Laboratorio", surgeries: "Cirugias", healthArticles: "Articulos de Salud", help: "Ayuda", privacy: "Politica de Privacidad", terms: "Terminos y Condiciones", directory: "Directorio de Salud", wiki: "Wiki de Salud OduDoc" },
    doctors: { searchPlaceholder: "Buscar doctores, especialidades...", bookAppointment: "Reservar Cita", videoConsult: "Consulta Video", experience: "Experiencia", rating: "Calificacion", consultation: "Consulta", filters: "Filtros", allSpecialties: "Todas las Especialidades", sortBy: "Ordenar Por" },
    booking: { selectDate: "Seleccionar Fecha", selectTime: "Seleccionar Hora", confirmBooking: "Confirmar Reserva", appointmentDetails: "Detalles de la Cita", patientName: "Nombre del Paciente", phone: "Telefono", email: "Correo", reason: "Motivo de la Visita" },
  },
  zh: {
    nav: { home: "首页", doctors: "找医生", departments: "科室", videoConsult: "视频问诊", blog: "博客", gallery: "图库", shop: "商店", about: "关于我们", contact: "联系我们" },
    hero: { title: "您的健康，我们的使命", subtitle: "查找并预约您附近的优秀医生" },
    common: { bookNow: "立即预约", learnMore: "了解更多", readMore: "阅读更多", search: "搜索", login: "登录", signUp: "注册", submit: "提交", cancel: "取消", viewAll: "查看全部", loading: "加载中...", noResults: "未找到结果" },
    footer: { forPatients: "患者服务", forDoctors: "医生服务", more: "更多", rights: "版权所有。", findDoctors: "找医生", videoConsult: "视频问诊", labTests: "实验室检测", surgeries: "手术服务", healthArticles: "健康文章", help: "帮助中心", privacy: "隐私政策", terms: "服务条款", directory: "医疗目录", wiki: "OduDoc健康百科" },
    doctors: { searchPlaceholder: "搜索医生、专科...", bookAppointment: "预约挂号", videoConsult: "视频问诊", experience: "经验", rating: "评分", consultation: "问诊", filters: "筛选", allSpecialties: "全部专科", sortBy: "排序" },
    booking: { selectDate: "选择日期", selectTime: "选择时间", confirmBooking: "确认预约", appointmentDetails: "预约详情", patientName: "患者姓名", phone: "电话", email: "邮箱", reason: "就诊原因" },
  },
  fr: {
    nav: { home: "Accueil", doctors: "Trouver un Medecin", departments: "Departements", videoConsult: "Consultation Video", blog: "Blog", gallery: "Galerie", shop: "Boutique", about: "A propos", contact: "Contact" },
    hero: { title: "Votre Sante, Notre Priorite", subtitle: "Trouvez et prenez rendez-vous avec les meilleurs medecins" },
    common: { bookNow: "Reserver", learnMore: "En savoir plus", readMore: "Lire la suite", search: "Rechercher", login: "Se connecter", signUp: "S'inscrire", submit: "Soumettre", cancel: "Annuler", viewAll: "Voir tout", loading: "Chargement...", noResults: "Aucun resultat trouve" },
    footer: { forPatients: "Pour les Patients", forDoctors: "Pour les Medecins", more: "Plus", rights: "Tous droits reserves.", findDoctors: "Trouver un Medecin", videoConsult: "Consultation Video", labTests: "Analyses de Laboratoire", surgeries: "Chirurgies", healthArticles: "Articles de Sante", help: "Aide", privacy: "Politique de Confidentialite", terms: "Conditions Generales", directory: "Annuaire de Sante", wiki: "Wiki Sante OduDoc" },
    doctors: { searchPlaceholder: "Rechercher medecins, specialites...", bookAppointment: "Prendre Rendez-vous", videoConsult: "Consultation Video", experience: "Experience", rating: "Note", consultation: "Consultation", filters: "Filtres", allSpecialties: "Toutes les Specialites", sortBy: "Trier Par" },
    booking: { selectDate: "Choisir une Date", selectTime: "Choisir une Heure", confirmBooking: "Confirmer la Reservation", appointmentDetails: "Details du Rendez-vous", patientName: "Nom du Patient", phone: "Telephone", email: "Email", reason: "Motif de la Visite" },
  },
  de: {
    nav: { home: "Startseite", doctors: "Arzte finden", departments: "Abteilungen", videoConsult: "Video-Beratung", blog: "Blog", gallery: "Galerie", shop: "Shop", about: "Uber uns", contact: "Kontakt" },
    hero: { title: "Ihre Gesundheit, unsere Prioritat", subtitle: "Finden und buchen Sie Termine bei Top-Arzten in Ihrer Nahe" },
    common: { bookNow: "Jetzt buchen", learnMore: "Mehr erfahren", readMore: "Weiterlesen", search: "Suchen", login: "Anmelden", signUp: "Registrieren", submit: "Absenden", cancel: "Abbrechen", viewAll: "Alle anzeigen", loading: "Laden...", noResults: "Keine Ergebnisse gefunden" },
    footer: { forPatients: "Fur Patienten", forDoctors: "Fur Arzte", more: "Mehr", rights: "Alle Rechte vorbehalten.", findDoctors: "Arzte finden", videoConsult: "Video-Beratung", labTests: "Laboruntersuchungen", surgeries: "Operationen", healthArticles: "Gesundheitsartikel", help: "Hilfe", privacy: "Datenschutzrichtlinie", terms: "Allgemeine Geschaftsbedingungen", directory: "Gesundheitsverzeichnis", wiki: "OduDoc Gesundheits-Wiki" },
    doctors: { searchPlaceholder: "Arzte, Fachgebiete suchen...", bookAppointment: "Termin buchen", videoConsult: "Video-Beratung", experience: "Erfahrung", rating: "Bewertung", consultation: "Beratung", filters: "Filter", allSpecialties: "Alle Fachgebiete", sortBy: "Sortieren nach" },
    booking: { selectDate: "Datum wahlen", selectTime: "Uhrzeit wahlen", confirmBooking: "Buchung bestatigen", appointmentDetails: "Termindetails", patientName: "Patientenname", phone: "Telefon", email: "E-Mail", reason: "Besuchsgrund" },
  },
  pt: {
    nav: { home: "Inicio", doctors: "Encontrar Medicos", departments: "Departamentos", videoConsult: "Consulta por Video", blog: "Blog", gallery: "Galeria", shop: "Loja", about: "Sobre", contact: "Contato" },
    hero: { title: "Sua Saude, Nossa Prioridade", subtitle: "Encontre e agende consultas com os melhores medicos perto de voce" },
    common: { bookNow: "Agendar Agora", learnMore: "Saiba Mais", readMore: "Leia Mais", search: "Buscar", login: "Entrar", signUp: "Cadastrar", submit: "Enviar", cancel: "Cancelar", viewAll: "Ver Tudo", loading: "Carregando...", noResults: "Nenhum resultado encontrado" },
    footer: { forPatients: "Para Pacientes", forDoctors: "Para Medicos", more: "Mais", rights: "Todos os direitos reservados.", findDoctors: "Encontrar Medicos", videoConsult: "Consulta por Video", labTests: "Exames Laboratoriais", surgeries: "Cirurgias", healthArticles: "Artigos de Saude", help: "Ajuda", privacy: "Politica de Privacidade", terms: "Termos e Condicoes", directory: "Diretorio de Saude", wiki: "Wiki de Saude OduDoc" },
    doctors: { searchPlaceholder: "Buscar medicos, especialidades...", bookAppointment: "Agendar Consulta", videoConsult: "Consulta por Video", experience: "Experiencia", rating: "Avaliacao", consultation: "Consulta", filters: "Filtros", allSpecialties: "Todas as Especialidades", sortBy: "Ordenar Por" },
    booking: { selectDate: "Selecionar Data", selectTime: "Selecionar Horario", confirmBooking: "Confirmar Agendamento", appointmentDetails: "Detalhes da Consulta", patientName: "Nome do Paciente", phone: "Telefone", email: "Email", reason: "Motivo da Visita" },
  },
  ar: {
    nav: { home: "الرئيسية", doctors: "ابحث عن طبيب", departments: "الأقسام", videoConsult: "استشارة فيديو", blog: "المدونة", gallery: "المعرض", shop: "المتجر", about: "من نحن", contact: "اتصل بنا" },
    hero: { title: "صحتك أولويتنا", subtitle: "ابحث واحجز مواعيد مع أفضل الأطباء بالقرب منك" },
    common: { bookNow: "احجز الآن", learnMore: "اعرف المزيد", readMore: "اقرأ المزيد", search: "بحث", login: "تسجيل الدخول", signUp: "إنشاء حساب", submit: "إرسال", cancel: "إلغاء", viewAll: "عرض الكل", loading: "جار التحميل...", noResults: "لا توجد نتائج" },
    footer: { forPatients: "للمرضى", forDoctors: "للأطباء", more: "المزيد", rights: "جميع الحقوق محفوظة.", findDoctors: "ابحث عن طبيب", videoConsult: "استشارة فيديو", labTests: "تحاليل مختبرية", surgeries: "العمليات الجراحية", healthArticles: "مقالات صحية", help: "المساعدة", privacy: "سياسة الخصوصية", terms: "الشروط والأحكام", directory: "دليل الرعاية الصحية", wiki: "ويكي صحة OduDoc" },
    doctors: { searchPlaceholder: "ابحث عن أطباء، تخصصات...", bookAppointment: "حجز موعد", videoConsult: "استشارة فيديو", experience: "الخبرة", rating: "التقييم", consultation: "الاستشارة", filters: "التصفية", allSpecialties: "جميع التخصصات", sortBy: "ترتيب حسب" },
    booking: { selectDate: "اختر التاريخ", selectTime: "اختر الوقت", confirmBooking: "تأكيد الحجز", appointmentDetails: "تفاصيل الموعد", patientName: "اسم المريض", phone: "الهاتف", email: "البريد الإلكتروني", reason: "سبب الزيارة" },
  },
  ru: {
    nav: { home: "Главная", doctors: "Найти врача", departments: "Отделения", videoConsult: "Видеоконсультация", blog: "Блог", gallery: "Галерея", shop: "Магазин", about: "О нас", contact: "Контакты" },
    hero: { title: "Ваше здоровье — наш приоритет", subtitle: "Найдите и запишитесь к лучшим врачам рядом с вами" },
    common: { bookNow: "Записаться", learnMore: "Узнать больше", readMore: "Читать далее", search: "Поиск", login: "Войти", signUp: "Регистрация", submit: "Отправить", cancel: "Отмена", viewAll: "Смотреть все", loading: "Загрузка...", noResults: "Результатов не найдено" },
    footer: { forPatients: "Для пациентов", forDoctors: "Для врачей", more: "Ещё", rights: "Все права защищены.", findDoctors: "Найти врача", videoConsult: "Видеоконсультация", labTests: "Лабораторные анализы", surgeries: "Хирургия", healthArticles: "Статьи о здоровье", help: "Помощь", privacy: "Политика конфиденциальности", terms: "Условия использования", directory: "Медицинский справочник", wiki: "Вики здоровья OduDoc" },
    doctors: { searchPlaceholder: "Поиск врачей, специальностей...", bookAppointment: "Записаться на прием", videoConsult: "Видеоконсультация", experience: "Опыт", rating: "Рейтинг", consultation: "Консультация", filters: "Фильтры", allSpecialties: "Все специальности", sortBy: "Сортировка" },
    booking: { selectDate: "Выбрать дату", selectTime: "Выбрать время", confirmBooking: "Подтвердить запись", appointmentDetails: "Детали приема", patientName: "Имя пациента", phone: "Телефон", email: "Эл. почта", reason: "Причина визита" },
  },
  sw: {
    nav: { home: "Nyumbani", doctors: "Tafuta Daktari", departments: "Idara", videoConsult: "Ushauri wa Video", blog: "Blogu", gallery: "Picha", shop: "Duka", about: "Kuhusu", contact: "Wasiliana" },
    hero: { title: "Afya Yako, Kipaumbele Chetu", subtitle: "Tafuta na uweke miadi na madaktari bora karibu nawe" },
    common: { bookNow: "Weka Nafasi", learnMore: "Jifunze Zaidi", readMore: "Soma Zaidi", search: "Tafuta", login: "Ingia", signUp: "Jisajili", submit: "Tuma", cancel: "Ghairi", viewAll: "Ona Yote", loading: "Inapakia...", noResults: "Hakuna matokeo" },
    footer: { forPatients: "Kwa Wagonjwa", forDoctors: "Kwa Madaktari", more: "Zaidi", rights: "Haki zote zimehifadhiwa.", findDoctors: "Tafuta Daktari", videoConsult: "Ushauri wa Video", labTests: "Vipimo vya Maabara", surgeries: "Upasuaji", healthArticles: "Makala za Afya", help: "Msaada", privacy: "Sera ya Faragha", terms: "Sheria na Masharti", directory: "Saraka ya Afya", wiki: "Wiki ya Afya OduDoc" },
    doctors: { searchPlaceholder: "Tafuta madaktari, utaalamu...", bookAppointment: "Weka Miadi", videoConsult: "Ushauri wa Video", experience: "Uzoefu", rating: "Kiwango", consultation: "Ushauri", filters: "Vichujio", allSpecialties: "Utaalamu Wote", sortBy: "Panga Kwa" },
    booking: { selectDate: "Chagua Tarehe", selectTime: "Chagua Wakati", confirmBooking: "Thibitisha Nafasi", appointmentDetails: "Maelezo ya Miadi", patientName: "Jina la Mgonjwa", phone: "Simu", email: "Barua pepe", reason: "Sababu ya Ziara" },
  },
  ha: {
    nav: { home: "Gida", doctors: "Nemo Likita", departments: "Sassan", videoConsult: "Shawarar Bidiyo", blog: "Shafin Rubutu", gallery: "Dakin Hoto", shop: "Shago", about: "Game da Mu", contact: "Tuntube Mu" },
    hero: { title: "Lafiyarka, Fifikon Mu", subtitle: "Nemo kuma ka yi alƙawari da manyan likitoci kusa da kai" },
    common: { bookNow: "Yi Alƙawari", learnMore: "Ƙara Koyo", readMore: "Ƙara Karantawa", search: "Bincika", login: "Shiga", signUp: "Yi Rajista", submit: "Aika", cancel: "Soke", viewAll: "Duba Duka", loading: "Ana lodawa...", noResults: "Ba a samu sakamako ba" },
    footer: { forPatients: "Ga Marasa Lafiya", forDoctors: "Ga Likitoci", more: "Ƙari", rights: "Duk haƙƙoƙi an kiyaye su.", findDoctors: "Nemo Likita", videoConsult: "Shawarar Bidiyo", labTests: "Gwajin Dakin Gwaje-gwaje", surgeries: "Tiyata", healthArticles: "Labaran Lafiya", help: "Taimako", privacy: "Manufar Sirri", terms: "Sharuɗɗa da Yanayi", directory: "Jagoran Kiwon Lafiya", wiki: "Wiki Lafiya OduDoc" },
    doctors: { searchPlaceholder: "Nemo likitoci, ƙwarewa...", bookAppointment: "Yi Alƙawari", videoConsult: "Shawarar Bidiyo", experience: "Gogewa", rating: "Matsayi", consultation: "Shawara", filters: "Tacewa", allSpecialties: "Duk Ƙwarewa", sortBy: "Tsara Ta" },
    booking: { selectDate: "Zaɓi Kwanan Wata", selectTime: "Zaɓi Lokaci", confirmBooking: "Tabbatar da Alƙawari", appointmentDetails: "Bayanan Alƙawari", patientName: "Sunan Majiyyaci", phone: "Waya", email: "Imel", reason: "Dalilin Ziyara" },
  },
  am: {
    nav: { home: "መነሻ", doctors: "ዶክተር ፈልግ", departments: "ክፍሎች", videoConsult: "የቪዲዮ ምክር", blog: "ብሎግ", gallery: "ማዕከለ ስዕል", shop: "ሱቅ", about: "ስለ እኛ", contact: "አግኙን" },
    hero: { title: "ጤናዎ ቅድሚያ ሰጪያችን ነው", subtitle: "በአቅራቢያዎ ያሉ ምርጥ ዶክተሮችን ያግኙ እና ቀጠሮ ይያዙ" },
    common: { bookNow: "አሁን ይያዙ", learnMore: "ተጨማሪ ይወቁ", readMore: "ተጨማሪ ያንብቡ", search: "ፈልግ", login: "ግባ", signUp: "ተመዝገብ", submit: "ላክ", cancel: "ሰርዝ", viewAll: "ሁሉንም ይመልከቱ", loading: "በመጫን ላይ...", noResults: "ውጤት አልተገኘም" },
    footer: { forPatients: "ለታካሚዎች", forDoctors: "ለዶክተሮች", more: "ተጨማሪ", rights: "መብቶች በሙሉ የተጠበቁ ናቸው።", findDoctors: "ዶክተር ፈልግ", videoConsult: "የቪዲዮ ምክር", labTests: "የላብራቶሪ ምርመራ", surgeries: "ቀዶ ጥገና", healthArticles: "የጤና ጽሑፎች", help: "እርዳታ", privacy: "የግል ፖሊሲ", terms: "ውሎች እና ሁኔታዎች", directory: "የጤና ማውጫ", wiki: "OduDoc የጤና ዊኪ" },
    doctors: { searchPlaceholder: "ዶክተሮችን፣ ስፔሻሊቲዎችን ይፈልጉ...", bookAppointment: "ቀጠሮ ይያዙ", videoConsult: "የቪዲዮ ምክር", experience: "ልምድ", rating: "ደረጃ", consultation: "ምክክር", filters: "ማጣሪያዎች", allSpecialties: "ሁሉም ስፔሻሊቲዎች", sortBy: "ደርድር" },
    booking: { selectDate: "ቀን ይምረጡ", selectTime: "ሰዓት ይምረጡ", confirmBooking: "ቀጠሮ ያረጋግጡ", appointmentDetails: "የቀጠሮ ዝርዝር", patientName: "የታካሚ ስም", phone: "ስልክ", email: "ኢሜይል", reason: "የጉብኝት ምክንያት" },
  },
  hi: {
    nav: { home: "होम", doctors: "डॉक्टर खोजें", departments: "विभाग", videoConsult: "वीडियो परामर्श", blog: "ब्लॉग", gallery: "गैलरी", shop: "शॉप", about: "हमारे बारे में", contact: "संपर्क" },
    hero: { title: "आपका स्वास्थ्य, हमारी प्राथमिकता", subtitle: "अपने पास के शीर्ष डॉक्टरों से अपॉइंटमेंट खोजें और बुक करें" },
    common: { bookNow: "अभी बुक करें", learnMore: "और जानें", readMore: "और पढ़ें", search: "खोजें", login: "लॉगिन", signUp: "साइन अप", submit: "जमा करें", cancel: "रद्द करें", viewAll: "सभी देखें", loading: "लोड हो रहा है...", noResults: "कोई परिणाम नहीं मिला" },
    footer: { forPatients: "मरीजों के लिए", forDoctors: "डॉक्टरों के लिए", more: "और", rights: "सर्वाधिकार सुरक्षित।", findDoctors: "डॉक्टर खोजें", videoConsult: "वीडियो परामर्श", labTests: "लैब टेस्ट", surgeries: "सर्जरी", healthArticles: "स्वास्थ्य लेख", help: "सहायता", privacy: "गोपनीयता नीति", terms: "नियम और शर्तें", directory: "स्वास्थ्य निर्देशिका", wiki: "OduDoc हेल्थ विकी" },
    doctors: { searchPlaceholder: "डॉक्टर, विशेषज्ञता खोजें...", bookAppointment: "अपॉइंटमेंट बुक करें", videoConsult: "वीडियो परामर्श", experience: "अनुभव", rating: "रेटिंग", consultation: "परामर्श", filters: "फ़िल्टर", allSpecialties: "सभी विशेषज्ञताएँ", sortBy: "क्रमबद्ध करें" },
    booking: { selectDate: "तारीख चुनें", selectTime: "समय चुनें", confirmBooking: "बुकिंग पुष्टि करें", appointmentDetails: "अपॉइंटमेंट विवरण", patientName: "मरीज का नाम", phone: "फ़ोन", email: "ईमेल", reason: "विज़िट का कारण" },
  },
  ta: {
    nav: { home: "முகப்பு", doctors: "மருத்துவர்களைக் கண்டறி", departments: "துறைகள்", videoConsult: "வீடியோ ஆலோசனை", blog: "வலைப்பதிவு", gallery: "கேலரி", shop: "கடை", about: "எங்களைப் பற்றி", contact: "தொடர்பு" },
    hero: { title: "உங்கள் ஆரோக்கியம், எங்கள் முன்னுரிமை", subtitle: "உங்கள் அருகிலுள்ள சிறந்த மருத்துவர்களுடன் சந்திப்புகளைக் கண்டறிந்து பதிவு செய்யவும்" },
    common: { bookNow: "இப்போது பதிவு செய்", learnMore: "மேலும் அறிய", readMore: "மேலும் படிக்க", search: "தேடு", login: "உள்நுழைய", signUp: "பதிவு செய்", submit: "சமர்ப்பி", cancel: "ரத்து செய்", viewAll: "அனைத்தையும் காண்க", loading: "ஏற்றுகிறது...", noResults: "முடிவுகள் இல்லை" },
    footer: { forPatients: "நோயாளிகளுக்கு", forDoctors: "மருத்துவர்களுக்கு", more: "மேலும்", rights: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.", findDoctors: "மருத்துவர்களைக் கண்டறி", videoConsult: "வீடியோ ஆலோசனை", labTests: "ஆய்வக சோதனைகள்", surgeries: "அறுவை சிகிச்சைகள்", healthArticles: "சுகாதார கட்டுரைகள்", help: "உதவி", privacy: "தனியுரிமைக் கொள்கை", terms: "விதிமுறைகள்", directory: "சுகாதார கையேடு", wiki: "OduDoc சுகாதார விக்கி" },
    doctors: { searchPlaceholder: "மருத்துவர்கள், சிறப்புகளை தேடு...", bookAppointment: "சந்திப்பை பதிவு செய்", videoConsult: "வீடியோ ஆலோசனை", experience: "அனுபவம்", rating: "மதிப்பீடு", consultation: "ஆலோசனை", filters: "வடிகட்டிகள்", allSpecialties: "அனைத்து சிறப்புகள்", sortBy: "வரிசைப்படுத்து" },
    booking: { selectDate: "தேதியைத் தேர்ந்தெடு", selectTime: "நேரத்தைத் தேர்ந்தெடு", confirmBooking: "பதிவை உறுதி செய்", appointmentDetails: "சந்திப்பு விவரங்கள்", patientName: "நோயாளி பெயர்", phone: "தொலைபேசி", email: "மின்னஞ்சல்", reason: "வருகை காரணம்" },
  },
  te: {
    nav: { home: "హోమ్", doctors: "డాక్టర్లను కనుగొనండి", departments: "విభాగాలు", videoConsult: "వీడియో సంప్రదింపు", blog: "బ్లాగ్", gallery: "గ్యాలరీ", shop: "షాప్", about: "మా గురించి", contact: "సంప్రదించండి" },
    hero: { title: "మీ ఆరోగ్యం, మా ప్రాధాన్యత", subtitle: "మీ సమీపంలోని టాప్ డాక్టర్లతో అపాయింట్‌మెంట్‌లను కనుగొని బుక్ చేయండి" },
    common: { bookNow: "ఇప్పుడే బుక్ చేయండి", learnMore: "మరింత తెలుసుకోండి", readMore: "మరింత చదవండి", search: "శోధించు", login: "లాగిన్", signUp: "సైన్ అప్", submit: "సమర్పించు", cancel: "రద్దు చేయి", viewAll: "అన్నీ చూడండి", loading: "లోడ్ అవుతోంది...", noResults: "ఫలితాలు లేవు" },
    footer: { forPatients: "రోగుల కోసం", forDoctors: "డాక్టర్ల కోసం", more: "మరింత", rights: "అన్ని హక్కులు రిజర్వ్ చేయబడ్డాయి.", findDoctors: "డాక్టర్లను కనుగొనండి", videoConsult: "వీడియో సంప్రదింపు", labTests: "ల్యాబ్ టెస్ట్‌లు", surgeries: "శస్త్రచికిత్సలు", healthArticles: "ఆరోగ్య కథనాలు", help: "సహాయం", privacy: "గోప్యతా విధానం", terms: "నిబంధనలు", directory: "ఆరోగ్య డైరెక్టరీ", wiki: "OduDoc ఆరోగ్య వికీ" },
    doctors: { searchPlaceholder: "డాక్టర్లు, స్పెషాలిటీలను శోధించండి...", bookAppointment: "అపాయింట్‌మెంట్ బుక్ చేయండి", videoConsult: "వీడియో సంప్రదింపు", experience: "అనుభవం", rating: "రేటింగ్", consultation: "సంప్రదింపు", filters: "ఫిల్టర్‌లు", allSpecialties: "అన్ని స్పెషాలిటీలు", sortBy: "క్రమబద్ధీకరించు" },
    booking: { selectDate: "తేదీని ఎంచుకోండి", selectTime: "సమయాన్ని ఎంచుకోండి", confirmBooking: "బుకింగ్‌ని నిర్ధారించండి", appointmentDetails: "అపాయింట్‌మెంట్ వివరాలు", patientName: "రోగి పేరు", phone: "ఫోన్", email: "ఇమెయిల్", reason: "సందర్శన కారణం" },
  },
  mr: {
    nav: { home: "मुख्यपृष्ठ", doctors: "डॉक्टर शोधा", departments: "विभाग", videoConsult: "व्हिडिओ सल्ला", blog: "ब्लॉग", gallery: "गॅलरी", shop: "दुकान", about: "आमच्याबद्दल", contact: "संपर्क" },
    hero: { title: "तुमचे आरोग्य, आमची प्राथमिकता", subtitle: "तुमच्या जवळच्या उत्तम डॉक्टरांसोबत भेटी शोधा आणि बुक करा" },
    common: { bookNow: "आता बुक करा", learnMore: "अधिक जाणून घ्या", readMore: "अधिक वाचा", search: "शोधा", login: "लॉगिन", signUp: "साइन अप", submit: "सबमिट", cancel: "रद्द करा", viewAll: "सर्व पहा", loading: "लोड होत आहे...", noResults: "कोणताही परिणाम मिळाला नाही" },
    footer: { forPatients: "रुग्णांसाठी", forDoctors: "डॉक्टरांसाठी", more: "अधिक", rights: "सर्व हक्क राखीव.", findDoctors: "डॉक्टर शोधा", videoConsult: "व्हिडिओ सल्ला", labTests: "लॅब चाचण्या", surgeries: "शस्त्रक्रिया", healthArticles: "आरोग्य लेख", help: "मदत", privacy: "गोपनीयता धोरण", terms: "अटी व शर्ती", directory: "आरोग्य निर्देशिका", wiki: "OduDoc आरोग्य विकी" },
    doctors: { searchPlaceholder: "डॉक्टर, विशेषता शोधा...", bookAppointment: "अपॉइंटमेंट बुक करा", videoConsult: "व्हिडिओ सल्ला", experience: "अनुभव", rating: "रेटिंग", consultation: "सल्लामसलत", filters: "फिल्टर", allSpecialties: "सर्व विशेषता", sortBy: "क्रमवारी लावा" },
    booking: { selectDate: "तारीख निवडा", selectTime: "वेळ निवडा", confirmBooking: "बुकिंगची पुष्टी करा", appointmentDetails: "अपॉइंटमेंट तपशील", patientName: "रुग्णाचे नाव", phone: "फोन", email: "ईमेल", reason: "भेटीचे कारण" },
  },
  bn: {
    nav: { home: "হোম", doctors: "ডাক্তার খুঁজুন", departments: "বিভাগ", videoConsult: "ভিডিও পরামর্শ", blog: "ব্লগ", gallery: "গ্যালারি", shop: "শপ", about: "আমাদের সম্পর্কে", contact: "যোগাযোগ" },
    hero: { title: "আপনার স্বাস্থ্য, আমাদের অগ্রাধিকার", subtitle: "আপনার কাছাকাছি সেরা ডাক্তারদের সাথে অ্যাপয়েন্টমেন্ট খুঁজুন এবং বুক করুন" },
    common: { bookNow: "এখনই বুক করুন", learnMore: "আরও জানুন", readMore: "আরও পড়ুন", search: "অনুসন্ধান", login: "লগইন", signUp: "সাইন আপ", submit: "জমা দিন", cancel: "বাতিল", viewAll: "সব দেখুন", loading: "লোড হচ্ছে...", noResults: "কোনো ফলাফল পাওয়া যায়নি" },
    footer: { forPatients: "রোগীদের জন্য", forDoctors: "ডাক্তারদের জন্য", more: "আরও", rights: "সমস্ত অধিকার সংরক্ষিত।", findDoctors: "ডাক্তার খুঁজুন", videoConsult: "ভিডিও পরামর্শ", labTests: "ল্যাব টেস্ট", surgeries: "সার্জারি", healthArticles: "স্বাস্থ্য নিবন্ধ", help: "সাহায্য", privacy: "গোপনীয়তা নীতি", terms: "শর্তাবলী", directory: "স্বাস্থ্য ডিরেক্টরি", wiki: "OduDoc স্বাস্থ্য উইকি" },
    doctors: { searchPlaceholder: "ডাক্তার, বিশেষজ্ঞতা অনুসন্ধান করুন...", bookAppointment: "অ্যাপয়েন্টমেন্ট বুক করুন", videoConsult: "ভিডিও পরামর্শ", experience: "অভিজ্ঞতা", rating: "রেটিং", consultation: "পরামর্শ", filters: "ফিল্টার", allSpecialties: "সমস্ত বিশেষজ্ঞতা", sortBy: "সাজান" },
    booking: { selectDate: "তারিখ নির্বাচন করুন", selectTime: "সময় নির্বাচন করুন", confirmBooking: "বুকিং নিশ্চিত করুন", appointmentDetails: "অ্যাপয়েন্টমেন্ট বিবরণ", patientName: "রোগীর নাম", phone: "ফোন", email: "ইমেইল", reason: "ভিজিটের কারণ" },
  },
};

export const languageNames: Record<Language, string> = {
  en: "English",
  es: "Espanol",
  zh: "中文",
  fr: "Francais",
  de: "Deutsch",
  pt: "Portugues",
  ar: "العربية",
  ru: "Русский",
  sw: "Kiswahili",
  ha: "Hausa",
  am: "አማርኛ",
  hi: "हिन्दी",
  ta: "தமிழ்",
  te: "తెలుగు",
  mr: "मराठी",
  bn: "বাংলা",
};

export const languageCodes: Record<Language, string> = {
  en: "EN",
  es: "ES",
  zh: "ZH",
  fr: "FR",
  de: "DE",
  pt: "PT",
  ar: "AR",
  ru: "RU",
  sw: "SW",
  ha: "HA",
  am: "AM",
  hi: "HI",
  ta: "TA",
  te: "TE",
  mr: "MR",
  bn: "BN",
};

/** RTL languages */
export const rtlLanguages: Language[] = ["ar"];

export function isRTL(lang: Language): boolean {
  return rtlLanguages.includes(lang);
}

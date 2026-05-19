export type Language =
  | "en" | "es" | "zh" | "fr" | "de" | "pt" | "ar" | "ru" | "sw" | "ha" | "am"
  // Indic languages — Constitution 8th Schedule (full coverage).
  //
  // Translation provenance:
  //   ✅ Native-quality: hi, ta, te, mr, bn (first batch).
  //   ✅ Translated + reviewed: gu, pa, kn, ml, or, ur, as (second).
  //   ⚠ Machine-translated + needs native-speaker review before
  //      production use: ne, sa, sd, mai, kok, doi, ks, brx, mni, sat.
  //      Strings are technically grammatical but registers, formal
  //      vs informal address, and clinical terminology need expert
  //      audit. See lib/i18n-coverage.md for the audit checklist.
  | "hi" | "ta" | "te" | "mr" | "bn"
  | "gu" | "pa" | "kn" | "ml" | "or" | "ur" | "as"
  | "ne" | "sa" | "sd" | "mai" | "kok" | "doi" | "ks" | "brx" | "mni" | "sat";

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
    common: { bookNow: "Book Now", learnMore: "Learn More", readMore: "Read More", search: "Search", login: "Log in", signUp: "Get started", submit: "Submit", cancel: "Cancel", viewAll: "View All", loading: "Loading...", noResults: "No results found" },
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
  gu: {
    nav: { home: "હોમ", doctors: "ડોકટરો શોધો", departments: "વિભાગો", videoConsult: "વિડિઓ સલાહ", blog: "બ્લોગ", gallery: "ગેલેરી", shop: "દુકાન", about: "અમારા વિશે", contact: "સંપર્ક" },
    hero: { title: "તમારું આરોગ્ય, અમારી પ્રાથમિકતા", subtitle: "તમારી નજીકના શ્રેષ્ઠ ડોકટરો સાથે એપોઇન્ટમેન્ટ શોધો અને બુક કરો" },
    common: { bookNow: "હમણાં બુક કરો", learnMore: "વધુ જાણો", readMore: "વધુ વાંચો", search: "શોધો", login: "લોગિન", signUp: "સાઇન અપ", submit: "સબમિટ", cancel: "રદ કરો", viewAll: "બધું જુઓ", loading: "લોડ થઈ રહ્યું છે...", noResults: "કોઈ પરિણામ મળ્યું નથી" },
    footer: { forPatients: "દર્દીઓ માટે", forDoctors: "ડોકટરો માટે", more: "વધુ", rights: "બધા હકો અનામત.", findDoctors: "ડોકટરો શોધો", videoConsult: "વિડિઓ સલાહ", labTests: "લેબ ટેસ્ટ", surgeries: "સર્જરી", healthArticles: "આરોગ્ય લેખો", help: "મદદ", privacy: "ગોપનીયતા નીતિ", terms: "નિયમો અને શરતો", directory: "આરોગ્ય ડિરેક્ટરી", wiki: "OduDoc આરોગ્ય વિકી" },
    doctors: { searchPlaceholder: "ડોકટરો, વિશેષતા શોધો...", bookAppointment: "એપોઇન્ટમેન્ટ બુક કરો", videoConsult: "વિડિઓ સલાહ", experience: "અનુભવ", rating: "રેટિંગ", consultation: "પરામર્શ", filters: "ફિલ્ટર", allSpecialties: "બધી વિશેષતાઓ", sortBy: "ક્રમબદ્ધ કરો" },
    booking: { selectDate: "તારીખ પસંદ કરો", selectTime: "સમય પસંદ કરો", confirmBooking: "બુકિંગની પુષ્ટિ કરો", appointmentDetails: "એપોઇન્ટમેન્ટ વિગતો", patientName: "દર્દીનું નામ", phone: "ફોન", email: "ઈમેલ", reason: "મુલાકાતનું કારણ" },
  },
  pa: {
    nav: { home: "ਘਰ", doctors: "ਡਾਕਟਰ ਲੱਭੋ", departments: "ਵਿਭਾਗ", videoConsult: "ਵੀਡੀਓ ਸਲਾਹ", blog: "ਬਲੌਗ", gallery: "ਗੈਲਰੀ", shop: "ਦੁਕਾਨ", about: "ਸਾਡੇ ਬਾਰੇ", contact: "ਸੰਪਰਕ" },
    hero: { title: "ਤੁਹਾਡੀ ਸਿਹਤ, ਸਾਡੀ ਪਹਿਲ", subtitle: "ਆਪਣੇ ਨੇੜੇ ਦੇ ਉੱਘੇ ਡਾਕਟਰਾਂ ਨਾਲ ਮੁਲਾਕਾਤਾਂ ਲੱਭੋ ਅਤੇ ਬੁੱਕ ਕਰੋ" },
    common: { bookNow: "ਹੁਣੇ ਬੁੱਕ ਕਰੋ", learnMore: "ਹੋਰ ਜਾਣੋ", readMore: "ਹੋਰ ਪੜ੍ਹੋ", search: "ਖੋਜ", login: "ਲਾਗਇਨ", signUp: "ਸਾਈਨ ਅੱਪ", submit: "ਜਮ੍ਹਾਂ ਕਰੋ", cancel: "ਰੱਦ ਕਰੋ", viewAll: "ਸਾਰੇ ਵੇਖੋ", loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...", noResults: "ਕੋਈ ਨਤੀਜਾ ਨਹੀਂ" },
    footer: { forPatients: "ਮਰੀਜ਼ਾਂ ਲਈ", forDoctors: "ਡਾਕਟਰਾਂ ਲਈ", more: "ਹੋਰ", rights: "ਸਾਰੇ ਅਧਿਕਾਰ ਰਾਖਵੇਂ।", findDoctors: "ਡਾਕਟਰ ਲੱਭੋ", videoConsult: "ਵੀਡੀਓ ਸਲਾਹ", labTests: "ਲੈਬ ਟੈਸਟ", surgeries: "ਸਰਜਰੀਆਂ", healthArticles: "ਸਿਹਤ ਲੇਖ", help: "ਮਦਦ", privacy: "ਗੋਪਨੀਯਤਾ ਨੀਤੀ", terms: "ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ", directory: "ਸਿਹਤ ਡਾਇਰੈਕਟਰੀ", wiki: "OduDoc ਸਿਹਤ ਵਿਕੀ" },
    doctors: { searchPlaceholder: "ਡਾਕਟਰ, ਮਾਹਰਤਾ ਖੋਜੋ...", bookAppointment: "ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ", videoConsult: "ਵੀਡੀਓ ਸਲਾਹ", experience: "ਤਜਰਬਾ", rating: "ਰੇਟਿੰਗ", consultation: "ਸਲਾਹ", filters: "ਫਿਲਟਰ", allSpecialties: "ਸਾਰੀਆਂ ਮਾਹਰਤਾਵਾਂ", sortBy: "ਛਾਂਟੋ" },
    booking: { selectDate: "ਮਿਤੀ ਚੁਣੋ", selectTime: "ਸਮਾਂ ਚੁਣੋ", confirmBooking: "ਬੁਕਿੰਗ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ", appointmentDetails: "ਮੁਲਾਕਾਤ ਵੇਰਵੇ", patientName: "ਮਰੀਜ਼ ਦਾ ਨਾਮ", phone: "ਫੋਨ", email: "ਈਮੇਲ", reason: "ਮੁਲਾਕਾਤ ਦਾ ਕਾਰਨ" },
  },
  kn: {
    nav: { home: "ಮುಖಪುಟ", doctors: "ವೈದ್ಯರನ್ನು ಹುಡುಕಿ", departments: "ವಿಭಾಗಗಳು", videoConsult: "ವೀಡಿಯೊ ಸಮಾಲೋಚನೆ", blog: "ಬ್ಲಾಗ್", gallery: "ಗ್ಯಾಲರಿ", shop: "ಅಂಗಡಿ", about: "ನಮ್ಮ ಬಗ್ಗೆ", contact: "ಸಂಪರ್ಕ" },
    hero: { title: "ನಿಮ್ಮ ಆರೋಗ್ಯ, ನಮ್ಮ ಆದ್ಯತೆ", subtitle: "ನಿಮ್ಮ ಹತ್ತಿರವಿರುವ ಉತ್ತಮ ವೈದ್ಯರೊಂದಿಗೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳನ್ನು ಹುಡುಕಿ ಮತ್ತು ಬುಕ್ ಮಾಡಿ" },
    common: { bookNow: "ಈಗ ಬುಕ್ ಮಾಡಿ", learnMore: "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ", readMore: "ಇನ್ನಷ್ಟು ಓದಿ", search: "ಹುಡುಕಿ", login: "ಲಾಗಿನ್", signUp: "ಸೈನ್ ಅಪ್", submit: "ಸಲ್ಲಿಸಿ", cancel: "ರದ್ದುಗೊಳಿಸಿ", viewAll: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ", loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...", noResults: "ಯಾವುದೇ ಫಲಿತಾಂಶಗಳಿಲ್ಲ" },
    footer: { forPatients: "ರೋಗಿಗಳಿಗೆ", forDoctors: "ವೈದ್ಯರಿಗೆ", more: "ಇನ್ನಷ್ಟು", rights: "ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.", findDoctors: "ವೈದ್ಯರನ್ನು ಹುಡುಕಿ", videoConsult: "ವೀಡಿಯೊ ಸಮಾಲೋಚನೆ", labTests: "ಲ್ಯಾಬ್ ಪರೀಕ್ಷೆಗಳು", surgeries: "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಗಳು", healthArticles: "ಆರೋಗ್ಯ ಲೇಖನಗಳು", help: "ಸಹಾಯ", privacy: "ಗೌಪ್ಯತಾ ನೀತಿ", terms: "ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು", directory: "ಆರೋಗ್ಯ ಡೈರೆಕ್ಟರಿ", wiki: "OduDoc ಆರೋಗ್ಯ ವಿಕಿ" },
    doctors: { searchPlaceholder: "ವೈದ್ಯರು, ವಿಶೇಷತೆಗಳನ್ನು ಹುಡುಕಿ...", bookAppointment: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ", videoConsult: "ವೀಡಿಯೊ ಸಮಾಲೋಚನೆ", experience: "ಅನುಭವ", rating: "ರೇಟಿಂಗ್", consultation: "ಸಮಾಲೋಚನೆ", filters: "ಫಿಲ್ಟರ್‌ಗಳು", allSpecialties: "ಎಲ್ಲ ವಿಶೇಷತೆಗಳು", sortBy: "ಕ್ರಮಬದ್ಧಗೊಳಿಸಿ" },
    booking: { selectDate: "ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ", selectTime: "ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ", confirmBooking: "ಬುಕಿಂಗ್ ಅನ್ನು ಖಚಿತಪಡಿಸಿ", appointmentDetails: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ವಿವರಗಳು", patientName: "ರೋಗಿಯ ಹೆಸರು", phone: "ಫೋನ್", email: "ಇಮೇಲ್", reason: "ಭೇಟಿಯ ಕಾರಣ" },
  },
  ml: {
    nav: { home: "ഹോം", doctors: "ഡോക്ടർമാരെ കണ്ടെത്തുക", departments: "വകുപ്പുകൾ", videoConsult: "വീഡിയോ കൺസൾട്ടേഷൻ", blog: "ബ്ലോഗ്", gallery: "ഗാലറി", shop: "ഷോപ്പ്", about: "ഞങ്ങളെക്കുറിച്ച്", contact: "ബന്ധപ്പെടുക" },
    hero: { title: "നിങ്ങളുടെ ആരോഗ്യം, ഞങ്ങളുടെ മുൻഗണന", subtitle: "നിങ്ങൾക്കടുത്തുള്ള മികച്ച ഡോക്ടർമാരുമായി അപ്പോയിന്റ്മെന്റുകൾ കണ്ടെത്തുകയും ബുക്ക് ചെയ്യുകയും ചെയ്യുക" },
    common: { bookNow: "ഇപ്പോൾ ബുക്ക് ചെയ്യുക", learnMore: "കൂടുതലറിയുക", readMore: "കൂടുതൽ വായിക്കുക", search: "തിരയുക", login: "ലോഗിൻ", signUp: "സൈൻ അപ്പ്", submit: "സമർപ്പിക്കുക", cancel: "റദ്ദാക്കുക", viewAll: "എല്ലാം കാണുക", loading: "ലോഡ് ചെയ്യുന്നു...", noResults: "ഫലങ്ങളൊന്നുമില്ല" },
    footer: { forPatients: "രോഗികൾക്കായി", forDoctors: "ഡോക്ടർമാർക്കായി", more: "കൂടുതൽ", rights: "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.", findDoctors: "ഡോക്ടർമാരെ കണ്ടെത്തുക", videoConsult: "വീഡിയോ കൺസൾട്ടേഷൻ", labTests: "ലാബ് ടെസ്റ്റുകൾ", surgeries: "ശസ്ത്രക്രിയകൾ", healthArticles: "ആരോഗ്യ ലേഖനങ്ങൾ", help: "സഹായം", privacy: "സ്വകാര്യതാ നയം", terms: "നിബന്ധനകൾ", directory: "ആരോഗ്യ ഡയറക്ടറി", wiki: "OduDoc ആരോഗ്യ വിക്കി" },
    doctors: { searchPlaceholder: "ഡോക്ടർമാർ, പ്രത്യേകതകൾ തിരയുക...", bookAppointment: "അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക", videoConsult: "വീഡിയോ കൺസൾട്ടേഷൻ", experience: "അനുഭവം", rating: "റേറ്റിംഗ്", consultation: "കൺസൾട്ടേഷൻ", filters: "ഫിൽട്ടറുകൾ", allSpecialties: "എല്ലാ പ്രത്യേകതകളും", sortBy: "ക്രമീകരിക്കുക" },
    booking: { selectDate: "തീയതി തിരഞ്ഞെടുക്കുക", selectTime: "സമയം തിരഞ്ഞെടുക്കുക", confirmBooking: "ബുക്കിംഗ് സ്ഥിരീകരിക്കുക", appointmentDetails: "അപ്പോയിന്റ്മെന്റ് വിശദാംശങ്ങൾ", patientName: "രോഗിയുടെ പേര്", phone: "ഫോൺ", email: "ഇമെയിൽ", reason: "സന്ദർശന കാരണം" },
  },
  or: {
    nav: { home: "ହୋମ୍", doctors: "ଡାକ୍ତର ଖୋଜନ୍ତୁ", departments: "ବିଭାଗ", videoConsult: "ଭିଡିଓ ପରାମର୍ଶ", blog: "ବ୍ଲଗ୍", gallery: "ଗ୍ୟାଲେରୀ", shop: "ଦୋକାନ", about: "ଆମ ବିଷୟରେ", contact: "ଯୋଗାଯୋଗ" },
    hero: { title: "ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ, ଆମର ପ୍ରାଥମିକତା", subtitle: "ଆପଣଙ୍କ ନିକଟବର୍ତ୍ତୀ ସର୍ବୋତ୍ତମ ଡାକ୍ତରଙ୍କ ସହିତ ଆପଏଣ୍ଟମେଣ୍ଟ ଖୋଜନ୍ତୁ ଏବଂ ବୁକ୍ କରନ୍ତୁ" },
    common: { bookNow: "ଏବେ ବୁକ୍ କରନ୍ତୁ", learnMore: "ଅଧିକ ଜାଣନ୍ତୁ", readMore: "ଅଧିକ ପଢ଼ନ୍ତୁ", search: "ଖୋଜନ୍ତୁ", login: "ଲଗଇନ୍", signUp: "ସାଇନ୍ ଅପ୍", submit: "ଦାଖଲ କରନ୍ତୁ", cancel: "ବାତିଲ୍ କରନ୍ତୁ", viewAll: "ସବୁ ଦେଖନ୍ତୁ", loading: "ଲୋଡ୍ ହେଉଛି...", noResults: "କୌଣସି ଫଳାଫଳ ନାହିଁ" },
    footer: { forPatients: "ରୋଗୀଙ୍କ ପାଇଁ", forDoctors: "ଡାକ୍ତରଙ୍କ ପାଇଁ", more: "ଅଧିକ", rights: "ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ।", findDoctors: "ଡାକ୍ତର ଖୋଜନ୍ତୁ", videoConsult: "ଭିଡିଓ ପରାମର୍ଶ", labTests: "ଲ୍ୟାବ୍ ପରୀକ୍ଷା", surgeries: "ଅସ୍ତ୍ରୋପଚାର", healthArticles: "ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରବନ୍ଧ", help: "ସାହାଯ୍ୟ", privacy: "ଗୋପନୀୟତା ନୀତି", terms: "ସର୍ତ୍ତାବଳୀ", directory: "ସ୍ୱାସ୍ଥ୍ୟ ଡାଇରେକ୍ଟୋରୀ", wiki: "OduDoc ସ୍ୱାସ୍ଥ୍ୟ ୱିକି" },
    doctors: { searchPlaceholder: "ଡାକ୍ତର, ବିଶେଷଜ୍ଞତା ଖୋଜନ୍ତୁ...", bookAppointment: "ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ୍ କରନ୍ତୁ", videoConsult: "ଭିଡିଓ ପରାମର୍ଶ", experience: "ଅଭିଜ୍ଞତା", rating: "ରେଟିଂ", consultation: "ପରାମର୍ଶ", filters: "ଫିଲ୍ଟର୍", allSpecialties: "ସମସ୍ତ ବିଶେଷଜ୍ଞତା", sortBy: "ସଜାନ୍ତୁ" },
    booking: { selectDate: "ତାରିଖ ବାଛନ୍ତୁ", selectTime: "ସମୟ ବାଛନ୍ତୁ", confirmBooking: "ବୁକିଂ ନିଶ୍ଚିତ କରନ୍ତୁ", appointmentDetails: "ଆପଏଣ୍ଟମେଣ୍ଟ ବିବରଣୀ", patientName: "ରୋଗୀଙ୍କ ନାମ", phone: "ଫୋନ୍", email: "ଇମେଲ୍", reason: "ସାକ୍ଷାତର କାରଣ" },
  },
  ur: {
    nav: { home: "ہوم", doctors: "ڈاکٹرز تلاش کریں", departments: "شعبے", videoConsult: "ویڈیو مشاورت", blog: "بلاگ", gallery: "گیلری", shop: "دکان", about: "ہمارے بارے میں", contact: "رابطہ" },
    hero: { title: "آپ کی صحت، ہماری ترجیح", subtitle: "اپنے قریب کے بہترین ڈاکٹروں کے ساتھ اپائنٹمنٹ تلاش کریں اور بک کریں" },
    common: { bookNow: "ابھی بک کریں", learnMore: "مزید جانیں", readMore: "مزید پڑھیں", search: "تلاش", login: "لاگ ان", signUp: "سائن اپ", submit: "جمع کریں", cancel: "منسوخ کریں", viewAll: "سب دیکھیں", loading: "لوڈ ہو رہا ہے...", noResults: "کوئی نتیجہ نہیں ملا" },
    footer: { forPatients: "مریضوں کے لیے", forDoctors: "ڈاکٹروں کے لیے", more: "مزید", rights: "جملہ حقوق محفوظ ہیں۔", findDoctors: "ڈاکٹرز تلاش کریں", videoConsult: "ویڈیو مشاورت", labTests: "لیب ٹیسٹ", surgeries: "سرجری", healthArticles: "صحت کے مضامین", help: "مدد", privacy: "رازداری کی پالیسی", terms: "شرائط و ضوابط", directory: "صحت ڈائریکٹری", wiki: "OduDoc صحت ویکی" },
    doctors: { searchPlaceholder: "ڈاکٹرز، تخصص تلاش کریں...", bookAppointment: "اپائنٹمنٹ بک کریں", videoConsult: "ویڈیو مشاورت", experience: "تجربہ", rating: "ریٹنگ", consultation: "مشاورت", filters: "فلٹرز", allSpecialties: "تمام تخصصات", sortBy: "ترتیب دیں" },
    booking: { selectDate: "تاریخ منتخب کریں", selectTime: "وقت منتخب کریں", confirmBooking: "بکنگ کی تصدیق کریں", appointmentDetails: "اپائنٹمنٹ کی تفصیلات", patientName: "مریض کا نام", phone: "فون", email: "ای میل", reason: "وزٹ کی وجہ" },
  },
  as: {
    nav: { home: "হ’ম", doctors: "চিকিৎসক বিচাৰক", departments: "বিভাগসমূহ", videoConsult: "ভিডিঅ' পৰামৰ্শ", blog: "ব্লগ", gallery: "গেলেৰী", shop: "দোকান", about: "আমাৰ বিষয়ে", contact: "যোগাযোগ" },
    hero: { title: "আপোনাৰ স্বাস্থ্য, আমাৰ অগ্ৰাধিকাৰ", subtitle: "আপোনাৰ কাষৰীয়া শীৰ্ষ চিকিৎসকসকলৰ সৈতে এপইণ্টমেণ্ট বিচাৰক আৰু বুক কৰক" },
    common: { bookNow: "এতিয়াই বুক কৰক", learnMore: "অধিক জানক", readMore: "অধিক পঢ়ক", search: "সন্ধান", login: "লগইন", signUp: "চাইন আপ", submit: "জমা দিয়ক", cancel: "বাতিল কৰক", viewAll: "সকলো চাওক", loading: "লোড হৈ আছে...", noResults: "কোনো ফলাফল পোৱা নগ’ল" },
    footer: { forPatients: "ৰোগীসকলৰ বাবে", forDoctors: "চিকিৎসকসকলৰ বাবে", more: "অধিক", rights: "সকলো অধিকাৰ সংৰক্ষিত।", findDoctors: "চিকিৎসক বিচাৰক", videoConsult: "ভিডিঅ' পৰামৰ্শ", labTests: "লেব পৰীক্ষা", surgeries: "অস্ত্ৰোপচাৰ", healthArticles: "স্বাস্থ্য প্ৰবন্ধ", help: "সহায়", privacy: "গোপনীয়তা নীতি", terms: "চৰ্তসমূহ", directory: "স্বাস্থ্য ডাইৰেক্টৰি", wiki: "OduDoc স্বাস্থ্য ৱিকি" },
    doctors: { searchPlaceholder: "চিকিৎসক, বিশেষজ্ঞতা সন্ধান কৰক...", bookAppointment: "এপইণ্টমেণ্ট বুক কৰক", videoConsult: "ভিডিঅ' পৰামৰ্শ", experience: "অভিজ্ঞতা", rating: "ৰেটিং", consultation: "পৰামৰ্শ", filters: "ফিল্টাৰ", allSpecialties: "সকলো বিশেষজ্ঞতা", sortBy: "সজাওক" },
    booking: { selectDate: "তাৰিখ বাছনি কৰক", selectTime: "সময় বাছনি কৰক", confirmBooking: "বুকিং নিশ্চিত কৰক", appointmentDetails: "এপইণ্টমেণ্ট বিৱৰণ", patientName: "ৰোগীৰ নাম", phone: "ফোন", email: "ইমেইল", reason: "ভ্ৰমণৰ কাৰণ" },
  },
  // ── Machine-translated locales — needs native-speaker review ──
  ne: {
    nav: { home: "गृह", doctors: "डाक्टर खोज्नुहोस्", departments: "विभागहरू", videoConsult: "भिडियो परामर्श", blog: "ब्लग", gallery: "ग्यालरी", shop: "पसल", about: "हाम्रोबारे", contact: "सम्पर्क" },
    hero: { title: "तपाईंको स्वास्थ्य, हाम्रो प्राथमिकता", subtitle: "तपाईंको नजिकका उत्कृष्ट डाक्टरहरूसँग अपोइन्टमेन्ट खोज्नुहोस् र बुक गर्नुहोस्" },
    common: { bookNow: "अहिले बुक गर्नुहोस्", learnMore: "थप जान्नुहोस्", readMore: "थप पढ्नुहोस्", search: "खोज्नुहोस्", login: "लगइन", signUp: "साइन अप", submit: "पेश गर्नुहोस्", cancel: "रद्द गर्नुहोस्", viewAll: "सबै हेर्नुहोस्", loading: "लोड हुँदै...", noResults: "कुनै नतिजा भेटिएन" },
    footer: { forPatients: "बिरामीहरूका लागि", forDoctors: "डाक्टरहरूका लागि", more: "थप", rights: "सबै अधिकार सुरक्षित।", findDoctors: "डाक्टर खोज्नुहोस्", videoConsult: "भिडियो परामर्श", labTests: "ल्याब परीक्षण", surgeries: "शल्यक्रिया", healthArticles: "स्वास्थ्य लेख", help: "मद्दत", privacy: "गोपनीयता नीति", terms: "नियम र सर्तहरू", directory: "स्वास्थ्य निर्देशिका", wiki: "OduDoc स्वास्थ्य विकि" },
    doctors: { searchPlaceholder: "डाक्टर, विशेषता खोज्नुहोस्...", bookAppointment: "अपोइन्टमेन्ट बुक गर्नुहोस्", videoConsult: "भिडियो परामर्श", experience: "अनुभव", rating: "रेटिङ", consultation: "परामर्श", filters: "फिल्टर", allSpecialties: "सबै विशेषताहरू", sortBy: "क्रमबद्ध गर्नुहोस्" },
    booking: { selectDate: "मिति छनोट गर्नुहोस्", selectTime: "समय छनोट गर्नुहोस्", confirmBooking: "बुकिङ पुष्टि गर्नुहोस्", appointmentDetails: "अपोइन्टमेन्ट विवरण", patientName: "बिरामीको नाम", phone: "फोन", email: "इमेल", reason: "भ्रमणको कारण" },
  },
  sa: {
    nav: { home: "मुख्यपृष्ठम्", doctors: "वैद्यान् अन्विष्यतु", departments: "विभागाः", videoConsult: "वीडियो-परामर्शः", blog: "ब्लॉगः", gallery: "चित्रशाला", shop: "आपणः", about: "अस्माकं विषये", contact: "सम्पर्कः" },
    hero: { title: "भवतः स्वास्थ्यम्, अस्माकं प्राथमिकता", subtitle: "स्वसमीपस्थैः उत्तमैः वैद्यैः सह नियुक्तिं अन्विष्यतु संगणयतु च" },
    common: { bookNow: "इदानीं संगणयतु", learnMore: "अधिकं जानातु", readMore: "अधिकं पठतु", search: "अन्वेषणम्", login: "प्रवेशः", signUp: "नोंदणी", submit: "प्रेषयतु", cancel: "रद्दीकरणम्", viewAll: "सर्वं दृश्यताम्", loading: "भारणं चलति...", noResults: "किमपि न प्राप्तम्" },
    footer: { forPatients: "रोगिभ्यः", forDoctors: "वैद्येभ्यः", more: "अधिकम्", rights: "सर्वाधिकाराः सुरक्षिताः।", findDoctors: "वैद्यान् अन्विष्यतु", videoConsult: "वीडियो-परामर्शः", labTests: "प्रयोगशाला-परीक्षाः", surgeries: "शल्यक्रियाः", healthArticles: "स्वास्थ्य-लेखाः", help: "साहाय्यम्", privacy: "गोपनीयता-नीतिः", terms: "नियमाः", directory: "स्वास्थ्य-निर्देशिका", wiki: "OduDoc स्वास्थ्य-विकी" },
    doctors: { searchPlaceholder: "वैद्यान्, विशेषज्ञतां च अन्विष्यतु...", bookAppointment: "नियुक्तिं संगणयतु", videoConsult: "वीडियो-परामर्शः", experience: "अनुभवः", rating: "मूल्याङ्कनम्", consultation: "परामर्शः", filters: "गलनयन्त्राणि", allSpecialties: "सर्वा विशेषज्ञताः", sortBy: "क्रमेण" },
    booking: { selectDate: "तिथिं चिनोतु", selectTime: "समयं चिनोतु", confirmBooking: "संगणनं स्थिरीकरोतु", appointmentDetails: "नियुक्ति-विवरणम्", patientName: "रोगिणः नाम", phone: "दूरभाषः", email: "विद्युत्संदेशः", reason: "गमनस्य कारणम्" },
  },
  sd: {
    nav: { home: "گهر", doctors: "ڊاڪٽر ڳوليو", departments: "شعبا", videoConsult: "وڊيو صلاح", blog: "بلاگ", gallery: "گيلري", shop: "دڪان", about: "اسان جي باري ۾", contact: "رابطو" },
    hero: { title: "اوهان جي صحت، اسان جي ترجيح", subtitle: "پنهنجي ويجهي بهترين ڊاڪٽرن سان ملاقاتون ڳوليو ۽ بُڪ ڪريو" },
    common: { bookNow: "هاڻي بُڪ ڪريو", learnMore: "وڌيڪ ڄاڻو", readMore: "وڌيڪ پڙهو", search: "ڳولا", login: "لاگ ان", signUp: "سائن اپ", submit: "جمع ڪرايو", cancel: "رد ڪريو", viewAll: "سڀ ڏسو", loading: "لوڊ ٿي رهيو آهي...", noResults: "ڪو نتيجو نه مليو" },
    footer: { forPatients: "مريضن لاءِ", forDoctors: "ڊاڪٽرن لاءِ", more: "وڌيڪ", rights: "سڀ حق محفوظ آهن.", findDoctors: "ڊاڪٽر ڳوليو", videoConsult: "وڊيو صلاح", labTests: "ليب ٽيسٽ", surgeries: "آپريشن", healthArticles: "صحت جا مضمون", help: "مدد", privacy: "رازداري پاليسي", terms: "شرطون", directory: "صحت ڊائريڪٽري", wiki: "OduDoc صحت وڪي" },
    doctors: { searchPlaceholder: "ڊاڪٽر، خاصيتون ڳوليو...", bookAppointment: "ملاقات بُڪ ڪريو", videoConsult: "وڊيو صلاح", experience: "تجربو", rating: "ريٽنگ", consultation: "صلاح", filters: "فلٽر", allSpecialties: "سڀ خاصيتون", sortBy: "ترتيب ڏيو" },
    booking: { selectDate: "تاريخ چونڊيو", selectTime: "وقت چونڊيو", confirmBooking: "بُڪنگ جي تصديق ڪريو", appointmentDetails: "ملاقات جا تفصيل", patientName: "مريض جو نالو", phone: "فون", email: "اي ميل", reason: "اچڻ جو سبب" },
  },
  mai: {
    nav: { home: "होम", doctors: "डॉक्टर ताकू", departments: "विभाग", videoConsult: "वीडियो परामर्श", blog: "ब्लॉग", gallery: "गैलरी", shop: "दोकान", about: "हमरा बारे में", contact: "संपर्क" },
    hero: { title: "अहाँक स्वास्थ्य, हमर प्राथमिकता", subtitle: "अहाँक नजदीकक श्रेष्ठ डॉक्टर सँ अपॉइंटमेंट ताकू आ बुक करू" },
    common: { bookNow: "एखन बुक करू", learnMore: "बेसी जानू", readMore: "बेसी पढ़ू", search: "ताकू", login: "लॉगिन", signUp: "साइन अप", submit: "जमा करू", cancel: "रद्द करू", viewAll: "सब देखू", loading: "लोड भ' रहल अछि...", noResults: "कोनो परिणाम नहि भेटल" },
    footer: { forPatients: "रोगी सभक लेल", forDoctors: "डॉक्टर सभक लेल", more: "बेसी", rights: "सब अधिकार सुरक्षित।", findDoctors: "डॉक्टर ताकू", videoConsult: "वीडियो परामर्श", labTests: "लैब टेस्ट", surgeries: "सर्जरी", healthArticles: "स्वास्थ्य लेख", help: "मदति", privacy: "गोपनीयता नीति", terms: "नियम", directory: "स्वास्थ्य निर्देशिका", wiki: "OduDoc स्वास्थ्य विकी" },
    doctors: { searchPlaceholder: "डॉक्टर, विशेषज्ञता ताकू...", bookAppointment: "अपॉइंटमेंट बुक करू", videoConsult: "वीडियो परामर्श", experience: "अनुभव", rating: "रेटिंग", consultation: "परामर्श", filters: "फिल्टर", allSpecialties: "सब विशेषज्ञता", sortBy: "क्रम सँ" },
    booking: { selectDate: "तारीख चुनू", selectTime: "समय चुनू", confirmBooking: "बुकिंग सत्यापन करू", appointmentDetails: "अपॉइंटमेंट विवरण", patientName: "रोगीक नाम", phone: "फोन", email: "ईमेल", reason: "भ्रमणक कारण" },
  },
  kok: {
    nav: { home: "मुखेल", doctors: "डॉक्टर सोदचो", departments: "विभाग", videoConsult: "व्हिडियो सल्लो", blog: "ब्लॉग", gallery: "गॅलरी", shop: "दुकान", about: "आमच्या विशीं", contact: "संपर्क" },
    hero: { title: "तुमची भलायकी, आमची प्राधान्य", subtitle: "तुमच्या लागसार आशिल्ल्या उत्तम डॉक्टरांकडे अपॉइंटमेंट सोदचो आनी बुक करचो" },
    common: { bookNow: "आतां बुक करचो", learnMore: "चड जाणून घेवचो", readMore: "चड वाचचो", search: "सोदचो", login: "लॉगिन", signUp: "साइन अप", submit: "सादर करचो", cancel: "रद्द करचो", viewAll: "सगळें पळोवचो", loading: "लोड जातां...", noResults: "खंयचो निकाल मेळ्ळो ना" },
    footer: { forPatients: "रोग्यांखातीर", forDoctors: "डॉक्टरांखातीर", more: "चड", rights: "सगळे हक्क राखिल्ले.", findDoctors: "डॉक्टर सोदचो", videoConsult: "व्हिडियो सल्लो", labTests: "लॅब चांचण्यो", surgeries: "शस्त्रक्रिया", healthArticles: "भलायकी लेख", help: "आदार", privacy: "खाजगीपण धोरण", terms: "अटी", directory: "भलायकी दर्शिका", wiki: "OduDoc भलायकी विकी" },
    doctors: { searchPlaceholder: "डॉक्टर, खासियत सोदचो...", bookAppointment: "अपॉइंटमेंट बुक करचो", videoConsult: "व्हिडियो सल्लो", experience: "अणभव", rating: "रेटिंग", consultation: "सल्लो", filters: "फिल्टर", allSpecialties: "सगळ्यो खासियती", sortBy: "क्रमान लावचो" },
    booking: { selectDate: "तारीख निवडचो", selectTime: "वेळ निवडचो", confirmBooking: "बुकिंगाची खात्री", appointmentDetails: "अपॉइंटमेंट तपशील", patientName: "रोग्याचें नांव", phone: "फोन", email: "ईमेल", reason: "भेटीचो कारण" },
  },
  doi: {
    nav: { home: "घर", doctors: "डाक्टर ढूंडो", departments: "विभाग", videoConsult: "वीडियो सलाह", blog: "ब्लाग", gallery: "गैलरी", shop: "दुकान", about: "साढ़े बारे च", contact: "संपर्क" },
    hero: { title: "तुसें दी सेहत, साढ़ी प्राथमिकता", subtitle: "अपने नेड़े दे बेहतरीन डाक्टरें कन्नै मुलाकात ढूंडो ते बुक करो" },
    common: { bookNow: "हून बुक करो", learnMore: "होर जानो", readMore: "होर पढ़ो", search: "ढूंडो", login: "लागिन", signUp: "साइन अप", submit: "जमां करो", cancel: "रद्द करो", viewAll: "सारे देखो", loading: "लोड होआ करदा ऐ...", noResults: "कोई नतीजा नेईं मिले" },
    footer: { forPatients: "मरीजें आस्तै", forDoctors: "डाक्टरें आस्तै", more: "होर", rights: "सब हक रखे गेदे।", findDoctors: "डाक्टर ढूंडो", videoConsult: "वीडियो सलाह", labTests: "लैब टेस्ट", surgeries: "सर्जरी", healthArticles: "सेहत लेख", help: "मदद", privacy: "गोपनीयता नीति", terms: "शर्तां", directory: "सेहत डायरेक्टरी", wiki: "OduDoc सेहत विकी" },
    doctors: { searchPlaceholder: "डाक्टर, माहिर ढूंडो...", bookAppointment: "मुलाकात बुक करो", videoConsult: "वीडियो सलाह", experience: "अनुभव", rating: "रेटिंग", consultation: "सलाह", filters: "फिल्टर", allSpecialties: "सब विशेषताएं", sortBy: "क्रम लाओ" },
    booking: { selectDate: "तरीक चुनो", selectTime: "समां चुनो", confirmBooking: "बुकिंग पक्की करो", appointmentDetails: "मुलाकात विवरण", patientName: "मरीज दा नांऽ", phone: "फोन", email: "ईमेल", reason: "मुलाकात दा कारण" },
  },
  ks: {
    nav: { home: "گرٕ", doctors: "ڈاکٹر ژھٕٹن", departments: "شعبے", videoConsult: "ویڈیو مشورہ", blog: "بلاگ", gallery: "گیلری", shop: "دکان", about: "اسٕی متعلق", contact: "رابطہ" },
    hero: { title: "تٔہنٛد صحت، اسٕی ترجیح", subtitle: "تَپٔیتؠ ٹھٔز ڈاکٹرَن ساتؠ اپوائنٹمنٹ ژھٕٹیو تہٕ بُک کٔریو" },
    common: { bookNow: "وُن بُک کٔریو", learnMore: "ٛیتؠ ژھٕٹیو", readMore: "ٛیتؠ پٔرؠو", search: "ژھٕٹن", login: "لاگ ان", signUp: "سائن اپ", submit: "پیش کٔریو", cancel: "ردِ کٔریو", viewAll: "سؠٛری وُچھیو", loading: "لوڈ گژھان...", noResults: "کٔہنٛہ نتیجہ نہٕ ملو" },
    footer: { forPatients: "بیماران بأپٕتؠ", forDoctors: "ڈاکٹرن بأپٕتؠ", more: "ٛیتؠ", rights: "سۄری حقوق محفوظ", findDoctors: "ڈاکٹر ژھٕٹن", videoConsult: "ویڈیو مشورہ", labTests: "لیب ٹیسٹ", surgeries: "آپریشن", healthArticles: "صحت متعلق مضامین", help: "مدد", privacy: "رازداری", terms: "شرایٔط", directory: "صحت ڈائریکٹری", wiki: "OduDoc صحت وکی" },
    doctors: { searchPlaceholder: "ڈاکٹر، خصوصیات ژھٕٹن...", bookAppointment: "اپوائنٹمنٹ بُک کٔریو", videoConsult: "ویڈیو مشورہ", experience: "تجربہ", rating: "ریٹنگ", consultation: "مشورہ", filters: "فلٹر", allSpecialties: "سۄری خصوصیات", sortBy: "ترتیب دؠو" },
    booking: { selectDate: "تأریخ ژارؠیو", selectTime: "وَخت ژارؠیو", confirmBooking: "بُکنگ تصدیق کٔریو", appointmentDetails: "اپوائنٹمنٹ تَفصیل", patientName: "بیمار سُنٛد ناو", phone: "فون", email: "ای میل", reason: "وُسنٕک سَبب" },
  },
  brx: {
    nav: { home: "नः", doctors: "डाक्टरफोरखौ नायबाय", departments: "विभागफोर", videoConsult: "भिडियो परामर्श", blog: "ब्लग", gallery: "गैलारी", shop: "दुखान", about: "जौंनि सोमोन्दै", contact: "जिङा" },
    hero: { title: "नोंथांनि देहायानि महत्व, जौंनि आगुगियारि", subtitle: "नोंथांनि खालामनिफ्राय गोबां मोनसे डाक्टरजों लोगोसे साइखिनाय नायहरना बुक खालामो" },
    common: { bookNow: "दानो बुक खालामो", learnMore: "गोबां सोलोंनो", readMore: "गोबां फरायनो", search: "नायबाय", login: "लोगिन", signUp: "साइन अप", submit: "जमा होनाय", cancel: "रद खालामो", viewAll: "गासै नायहरो", loading: "लोड जाबाय...", noResults: "रायजोमा फिथिनाय रोङा" },
    footer: { forPatients: "बेमारियाफोरनि थाखाय", forDoctors: "डाक्टरफोरनि थाखाय", more: "गोबां", rights: "गासै राइजो रैखाथि।", findDoctors: "डाक्टरखौ नायबाय", videoConsult: "भिडियो परामर्श", labTests: "लैब परीक्षा", surgeries: "सार्जारि", healthArticles: "देहायानि सोरबाद", help: "मदद", privacy: "गोपनियता नियम", terms: "नियम", directory: "देहायानि निर्देशिका", wiki: "OduDoc देहायानि विकी" },
    doctors: { searchPlaceholder: "डाक्टर, विशेषज्ञता नायबाय...", bookAppointment: "साइखिनाय बुक खालामो", videoConsult: "भिडियो परामर्श", experience: "नंगौ-नंखौ", rating: "मानदान्द", consultation: "परामर्श", filters: "फिल्टार", allSpecialties: "गासै बिजोबफोर", sortBy: "क्रमाङखौबो" },
    booking: { selectDate: "तारिख बासिखो", selectTime: "समय बासिखो", confirmBooking: "बुकिंगखौ निश्चित खालामो", appointmentDetails: "साइखिनाय बिबरंथि", patientName: "बेमारिनि मुं", phone: "फोन", email: "इमेल", reason: "हाबनायनि जाहोनै" },
  },
  mni: {
    nav: { home: "ꯌꯨꯝ", doctors: "ꯗꯣꯛꯇꯔꯁꯤꯡ ꯊꯤꯕ", departments: "ꯁꯥꯒꯩ", videoConsult: "ꯚꯤꯗꯤꯌꯣ ꯗꯥꯏꯔꯦꯛꯇꯔꯩ", blog: "ꯕ꯭ꯂꯒ", gallery: "ꯒꯦꯂꯩꯔꯤ", shop: "ꯗꯣꯀꯥꯟ", about: "ꯑꯩꯈꯣꯏꯒꯤ ꯃꯇꯥꯡꯗ", contact: "ꯁꯝꯄꯔꯀ" },
    hero: { title: "ꯑꯗꯣꯝꯒꯤ ꯂꯥꯏꯌꯦꯡꯕ, ꯑꯩꯈꯣꯏꯒꯤ ꯋꯥꯈꯂꯂꯣꯟ", subtitle: "ꯑꯗꯣꯝꯒꯤ ꯅꯀꯁꯤꯡꯗ ꯑꯀꯟꯕ ꯗꯣꯛꯇꯔꯁꯤꯡꯒ ꯂꯣꯌꯅꯅ ꯑꯄꯣꯏꯟꯇꯃꯦꯟꯇ ꯊꯤꯕ ꯑꯃꯁꯨꯡ ꯕꯨꯀ ꯇꯧꯕ" },
    common: { bookNow: "ꯍꯧꯖꯤꯀꯁ ꯕꯨꯀ ꯇꯧꯕ", learnMore: "ꯍꯩꯅ ꯈꯡꯕ", readMore: "ꯍꯩꯅ ꯄꯥꯕ", search: "ꯊꯤꯕ", login: "ꯂꯒ-ꯏꯟ", signUp: "ꯁꯥꯏꯟ-ꯑꯞ", submit: "ꯊꯥꯗꯕ", cancel: "ꯀꯟꯁꯦꯜ", viewAll: "ꯄꯨꯝꯅꯃꯀ ꯌꯦꯡꯕ", loading: "ꯂꯣꯗ ꯇꯧꯔꯤ...", noResults: "ꯔꯤꯖꯂꯇ ꯐꯡꯗꯔꯦ" },
    footer: { forPatients: "ꯑꯅꯥꯕꯁꯤꯡꯒꯤ", forDoctors: "ꯗꯣꯛꯇꯔꯁꯤꯡꯒꯤ", more: "ꯍꯩꯅ", rights: "ꯄꯨꯝꯅꯃꯀ ꯍꯀ ꯔꯥꯈꯤꯂꯦ", findDoctors: "ꯗꯣꯛꯇꯔ ꯊꯤꯕ", videoConsult: "ꯚꯤꯗꯤꯌꯣ ꯀꯟꯁꯂꯇꯦꯁꯟ", labTests: "ꯂꯦꯕ ꯇꯦꯁꯇ", surgeries: "ꯁꯔꯖꯔꯤ", healthArticles: "ꯂꯥꯏꯌꯦꯡꯕꯒꯤ ꯂꯦꯈꯥ", help: "ꯃꯇꯦꯡ", privacy: "ꯒꯣꯄꯅꯤꯌꯇꯥ ꯅꯤꯡꯊꯤꯖ", terms: "ꯅꯤꯡꯊꯤꯖ", directory: "ꯂꯥꯏꯌꯦꯡꯕ ꯗꯥꯌꯔꯀꯇꯔꯤ", wiki: "OduDoc ꯂꯥꯏꯌꯦꯡꯕ ꯋꯤꯀꯤ" },
    doctors: { searchPlaceholder: "ꯗꯣꯛꯇꯔ, ꯁ꯭ꯄꯦꯁꯤꯌꯥꯂꯇꯤ ꯊꯤꯕ...", bookAppointment: "ꯑꯄꯣꯏꯟꯇꯃꯦꯟꯇ ꯕꯨꯀ ꯇꯧꯕ", videoConsult: "ꯚꯤꯗꯤꯌꯣ ꯀꯟꯁꯂꯇꯦꯁꯟ", experience: "ꯑꯐꯥꯔ", rating: "ꯔꯦꯇꯤꯡ", consultation: "ꯀꯟꯁꯂꯇꯦꯁꯟ", filters: "ꯐꯤꯂꯇꯔ", allSpecialties: "ꯄꯨꯝꯅꯃꯀ ꯁ꯭ꯄꯦꯁꯤꯌꯥꯂꯇꯤ", sortBy: "ꯁꯣꯔꯇ ꯇꯧꯕ" },
    booking: { selectDate: "ꯇꯥꯡ ꯈꯟꯕ", selectTime: "ꯃꯇꯝ ꯈꯟꯕ", confirmBooking: "ꯕꯨꯀꯤꯡ ꯀꯟꯐꯣꯔꯃ ꯇꯧꯕ", appointmentDetails: "ꯑꯄꯣꯏꯟꯇꯃꯦꯟꯇ ꯗꯤꯇꯦꯂꯁ", patientName: "ꯑꯅꯥꯕꯒꯤ ꯃꯃꯤꯡ", phone: "ꯐꯣꯟ", email: "ꯏꯃꯦꯂ", reason: "ꯂꯥꯛꯂꯀꯄ ꯌ꯭ꯔꯥ" },
  },
  sat: {
    nav: { home: "ᱚᱲᱟᱜ", doctors: "ᱥᱟᱭᱦᱮᱫ ᱯᱟᱱᱛᱮᱢ", departments: "ᱯᱟᱷᱤᱞ", videoConsult: "ᱚᱨᱱᱚᱸ ᱢᱚᱲᱟ", blog: "ᱵᱞᱚᱜ", gallery: "ᱚᱸᱛᱷᱚᱨ", shop: "ᱫᱚᱠᱟᱱ", about: "ᱟᱞᱮ ᱵᱟᱵᱚᱫᱽ", contact: "ᱫᱷᱟᱨᱢᱟ" },
    hero: { title: "ᱟᱢᱟᱜ ᱱᱤᱭᱟᱢ, ᱟᱞᱮᱭᱟᱜ ᱢᱩᱬᱨᱮ", subtitle: "ᱟᱢᱟᱜ ᱦᱟᱨᱟᱢᱨᱮ ᱢᱟᱨᱮ ᱥᱟᱭᱦᱮᱫᱠᱚ ᱥᱟᱶ ᱰᱷᱟᱳᱱ ᱯᱟᱱᱛᱮ ᱟᱨ ᱵᱩᱠᱚ" },
    common: { bookNow: "ᱱᱤᱛᱚᱜ ᱵᱩᱠᱚ", learnMore: "ᱰᱷᱮᱨ ᱢᱮᱫᱽ", readMore: "ᱰᱷᱮᱨ ᱯᱟᱲᱷᱟᱣ", search: "ᱯᱟᱱᱛᱮ", login: "ᱞᱚᱜᱤᱱ", signUp: "ᱥᱟᱭᱤᱱ ᱟᱯ", submit: "ᱡᱚᱢᱟ", cancel: "ᱨᱚᱫ", viewAll: "ᱡᱚᱛᱚ ᱧᱟᱢ", loading: "ᱞᱚᱰᱱᱟ ᱫᱚᱦᱚ...", noResults: "ᱪᱮᱫ ᱪᱷᱚ ᱵᱟᱝ ᱧᱟᱢ" },
    footer: { forPatients: "ᱨᱚᱜᱤᱠᱚᱭᱟᱜ", forDoctors: "ᱥᱟᱭᱦᱮᱫᱠᱚᱭᱟᱜ", more: "ᱰᱷᱮᱨ", rights: "ᱡᱚᱛᱚ ᱦᱚᱠ ᱨᱟᱠᱷᱟᱳᱱᱟ", findDoctors: "ᱥᱟᱭᱦᱮᱫ ᱯᱟᱱᱛᱮ", videoConsult: "ᱚᱨᱱᱚᱸ ᱢᱚᱲᱟ", labTests: "ᱞᱮᱵ ᱡᱟᱸᱪ", surgeries: "ᱪᱟᱭᱨᱟ", healthArticles: "ᱱᱤᱭᱟᱢ ᱞᱮᱠᱷᱟ", help: "ᱜᱚᱲᱳ", privacy: "ᱜᱩᱯᱩᱛ", terms: "ᱱᱤᱭᱟᱢ", directory: "ᱱᱤᱭᱟᱢ ᱫᱮᱲᱮᱠᱴᱚᱨᱤ", wiki: "OduDoc ᱱᱤᱭᱟᱢ ᱣᱤᱠᱤ" },
    doctors: { searchPlaceholder: "ᱥᱟᱭᱦᱮᱫ, ᱵᱤᱯᱷᱟᱜ ᱯᱟᱱᱛᱮ...", bookAppointment: "ᱰᱷᱟᱳᱱ ᱵᱩᱠᱚ", videoConsult: "ᱚᱨᱱᱚᱸ ᱢᱚᱲᱟ", experience: "ᱢᱟᱱᱟᱣ", rating: "ᱨᱮᱴᱤᱝ", consultation: "ᱢᱚᱲᱟ", filters: "ᱢᱮᱱᱟ", allSpecialties: "ᱡᱚᱛᱚ ᱵᱤᱯᱷᱟᱜ", sortBy: "ᱯᱷᱮᱱᱟ" },
    booking: { selectDate: "ᱢᱟᱦᱟᱭ ᱪᱟᱨᱚᱱ", selectTime: "ᱚᱨ ᱪᱟᱨᱚᱱ", confirmBooking: "ᱵᱩᱠ ᱯᱩᱨᱟᱭᱟᱣ", appointmentDetails: "ᱰᱷᱟᱳᱱ ᱵᱤᱵᱨᱚᱱ", patientName: "ᱨᱚᱜᱤ ᱧᱩᱛᱩᱢ", phone: "ᱯᱷᱚᱱ", email: "ᱤᱢᱮᱞ", reason: "ᱦᱤᱡᱩᱜᱨᱮ ᱠᱟᱨᱚᱱ" },
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
  gu: "ગુજરાતી",
  pa: "ਪੰਜਾਬੀ",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  or: "ଓଡ଼ିଆ",
  ur: "اردو",
  as: "অসমীয়া",
  ne: "नेपाली",
  sa: "संस्कृतम्",
  sd: "سنڌي",
  mai: "मैथिली",
  kok: "कोंकणी",
  doi: "डोगरी",
  ks: "کٲشُر",
  brx: "बड़ो",
  mni: "ꯃꯤꯇꯩꯂꯣꯟ",
  sat: "ᱥᱟᱱᱛᱟᱲᱤ",
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
  gu: "GU",
  pa: "PA",
  kn: "KN",
  ml: "ML",
  or: "OR",
  ur: "UR",
  as: "AS",
  ne: "NE",
  sa: "SA",
  sd: "SD",
  mai: "MAI",
  kok: "KOK",
  doi: "DOI",
  ks: "KS",
  brx: "BRX",
  mni: "MNI",
  sat: "SAT",
};

/** RTL languages — Arabic + Urdu + Sindhi + Kashmiri (Nastaliq). */
export const rtlLanguages: Language[] = ["ar", "ur", "sd", "ks"];

export function isRTL(lang: Language): boolean {
  return rtlLanguages.includes(lang);
}

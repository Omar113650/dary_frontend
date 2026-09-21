export type Locale = 'ar' | 'en';

export type Direction = 'rtl' | 'ltr';

export interface TranslationStrings {
  // Navigation
  nav_home: string;
  nav_properties: string;
  nav_about: string;
  nav_login: string;
  nav_register: string;
  nav_dashboard: string;
  auth_tenant_only_title: string;
  auth_tenant_only_desc: string;
  auth_logout_btn: string;
  loading: string;
  site_name: string;

  // Page titles
  page_home_title: string;
  page_properties_title: string;
  page_property_details_title: string;
  page_about_title: string;

  // About Page
  about_hero_title: string;
  about_hero_subtitle: string;
  about_purpose_tagline: string;
  about_purpose_title: string;
  about_mission_label: string;
  about_mission_title: string;
  about_mission_desc: string;
  about_vision_label: string;
  about_vision_title: string;
  about_vision_desc: string;

  // Hero
  hero_kicker: string;
  hero_headline: string;
  hero_subtitle: string;
  hero_search_placeholder: string;

  // Search
  search_location: string;
  search_type: string;
  search_price: string;
  search_button: string;
  search_all_locations: string;
  search_all_types: string;
  search_all_prices: string;

  // Trust Features
  trust_tagline: string;
  trust_heading: string;
  trust_easiest: string;
  trust_easiest_desc: string;
  trust_direct: string;
  trust_direct_desc: string;
  trust_trusted: string;
  trust_trusted_desc: string;
  trust_community: string;
  trust_safe_env: string;
  trust_trusted_props: string;

  // Featured Properties
  featured_tagline: string;
  featured_title: string;
  featured_view: string;

  // How It Works
  how_tagline: string;
  how_title: string;
  how_step1: string;
  how_step1_desc: string;
  how_step2: string;
  how_step2_desc: string;
  how_step3: string;
  how_step3_desc: string;

  // Why DARY
  why_tagline: string;
  why_title: string;
  why_direct: string;
  why_direct_desc: string;
  why_time: string;
  why_time_desc: string;
  why_cost: string;
  why_cost_desc: string;
  why_transparent: string;
  why_transparent_desc: string;

  // CTA
  cta_eyebrow: string;
  cta_title: string;
  cta_desc: string;
  cta_button: string;

  // Footer
  footer_desc: string;
  footer_links_title: string;
  footer_language_title: string;
  footer_social_title: string;
  footer_copyright: string;

  // Property details
  per_month: string;
  bedrooms_label: string;
  bathrooms_label: string;

  // Properties Page
  properties_subtitle: string;
  properties_filter_all: string;
  properties_filter_bedrooms: string;
  properties_filter_search_placeholder: string;
  properties_filter_location: string;
  properties_filter_type: string;
  properties_filter_price: string;
  properties_sort_by: string;
  properties_sort_recommended: string;
  properties_sort_price_asc: string;
  properties_sort_price_desc: string;
  properties_results_count: string;
  properties_reset_filters: string;
  properties_empty_title: string;
  properties_empty_desc: string;
  properties_error_title: string;
  properties_error_desc: string;
  properties_error_retry: string;
  properties_mobile_filters_btn: string;
  properties_mobile_close: string;
  properties_apply_filters: string;
  properties_bedrooms_any: string;
  properties_bedrooms_1: string;
  properties_bedrooms_2: string;
  properties_bedrooms_3plus: string;

  // Auth
  auth_login_eyebrow: string;
  auth_login_title: string;
  auth_login_subtitle: string;
  auth_register_eyebrow: string;
  auth_register_title: string;
  auth_register_subtitle: string;
  auth_name_label: string;
  auth_name_placeholder: string;
  auth_email_label: string;
  auth_email_placeholder: string;
  auth_password_label: string;
  auth_password_placeholder: string;
  auth_confirm_password_label: string;
  auth_confirm_password_placeholder: string;
  auth_remember_me: string;
  auth_forgot_password: string;
  auth_login_button: string;
  auth_register_button: string;
  auth_divider_or: string;
  auth_google_login: string;
  auth_google_register: string;
  auth_no_account: string;
  auth_create_account_link: string;
  auth_have_account: string;
  auth_login_link: string;
  auth_role_label: string;
  auth_role_tenant: string;
  auth_role_owner: string;
  auth_first_name_label: string;
  auth_first_name_placeholder: string;
  auth_last_name_label: string;
  auth_last_name_placeholder: string;
  auth_phone_label: string;
  auth_phone_placeholder: string;
  auth_phone_hint: string;
  auth_whatsapp_label: string;
  auth_whatsapp_placeholder: string;
  auth_password_rules: string;
  auth_otp_title: string;
  auth_otp_subtitle: string;
  auth_otp_label: string;
  auth_otp_button: string;
  auth_otp_resend: string;
  auth_otp_resend_countdown: string;
  auth_otp_success_msg: string;
  auth_brand_badge: string;
  auth_brand_tagline: string;
  auth_brand_feature1: string;
  auth_brand_feature2: string;
  auth_brand_feature3: string;
  auth_back_home: string;
  auth_forgot_title: string;
  auth_forgot_subtitle: string;
  auth_forgot_btn: string;
  auth_forgot_success_title: string;
  auth_forgot_success_desc: string;
  auth_reset_title: string;
  auth_reset_subtitle: string;
  auth_reset_btn: string;
  auth_reset_success_title: string;
  auth_reset_success_desc: string;
  auth_reset_invalid_token: string;
  auth_back_to_login: string;
  auth_new_password_label: string;

  // Profile Security
  sec_title: string;
  sec_subtitle: string;
  sec_pwd_title: string;
  sec_pwd_desc: string;
  sec_pwd_btn: string;
  sec_pwd_sending: string;
  sec_pwd_sent: string;
  sec_pwd_goto_reset: string;
  sec_del_title: string;
  sec_del_perm_pending_title: string;
  sec_del_perm_pending_desc: string;
  sec_del_contact_support: string;
  sec_del_desc: string;
  sec_del_btn: string;
  sec_del_modal_title: string;
  sec_del_modal_warning: string;
  sec_del_modal_confirm_phrase: string;
  sec_del_modal_cancel: string;
  sec_del_modal_confirm_btn: string;
  sec_del_deleting: string;
  sec_del_error_403: string;
  sec_del_error_generic: string;
}

export const translations: Record<Locale, TranslationStrings> = {
  ar: {
    nav_home: 'الرئيسية',
    nav_properties: 'العقارات',
    nav_about: 'عن داري',
    nav_login: 'تسجيل الدخول',
    nav_register: 'إنشاء حساب',
    nav_dashboard: 'لوحة التحكم',
    auth_tenant_only_title: 'لوحة تحكم المستأجرين',
    auth_tenant_only_desc: 'هذه الصفحة مخصصة لحسابات الطلاب والمستأجرين فقط.',
    auth_logout_btn: 'تسجيل الخروج',
    loading: 'جاري التحميل...',
    site_name: 'داري',

    page_home_title: 'الرئيسية',
    page_properties_title: 'العقارات',
    page_property_details_title: 'تفاصيل العقار',
    page_about_title: 'عن داري',

    // About Page
    about_hero_title: 'عن داري',
    about_hero_subtitle: 'نعمل على تبسيط تجربة السكن الطلابي وربط الطلاب بالسكن المناسب بطريقة أوضح وأسهل.',
    about_purpose_tagline: 'رؤيتنا ورسالتنا',
    about_purpose_title: 'نبني تجربة سكن طلابي استثنائية',
    about_mission_label: 'رسالتنا',
    about_mission_title: 'تسهيل تجربة السكن الطلابي',
    about_mission_desc: 'تسهيل تجربة السكن الطلابي من خلال منصة موثوقة تربطهم مباشرة بأصحاب الشقق، وتوفر وقتهم وتقلل التكاليف وتضمن تجربة حجز آمنة وشفافة بدون وسطاء.',
    about_vision_label: 'رؤيتنا',
    about_vision_title: 'المنصة الأكثر ثقة للمغتربين',
    about_vision_desc: 'أن نكون المنصة الأكثر ثقة التي تحل مشاكل السكن للمغتربين.',

    hero_kicker: 'مرحباً بك في داري',
    hero_headline: 'أكثر من مجرد سكن\nمجتمع يبني مستقبلك',
    hero_subtitle: 'اكتشف أفضل خيارات السكن للطلاب في مكان واحد',
    hero_search_placeholder: 'ابحث عن مدينة، جامعة أو منطقة...',

    search_location: 'الموقع',
    search_type: 'نوع العقار',
    search_price: 'السعر',
    search_button: 'البحث',
    search_all_locations: 'جميع المواقع',
    search_all_types: 'جميع الأنواع',
    search_all_prices: 'جميع الأسعار',

    trust_tagline: 'قيمنا الأساسية',
    trust_heading: 'تجربة سكن طلابي مصممة لراحتك',
    trust_easiest: 'أسهل',
    trust_easiest_desc: 'البحث عن السكن المناسب من خلال تجربة بسيطة وواضحة.',
    trust_direct: 'مباشر',
    trust_direct_desc: 'تواصل مباشرة مع أصحاب الشقق بدون وسطاء.',
    trust_trusted: 'موثوق',
    trust_trusted_desc: 'تجربة سكن موثوقة وشفافة مصممة خصيصاً للطلاب.',
    trust_community: 'مجتمع طلابي مميز',
    trust_safe_env: 'بيئة آمنة',
    trust_trusted_props: 'عقارات موثوقة',

    featured_tagline: 'مختارات مميزة',
    featured_title: 'عقارات مميزة للطلاب',
    featured_view: 'عرض التفاصيل',

    how_tagline: 'خطوات بسيطة',
    how_title: 'كيف يعمل داري',
    how_step1: 'إبحث',
    how_step1_desc: 'تصفح الخيارات المتاحة وقارن بين المواقع والأسعار بكل وضوح.',
    how_step2: 'تواصل',
    how_step2_desc: 'تواصل مباشرة مع المالك لطرح استفساراتك وترتيب المعاينة.',
    how_step3: 'اختر',
    how_step3_desc: 'اختر السكن الملائم لميزانيتك وقربك من جامعتك بكل ثقة.',

    why_tagline: 'ميزتنا',
    why_title: 'لماذا يختار الطلاب داري',
    why_direct: 'تواصل مباشر مع الملاك',
    why_direct_desc: 'تواصل فوري ومباشر مع أصحاب الشقق دون تدخل وسطاء أو عمولات غير مبررة.',
    why_time: 'توفير الوقت والجهد',
    why_time_desc: 'استكشف وقارن جميع خيارات السكن في منصة واحدة منظمة وسريعة.',
    why_cost: 'تقليل التكاليف الإضافية',
    why_cost_desc: 'أسعار واضحة مباشرة من المالك تمنحك الشفافية المالية دون رسوم خفية.',
    why_transparent: 'تجربة سكن شفافة',
    why_transparent_desc: 'بيانات وتفاصيل واقعية عن الغرف والخدمات لمساعدتك في اتخاذ القرار الأنسب.',

    cta_eyebrow: 'جاهز تبدأ؟',
    cta_title: 'ابدأ بالبحث عن سكنك الطلابي اليوم',
    cta_desc: 'اكتشف شقق واستوديوهات قريبة من جامعتك وتواصل مباشرة مع أصحاب العقارات.',
    cta_button: 'تصفح جميع العقارات',

    footer_desc: 'داري منصة سكن طلابي بتسهّل عليك الوصول للسكن المناسب، بمعلومات واضحة وتواصل مباشر مع المالك.',
    footer_links_title: 'روابط سريعة',
    footer_language_title: 'اللغة',
    footer_social_title: 'تابعنا',
    footer_copyright: '© 2026 داري — جميع الحقوق محفوظة.',

    per_month: '/شهر',
    bedrooms_label: 'غرف',
    bathrooms_label: 'حمامات',

    // Properties Page
    properties_subtitle: 'اكتشف السكن المناسب لك بالقرب من جامعتك.',
    properties_filter_all: 'الكل',
    properties_filter_bedrooms: 'عدد الغرف',
    properties_filter_search_placeholder: 'ابحث بالاسم، المدينة، أو الجامعة...',
    properties_filter_location: 'الموقع',
    properties_filter_type: 'نوع السكن',
    properties_filter_price: 'الميزانية',
    properties_sort_by: 'ترتيب حسب',
    properties_sort_recommended: 'الموصى بها',
    properties_sort_price_asc: 'السعر: من الأقل للأعلى',
    properties_sort_price_desc: 'السعر: من الأعلى للأقل',
    properties_results_count: 'عقار متوفر',
    properties_reset_filters: 'إعادة ضبط الفلاتر',
    properties_empty_title: 'لا توجد عقارات تطابق بحثك.',
    properties_empty_desc: 'جرّب تغيير خيارات البحث أو إعادة ضبط الفلاتر للوصول إلى خيارات أكثر.',
    properties_error_title: 'تعذر تحميل العقارات',
    properties_error_desc: 'تعذر الاتصال بالخادم في الوقت الحالي. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
    properties_error_retry: 'إعادة المحاولة',
    properties_mobile_filters_btn: 'تصفية النتائج',
    properties_mobile_close: 'إغلاق',
    properties_apply_filters: 'عرض النتائج',
    properties_bedrooms_any: 'أي عدد',
    properties_bedrooms_1: 'غرفة واحدة',
    properties_bedrooms_2: 'غرفتان',
    properties_bedrooms_3plus: '3 غرف أو أكثر',

    // Auth
    auth_login_eyebrow: 'مرحبًا بعودتك',
    auth_login_title: 'تسجيل الدخول',
    auth_login_subtitle: 'سجّل دخولك للوصول إلى حسابك ومتابعة خيارات السكن المناسبة لك.',
    auth_register_eyebrow: 'ابدأ رحلتك مع داري',
    auth_register_title: 'إنشاء حساب',
    auth_register_subtitle: 'أنشئ حسابك لاستكشاف السكن المناسب لك بسهولة.',
    auth_name_label: 'الاسم الكامل',
    auth_name_placeholder: 'أحمد محمد',
    auth_email_label: 'البريد الإلكتروني',
    auth_email_placeholder: 'name@example.com',
    auth_password_label: 'كلمة المرور',
    auth_password_placeholder: '••••••••',
    auth_confirm_password_label: 'تأكيد كلمة المرور',
    auth_confirm_password_placeholder: '••••••••',
    auth_remember_me: 'تذكرني',
    auth_forgot_password: 'نسيت كلمة المرور؟',
    auth_login_button: 'تسجيل الدخول',
    auth_register_button: 'إنشاء حساب',
    auth_divider_or: 'أو',
    auth_google_login: 'المتابعة باستخدام Google',
    auth_google_register: 'التسجيل باستخدام Google',
    auth_no_account: 'ليس لديك حساب؟',
    auth_create_account_link: 'إنشاء حساب',
    auth_have_account: 'لديك حساب بالفعل؟',
    auth_login_link: 'تسجيل الدخول',
    auth_role_label: 'نوع الحساب',
    auth_role_tenant: 'طالب / مستأجر',
    auth_role_owner: 'مالك عقار',
    auth_first_name_label: 'الاسم الأول',
    auth_first_name_placeholder: 'أحمد',
    auth_last_name_label: 'اسم العائلة',
    auth_last_name_placeholder: 'محمد',
    auth_phone_label: 'رقم الهاتف',
    auth_phone_placeholder: '+20 10 1234 5678',
    auth_phone_hint: 'أدخل رقمك مسبوقاً برمز الدولة (مثال: +20...)',
    auth_whatsapp_label: 'رقم الواتساب (اختياري)',
    auth_whatsapp_placeholder: '+20 10 1234 5678',
    auth_password_rules: '8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص',
    auth_otp_title: 'تأكيد الحساب (رمز OTP)',
    auth_otp_subtitle: 'أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني لتفعيل حسابك.',
    auth_otp_label: 'رمز التحقق (OTP)',
    auth_otp_button: 'تأكيد الحساب والمتابعة',
    auth_otp_resend: 'إعادة إرسال الرمز',
    auth_otp_resend_countdown: 'يمكنك طلب رمز جديد بعد',
    auth_otp_success_msg: 'تم تأكيد بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.',
    auth_brand_badge: 'داري للسكن الطلابي',
    auth_brand_tagline: 'سكنك الطلابي الأنسب، بخطوات أوضح وأسهل',
    auth_brand_feature1: 'تواصل مباشر مع المالك',
    auth_brand_feature2: 'عقارات مناسبة لميزانيتك',
    auth_brand_feature3: 'خيارات سكنية قريبة من جامعتك',
    auth_back_home: 'العودة للرئيسية',
    auth_forgot_title: 'استعادة كلمة المرور',
    auth_forgot_subtitle: 'أدخل بريدك الإلكتروني وسنساعدك على استعادة حسابك.',
    auth_forgot_btn: 'إرسال رابط الاستعادة',
    auth_forgot_success_title: 'تم إرسال رابط الاستعادة',
    auth_forgot_success_desc: 'إذا كان البريد الإلكتروني مسجلاً لدينا، فستتلقى رابطاً لإعادة تعيين كلمة المرور.',
    auth_reset_title: 'تعيين كلمة مرور جديدة',
    auth_reset_subtitle: 'أدخل كلمة المرور الجديدة لحسابك وتأكد من مطابقتها للشروط.',
    auth_reset_btn: 'حفظ كلمة المرور الجديدة',
    auth_reset_success_title: 'تم تغيير كلمة المرور بنجاح',
    auth_reset_success_desc: 'تم تحديث كلمة المرور الخاصة بحسابك بنجاح. يمكنك الآن تسجيل الدخول.',
    auth_reset_invalid_token: 'رابط إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته.',
    auth_back_to_login: 'العودة لتسجيل الدخول',
    auth_new_password_label: 'كلمة المرور الجديدة',

    // Security
    sec_title: 'الأمان وحماية الحساب',
    sec_subtitle: 'إدارة إعدادات الأمان واستعادة كلمة المرور وإجراءات الحساب.',
    sec_pwd_title: 'كلمة المرور وحماية الحساب',
    sec_pwd_desc: 'يتم تأمين حسابك بكلمة مرور مشفرة. لتحديث أو إعادة تعيين كلمة المرور، يمكنك طلب رابط إعادة التعيين الذي يصل إلى بريدك الإلكتروني المسجل.',
    sec_pwd_btn: 'طلب رابط إعادة تعيين كلمة المرور',
    sec_pwd_sending: 'جاري إرسال الرابط...',
    sec_pwd_sent: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني بنجاح. يرجى التحقق من صندوق الوارد.',
    sec_pwd_goto_reset: 'فتح صفحة استعادة كلمة المرور',
    sec_del_title: 'حذف الحساب',
    sec_del_perm_pending_title: 'حذف الحساب غير متاح حالياً',
    sec_del_perm_pending_desc: 'حذف الحساب عبر الخدمة الذاتية غير مفعل لحسابات المستأجرين والملاك بانتظار تأكيد صلاحية (user.delete) من قبل إدارة النظام. يمكنك التواصل مع الدعم الفني لتقديم طلب حذف الحساب.',
    sec_del_contact_support: 'طلب المساعدة عبر تذاكر الدعم',
    sec_del_desc: 'سيؤدي حذف حسابك إلى إلغاء صلاحيات الوصول وإزالة بياناتك بشكل دائم. لا يمكن التراجع عن هذا الإجراء.',
    sec_del_btn: 'حذف الحساب',
    sec_del_modal_title: 'حذف الحساب',
    sec_del_modal_warning: 'هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.',
    sec_del_modal_confirm_phrase: 'لتأكيد الحذف، يرجى كتابة DELETE في الحقل أدناه:',
    sec_del_modal_cancel: 'إلغاء',
    sec_del_modal_confirm_btn: 'تأكيد حذف الحساب نهائياً',
    sec_del_deleting: 'جاري حذف الحساب...',
    sec_del_error_403: 'ليس لديك الصلاحية الكافية لحذف الحساب (user.delete).',
    sec_del_error_generic: 'تعذر حذف الحساب في الوقت الحالي. يرجى المحاولة لاحقاً.',
  },
  en: {
    nav_home: 'Home',
    nav_properties: 'Properties',
    nav_about: 'About',
    nav_login: 'Sign in',
    nav_register: 'Create account',
    nav_dashboard: 'Dashboard',
    auth_tenant_only_title: 'Tenant Dashboard',
    auth_tenant_only_desc: 'This dashboard is reserved for student and tenant accounts only.',
    auth_logout_btn: 'Sign Out',
    loading: 'Loading...',
    site_name: 'DARY',

    page_home_title: 'Home',
    page_properties_title: 'Properties',
    page_property_details_title: 'Property Details',
    page_about_title: 'About',

    // About Page
    about_hero_title: 'About DARY',
    about_hero_subtitle: 'We make the student-housing experience simpler by connecting students with suitable homes in a clearer and easier way.',
    about_purpose_tagline: 'Our Purpose',
    about_purpose_title: 'Building an Exceptional Student Living Experience',
    about_mission_label: 'Our Mission',
    about_mission_title: 'Empowering Student Living',
    about_mission_desc: 'Facilitating the student housing experience through a reliable platform that connects them directly with apartment owners, saving them time, reducing costs, and ensuring a safe and transparent booking experience without brokers.',
    about_vision_label: 'Our Vision',
    about_vision_title: 'The Most Trusted Platform',
    about_vision_desc: 'To be the most trusted platform that solves housing problems for expatriates.',

    hero_kicker: 'Welcome to DARY',
    hero_headline: 'More than just housing\nA community building your future',
    hero_subtitle: 'Discover the best student housing options in one place',
    hero_search_placeholder: 'Search by city, university or area...',

    search_location: 'Location',
    search_type: 'Property Type',
    search_price: 'Price',
    search_button: 'Search',
    search_all_locations: 'All Locations',
    search_all_types: 'All Types',
    search_all_prices: 'All Prices',

    trust_tagline: 'Core Values',
    trust_heading: 'A student housing experience designed for clarity',
    trust_easiest: 'Easiest',
    trust_easiest_desc: 'Find the right place through a simple and clear experience.',
    trust_direct: 'Direct',
    trust_direct_desc: 'Connect directly with apartment owners without intermediaries.',
    trust_trusted: 'Trusted',
    trust_trusted_desc: 'A transparent and reliable housing experience for students.',
    trust_community: 'Student Community',
    trust_safe_env: 'Safe Environment',
    trust_trusted_props: 'Trusted Properties',

    featured_tagline: 'Handpicked Listings',
    featured_title: 'Featured Student Housing',
    featured_view: 'View Details',

    how_tagline: 'Simple Steps',
    how_title: 'How DARY Works',
    how_step1: 'Search',
    how_step1_desc: 'Browse available listings and compare locations and rates with complete clarity.',
    how_step2: 'Connect',
    how_step2_desc: 'Reach out directly to property owners to ask questions and arrange viewings.',
    how_step3: 'Choose',
    how_step3_desc: 'Select the home that matches your budget and university commute with confidence.',

    why_tagline: 'The DARY Advantage',
    why_title: 'Why Students Choose DARY',
    why_direct: 'Direct Connection with Owners',
    why_direct_desc: 'Direct communication with apartment owners with no intermediaries or unnecessary commissions.',
    why_time: 'Save Time & Effort',
    why_time_desc: 'Discover and compare housing options in one clean, centralized platform.',
    why_cost: 'Reduce Unnecessary Costs',
    why_cost_desc: 'Transparent pricing straight from owners, free of hidden brokerage expenses.',
    why_transparent: 'Transparent Housing Experience',
    why_transparent_desc: 'Accurate room details, realistic expectations, and clear terms for confident decisions.',

    cta_eyebrow: 'Ready to start?',
    cta_title: 'Start Searching for Your Student Housing',
    cta_desc: 'Explore apartments and studios close to your campus and connect directly with owners.',
    cta_button: 'Browse All Properties',

    footer_desc: 'DARY is a student-housing platform that makes it easier to find the right place with clear information and direct contact with property owners.',
    footer_links_title: 'Quick Links',
    footer_language_title: 'Language',
    footer_social_title: 'Follow Us',
    footer_copyright: '© 2026 DARY — All rights reserved.',

    per_month: '/mo',
    bedrooms_label: 'Beds',
    bathrooms_label: 'Baths',

    // Properties Page
    properties_subtitle: 'Find the right place to stay near your university.',
    properties_filter_all: 'All',
    properties_filter_bedrooms: 'Bedrooms',
    properties_filter_search_placeholder: 'Search by name, city, or university...',
    properties_filter_location: 'Location',
    properties_filter_type: 'Property Type',
    properties_filter_price: 'Price Range',
    properties_sort_by: 'Sort by',
    properties_sort_recommended: 'Recommended',
    properties_sort_price_asc: 'Price: Low to High',
    properties_sort_price_desc: 'Price: High to Low',
    properties_results_count: 'properties available',
    properties_reset_filters: 'Reset Filters',
    properties_empty_title: 'No properties match your search.',
    properties_empty_desc: 'Try adjusting your search terms or resetting filters to see more results.',
    properties_error_title: 'Failed to load properties',
    properties_error_desc: 'Unable to connect to the server at this time. Please check your internet connection and try again.',
    properties_error_retry: 'Try Again',
    properties_mobile_filters_btn: 'Filters',
    properties_mobile_close: 'Close',
    properties_apply_filters: 'Show Results',
    properties_bedrooms_any: 'Any',
    properties_bedrooms_1: '1 Bedroom',
    properties_bedrooms_2: '2 Bedrooms',
    properties_bedrooms_3plus: '3+ Bedrooms',

    // Auth
    auth_login_eyebrow: 'Welcome Back',
    auth_login_title: 'Sign in',
    auth_login_subtitle: 'Sign in to access your account and continue your housing journey.',
    auth_register_eyebrow: 'Start your journey with DARY',
    auth_register_title: 'Create account',
    auth_register_subtitle: 'Start your journey with DARY and easily explore student housing options.',
    auth_name_label: 'Full name',
    auth_name_placeholder: 'Mohamed Ahmed',
    auth_email_label: 'Email',
    auth_email_placeholder: 'name@example.com',
    auth_password_label: 'Password',
    auth_password_placeholder: '••••••••',
    auth_confirm_password_label: 'Confirm password',
    auth_confirm_password_placeholder: '••••••••',
    auth_remember_me: 'Remember me',
    auth_forgot_password: 'Forgot password?',
    auth_login_button: 'Sign in',
    auth_register_button: 'Create account',
    auth_divider_or: 'or',
    auth_google_login: 'Continue with Google',
    auth_google_register: 'Sign up with Google',
    auth_no_account: "Don't have an account?",
    auth_create_account_link: 'Create account',
    auth_have_account: 'Already have an account?',
    auth_login_link: 'Sign in',
    auth_role_label: 'Account type',
    auth_role_tenant: 'Student / Tenant',
    auth_role_owner: 'Property Owner',
    auth_first_name_label: 'First Name',
    auth_first_name_placeholder: 'Mohamed',
    auth_last_name_label: 'Last Name',
    auth_last_name_placeholder: 'Ahmed',
    auth_phone_label: 'Phone Number',
    auth_phone_placeholder: '+20 10 1234 5678',
    auth_phone_hint: 'Enter your phone with country code (e.g. +20...)',
    auth_whatsapp_label: 'WhatsApp Number (Optional)',
    auth_whatsapp_placeholder: '+20 10 1234 5678',
    auth_password_rules: 'At least 8 chars, uppercase, lowercase, number, and special character',
    auth_otp_title: 'Verify Your Email (OTP)',
    auth_otp_subtitle: 'Enter the 6-digit code sent to your email to activate your account.',
    auth_otp_label: 'Verification Code (OTP)',
    auth_otp_button: 'Verify & Continue',
    auth_otp_resend: 'Resend Code',
    auth_otp_resend_countdown: 'You can request a new code in',
    auth_otp_success_msg: 'Email verified successfully! You can now sign in.',
    auth_brand_badge: 'DARY Student Living',
    auth_brand_tagline: 'The student housing that fits you, made simpler',
    auth_brand_feature1: 'Direct contact with owners',
    auth_brand_feature2: 'Homes that fit your budget',
    auth_brand_feature3: 'Housing options near your university',
    auth_back_home: 'Back to home',
    auth_forgot_title: 'Reset your password',
    auth_forgot_subtitle: "Enter your email and we'll help you regain access to your account.",
    auth_forgot_btn: 'Send reset link',
    auth_forgot_success_title: 'Reset link sent',
    auth_forgot_success_desc: 'If an account exists with that email, you will receive a link to reset your password.',
    auth_reset_title: 'Set new password',
    auth_reset_subtitle: 'Enter your new password and make sure it meets the security requirements.',
    auth_reset_btn: 'Save new password',
    auth_reset_success_title: 'Your password has been reset successfully.',
    auth_reset_success_desc: 'Your account password has been updated. You can now sign in with your new password.',
    auth_reset_invalid_token: 'The password reset link is invalid or has expired.',
    auth_back_to_login: 'Back to sign in',
    auth_new_password_label: 'New password',

    // Security
    sec_title: 'Account Security',
    sec_subtitle: 'Manage your security settings, password recovery, and account actions.',
    sec_pwd_title: 'Password & Security',
    sec_pwd_desc: 'Your account is secured with an encrypted password. To update or reset your password, you can request a secure reset link sent to your registered email.',
    sec_pwd_btn: 'Request Password Reset Link',
    sec_pwd_sending: 'Sending reset link...',
    sec_pwd_sent: 'Password reset link has been sent to your email. Please check your inbox.',
    sec_pwd_goto_reset: 'Go to password reset page',
    sec_del_title: 'Delete account',
    sec_del_perm_pending_title: 'Account Deletion Unavailable',
    sec_del_perm_pending_desc: 'Self-service account deletion is currently unavailable for tenant and owner accounts pending system permission (user.delete) confirmation. Please contact support to request account removal.',
    sec_del_contact_support: 'Request assistance via Support Tickets',
    sec_del_desc: 'Deleting your account will permanently revoke your access and remove your data. This action cannot be undone.',
    sec_del_btn: 'Delete account',
    sec_del_modal_title: 'Delete account',
    sec_del_modal_warning: 'Are you sure you want to delete your account? This action cannot be undone.',
    sec_del_modal_confirm_phrase: 'To confirm deletion, please type DELETE below:',
    sec_del_modal_cancel: 'Cancel',
    sec_del_modal_confirm_btn: 'Permanently Delete Account',
    sec_del_deleting: 'Deleting account...',
    sec_del_error_403: 'You do not have sufficient permissions to delete this account (user.delete).',
    sec_del_error_generic: 'Failed to delete account at this time. Please try again later.',
  },
};

export function getDirection(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

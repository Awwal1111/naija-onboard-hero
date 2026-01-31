import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type Language = 'en' | 'ha' | 'yo' | 'ig' | 'pcm' | 'fr' | 'es' | 'ar' | 'pt' | 'sw' | 'hi' | 'zh';

interface TranslationSet {
  en: string;
  ha: string;
  yo: string;
  ig: string;
  pcm: string;
  fr: string;
  es: string;
  ar: string;
  pt: string;
  sw: string;
  hi: string;
  zh: string;
}

interface Translations {
  [key: string]: TranslationSet;
}

const translations: Translations = {
  // Navigation
  'nav.feed': {
    en: 'Feed', ha: 'Labari', yo: 'Iroyin', ig: 'Ozi', pcm: 'Feed',
    fr: 'Fil', es: 'Inicio', ar: 'الخلاصة', pt: 'Feed', sw: 'Habari', hi: 'फ़ीड', zh: '动态'
  },
  'nav.chat': {
    en: 'Chat', ha: 'Hira', yo: 'Ibaraẹnisọrọ', ig: 'Nkwurịta ọnụ', pcm: 'Yarn',
    fr: 'Chat', es: 'Chat', ar: 'محادثة', pt: 'Chat', sw: 'Gumzo', hi: 'चैट', zh: '聊天'
  },
  'nav.expert': {
    en: 'Expert', ha: 'Gwani', yo: 'Amoye', ig: 'Ọkachamara', pcm: 'Pro',
    fr: 'Expert', es: 'Experto', ar: 'خبير', pt: 'Especialista', sw: 'Mtaalamu', hi: 'विशेषज्ञ', zh: '专家'
  },
  'nav.jobs': {
    en: 'Jobs', ha: 'Ayyuka', yo: 'Iṣẹ', ig: 'Ọrụ', pcm: 'Work',
    fr: 'Emplois', es: 'Trabajos', ar: 'وظائف', pt: 'Trabalhos', sw: 'Kazi', hi: 'नौकरियां', zh: '工作'
  },
  'nav.earn': {
    en: 'Earn', ha: 'Samu', yo: 'Jere', ig: 'Nweta', pcm: 'Make Money',
    fr: 'Gagner', es: 'Ganar', ar: 'اكسب', pt: 'Ganhar', sw: 'Pata', hi: 'कमाएं', zh: '赚钱'
  },
  'nav.more': {
    en: 'More', ha: 'Ƙari', yo: 'Diẹ sii', ig: 'Ọzọ', pcm: 'More',
    fr: 'Plus', es: 'Más', ar: 'المزيد', pt: 'Mais', sw: 'Zaidi', hi: 'अधिक', zh: '更多'
  },

  // Common Actions
  'action.save': {
    en: 'Save', ha: 'Ajiye', yo: 'Fi pamọ́', ig: 'Chekwaa', pcm: 'Save',
    fr: 'Sauvegarder', es: 'Guardar', ar: 'حفظ', pt: 'Salvar', sw: 'Hifadhi', hi: 'सेव करें', zh: '保存'
  },
  'action.cancel': {
    en: 'Cancel', ha: 'Soke', yo: 'Fagilee', ig: 'Kagbuo', pcm: 'Cancel',
    fr: 'Annuler', es: 'Cancelar', ar: 'إلغاء', pt: 'Cancelar', sw: 'Ghairi', hi: 'रद्द करें', zh: '取消'
  },
  'action.submit': {
    en: 'Submit', ha: 'Aika', yo: 'Fi silẹ', ig: 'Nyefee', pcm: 'Submit',
    fr: 'Soumettre', es: 'Enviar', ar: 'إرسال', pt: 'Enviar', sw: 'Wasilisha', hi: 'सबमिट करें', zh: '提交'
  },
  'action.confirm': {
    en: 'Confirm', ha: 'Tabbatar', yo: 'Jẹrisi', ig: 'Kwado', pcm: 'Confirm',
    fr: 'Confirmer', es: 'Confirmar', ar: 'تأكيد', pt: 'Confirmar', sw: 'Thibitisha', hi: 'पुष्टि करें', zh: '确认'
  },
  'action.delete': {
    en: 'Delete', ha: 'Share', yo: 'Pa rẹ', ig: 'Hichapụ', pcm: 'Delete',
    fr: 'Supprimer', es: 'Eliminar', ar: 'حذف', pt: 'Excluir', sw: 'Futa', hi: 'हटाएं', zh: '删除'
  },
  'action.edit': {
    en: 'Edit', ha: 'Gyara', yo: 'Ṣatunkọ', ig: 'Dezie', pcm: 'Change',
    fr: 'Modifier', es: 'Editar', ar: 'تعديل', pt: 'Editar', sw: 'Hariri', hi: 'संपादित करें', zh: '编辑'
  },
  'action.search': {
    en: 'Search', ha: 'Bincika', yo: 'Wa', ig: 'Chọọ', pcm: 'Find',
    fr: 'Rechercher', es: 'Buscar', ar: 'بحث', pt: 'Pesquisar', sw: 'Tafuta', hi: 'खोजें', zh: '搜索'
  },
  'action.loadMore': {
    en: 'Load More', ha: 'Ƙara Shigo', yo: 'Gbe diẹ sii', ig: 'Tinye Ọzọ', pcm: 'Show More',
    fr: 'Charger plus', es: 'Cargar más', ar: 'تحميل المزيد', pt: 'Carregar mais', sw: 'Pakia zaidi', hi: 'और लोड करें', zh: '加载更多'
  },

  // Settings
  'settings.title': {
    en: 'Settings', ha: 'Saiti', yo: 'Ètò', ig: 'Ntọala', pcm: 'Settings',
    fr: 'Paramètres', es: 'Configuración', ar: 'الإعدادات', pt: 'Configurações', sw: 'Mipangilio', hi: 'सेटिंग्स', zh: '设置'
  },
  'settings.language': {
    en: 'Language', ha: 'Harshe', yo: 'Èdè', ig: 'Asụsụ', pcm: 'Language',
    fr: 'Langue', es: 'Idioma', ar: 'اللغة', pt: 'Idioma', sw: 'Lugha', hi: 'भाषा', zh: '语言'
  },
  'settings.theme': {
    en: 'Theme', ha: 'Jigo', yo: 'Àkọlé', ig: 'Isiokwu', pcm: 'Style',
    fr: 'Thème', es: 'Tema', ar: 'المظهر', pt: 'Tema', sw: 'Mandhari', hi: 'थीम', zh: '主题'
  },
  'settings.notifications': {
    en: 'Notifications', ha: 'Sanarwa', yo: 'Ìkìlọ̀', ig: 'Ọkwa', pcm: 'Alert',
    fr: 'Notifications', es: 'Notificaciones', ar: 'الإشعارات', pt: 'Notificações', sw: 'Arifa', hi: 'सूचनाएं', zh: '通知'
  },
  'settings.privacy': {
    en: 'Privacy & Security', ha: 'Sirri da Tsaro', yo: 'Ìkọ̀kọ̀ àti Ààbò', ig: 'Nzuzo na Nchekwa', pcm: 'Privacy',
    fr: 'Confidentialité', es: 'Privacidad', ar: 'الخصوصية', pt: 'Privacidade', sw: 'Faragha', hi: 'गोपनीयता', zh: '隐私'
  },
  'settings.currency': {
    en: 'Currency', ha: 'Kuɗi', yo: 'Owó', ig: 'Ego', pcm: 'Money Type',
    fr: 'Devise', es: 'Moneda', ar: 'العملة', pt: 'Moeda', sw: 'Sarafu', hi: 'मुद्रा', zh: '货币'
  },
  'settings.timezone': {
    en: 'Timezone', ha: 'Yankin Lokaci', yo: 'Àgbègbè Àkókò', ig: 'Mpaghara Oge', pcm: 'Time Zone',
    fr: 'Fuseau horaire', es: 'Zona horaria', ar: 'المنطقة الزمنية', pt: 'Fuso horário', sw: 'Eneo la saa', hi: 'समय क्षेत्र', zh: '时区'
  },

  // Wallet
  'wallet.balance': {
    en: 'Balance', ha: 'Ragowar', yo: 'Ìyókù', ig: 'Ntụkwasị', pcm: 'Money Wey Remain',
    fr: 'Solde', es: 'Saldo', ar: 'الرصيد', pt: 'Saldo', sw: 'Salio', hi: 'बैलेंस', zh: '余额'
  },
  'wallet.deposit': {
    en: 'Deposit', ha: 'Ajiya', yo: 'Fipamọ́', ig: 'Itinye ego', pcm: 'Add Money',
    fr: 'Dépôt', es: 'Depositar', ar: 'إيداع', pt: 'Depositar', sw: 'Weka', hi: 'जमा करें', zh: '存款'
  },
  'wallet.withdraw': {
    en: 'Withdraw', ha: 'Fitar', yo: 'Yọ', ig: 'Wepu', pcm: 'Take Money',
    fr: 'Retrait', es: 'Retirar', ar: 'سحب', pt: 'Sacar', sw: 'Ondoa', hi: 'निकालें', zh: '取款'
  },
  'wallet.transfer': {
    en: 'Transfer', ha: 'Aikawa', yo: 'Gbé lọ', ig: 'Bufee', pcm: 'Send',
    fr: 'Transfert', es: 'Transferir', ar: 'تحويل', pt: 'Transferir', sw: 'Hamisha', hi: 'ट्रांसफर', zh: '转账'
  },

  // Messages
  'message.welcome': {
    en: 'Welcome', ha: 'Barka da zuwa', yo: 'Ẹ káàbọ̀', ig: 'Nnọọ', pcm: 'Welcome',
    fr: 'Bienvenue', es: 'Bienvenido', ar: 'أهلاً', pt: 'Bem-vindo', sw: 'Karibu', hi: 'स्वागत है', zh: '欢迎'
  },
  'message.success': {
    en: 'Success', ha: 'Nasara', yo: 'Àṣeyọrí', ig: 'Ọganihu', pcm: 'E Don Work',
    fr: 'Succès', es: 'Éxito', ar: 'نجاح', pt: 'Sucesso', sw: 'Mafanikio', hi: 'सफलता', zh: '成功'
  },
  'message.error': {
    en: 'Error', ha: 'Kuskure', yo: 'Àṣìṣe', ig: 'Njehie', pcm: 'Problem',
    fr: 'Erreur', es: 'Error', ar: 'خطأ', pt: 'Erro', sw: 'Kosa', hi: 'त्रुटि', zh: '错误'
  },
  'message.loading': {
    en: 'Loading...', ha: 'Ana lodi...', yo: 'Ń kojọ...', ig: 'Na-ebu...', pcm: 'Wait Small...',
    fr: 'Chargement...', es: 'Cargando...', ar: 'جاري التحميل...', pt: 'Carregando...', sw: 'Inapakia...', hi: 'लोड हो रहा है...', zh: '加载中...'
  },
  'message.noData': {
    en: 'No data found', ha: 'Ba a sami bayanai ba', yo: 'Kò sí dátà', ig: 'Enweghị data', pcm: 'Nothing Dey Here',
    fr: 'Aucune donnée', es: 'Sin datos', ar: 'لا توجد بيانات', pt: 'Sem dados', sw: 'Hakuna data', hi: 'डेटा नहीं मिला', zh: '未找到数据'
  },

  // Profile
  'profile.myProfile': {
    en: 'My Profile', ha: 'Bayanan ni', yo: 'Ìpèdè mi', ig: 'Profaịlụ m', pcm: 'My Page',
    fr: 'Mon profil', es: 'Mi perfil', ar: 'ملفي', pt: 'Meu perfil', sw: 'Wasifu wangu', hi: 'मेरी प्रोफाइल', zh: '我的资料'
  },
  'profile.editProfile': {
    en: 'Edit Profile', ha: 'Gyara Bayanai', yo: 'Ṣàtúnṣe Ìpèdè', ig: 'Dezie Profaịlụ', pcm: 'Change Profile',
    fr: 'Modifier le profil', es: 'Editar perfil', ar: 'تعديل الملف', pt: 'Editar perfil', sw: 'Hariri wasifu', hi: 'प्रोफाइल संपादित करें', zh: '编辑资料'
  },

  // Jobs
  'jobs.postJob': {
    en: 'Post a Job', ha: 'Wallafa Aiki', yo: 'Fi Iṣẹ́ sílẹ̀', ig: 'Zipụta Ọrụ', pcm: 'Post Work',
    fr: 'Publier un emploi', es: 'Publicar trabajo', ar: 'نشر وظيفة', pt: 'Publicar trabalho', sw: 'Chapisha kazi', hi: 'नौकरी पोस्ट करें', zh: '发布工作'
  },
  'jobs.apply': {
    en: 'Apply Now', ha: 'Yi Aikace Yanzu', yo: 'Lo lọ́wọ́', ig: 'Tinye Akwụkwọ', pcm: 'Apply Now',
    fr: 'Postuler', es: 'Aplicar ahora', ar: 'تقدم الآن', pt: 'Candidatar-se', sw: 'Omba sasa', hi: 'अभी आवेदन करें', zh: '立即申请'
  },
  'jobs.myJobs': {
    en: 'My Jobs', ha: 'Ayyukana', yo: 'Iṣẹ́ Mi', ig: 'Ọrụ M', pcm: 'My Work',
    fr: 'Mes emplois', es: 'Mis trabajos', ar: 'وظائفي', pt: 'Meus trabalhos', sw: 'Kazi zangu', hi: 'मेरी नौकरियां', zh: '我的工作'
  },

  // Fundraising
  'fundraising.title': {
    en: 'Fundraising', ha: 'Tara Kuɗi', yo: 'Ìkójọ Owó', ig: 'Nchịkọta Ego', pcm: 'Raise Money',
    fr: 'Collecte de fonds', es: 'Recaudación', ar: 'جمع التبرعات', pt: 'Arrecadação', sw: 'Kuchangisha', hi: 'धन उगाही', zh: '筹款'
  },
  'fundraising.createCampaign': {
    en: 'Create Campaign', ha: 'Ƙirƙiri Yaƙi neman', yo: 'Ṣẹ̀dá Ìpolongo', ig: 'Mepụta Mkpọlite', pcm: 'Start Campaign',
    fr: 'Créer une campagne', es: 'Crear campaña', ar: 'إنشاء حملة', pt: 'Criar campanha', sw: 'Unda kampeni', hi: 'अभियान बनाएं', zh: '创建活动'
  },
  'fundraising.contribute': {
    en: 'Contribute', ha: 'Ba da gudummawa', yo: 'Ṣe Ìfikún', ig: 'Nye Onyinye', pcm: 'Support',
    fr: 'Contribuer', es: 'Contribuir', ar: 'مساهمة', pt: 'Contribuir', sw: 'Changia', hi: 'योगदान करें', zh: '贡献'
  },
  'fundraising.myCampaigns': {
    en: 'My Campaigns', ha: 'Yaƙi neman na', yo: 'Àwọn Ìpolongo Mi', ig: 'Mkpọlite M', pcm: 'My Campaigns',
    fr: 'Mes campagnes', es: 'Mis campañas', ar: 'حملاتي', pt: 'Minhas campanhas', sw: 'Kampeni zangu', hi: 'मेरे अभियान', zh: '我的活动'
  },

  // Expert
  'expert.becomeExpert': {
    en: 'Become an Expert', ha: 'Zama Gwani', yo: 'Di Àmòye', ig: 'Bụrụ Ọkachamara', pcm: 'Become Pro',
    fr: 'Devenir expert', es: 'Ser experto', ar: 'كن خبيراً', pt: 'Tornar-se especialista', sw: 'Kuwa mtaalamu', hi: 'विशेषज्ञ बनें', zh: '成为专家'
  },
  'expert.hireExpert': {
    en: 'Hire Expert', ha: 'Yi haya Gwani', yo: 'Gbà Àmòye', ig: 'Goo Ọkachamara', pcm: 'Hire Pro',
    fr: 'Engager un expert', es: 'Contratar experto', ar: 'توظيف خبير', pt: 'Contratar especialista', sw: 'Ajiri mtaalamu', hi: 'विशेषज्ञ को नियुक्त करें', zh: '雇用专家'
  },

  // Empty States
  'empty.noPosts': {
    en: 'No posts yet', ha: 'Babu sakwanni tukuna', yo: 'Kò sí àwọn ifiranṣẹ́', ig: 'Enweghị ozi', pcm: 'No Post Yet',
    fr: 'Pas encore de publications', es: 'Sin publicaciones', ar: 'لا توجد منشورات', pt: 'Sem publicações', sw: 'Hakuna machapisho', hi: 'कोई पोस्ट नहीं', zh: '暂无帖子'
  },
  'empty.noJobs': {
    en: 'No jobs available', ha: 'Babu ayyuka', yo: 'Kò sí iṣẹ́', ig: 'Enweghị ọrụ', pcm: 'No Work Dey',
    fr: 'Pas d\'emplois', es: 'Sin trabajos', ar: 'لا توجد وظائف', pt: 'Sem trabalhos', sw: 'Hakuna kazi', hi: 'कोई नौकरी नहीं', zh: '没有工作'
  },
  'empty.noMessages': {
    en: 'No messages yet', ha: 'Babu saƙonni', yo: 'Kò sí ọ̀rọ̀', ig: 'Enweghị ozi', pcm: 'No Message Yet',
    fr: 'Pas de messages', es: 'Sin mensajes', ar: 'لا توجد رسائل', pt: 'Sem mensagens', sw: 'Hakuna ujumbe', hi: 'कोई संदेश नहीं', zh: '没有消息'
  },

  // International
  'international.globalMarketplace': {
    en: 'Global Marketplace', ha: 'Kasuwar Duniya', yo: 'Ọjà Àgbáyé', ig: 'Ahịa Ụwa', pcm: 'World Market',
    fr: 'Marché mondial', es: 'Mercado global', ar: 'السوق العالمي', pt: 'Mercado global', sw: 'Soko la kimataifa', hi: 'वैश्विक बाज़ार', zh: '全球市场'
  },
  'international.remoteWork': {
    en: 'Remote Work', ha: 'Aiki Daga Nesa', yo: 'Iṣẹ́ Látọ̀nà Jìjìn', ig: 'Ọrụ Dịka Ebe Ọzọ', pcm: 'Work From Anywhere',
    fr: 'Travail à distance', es: 'Trabajo remoto', ar: 'العمل عن بُعد', pt: 'Trabalho remoto', sw: 'Kazi ya mbali', hi: 'दूरस्थ कार्य', zh: '远程工作'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languageNames: { [key in Language]: string };
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'en';
  });

  const languageNames: { [key in Language]: string } = {
    en: 'English',
    ha: 'Hausa',
    yo: 'Yoruba',
    ig: 'Igbo',
    pcm: 'Nigerian Pidgin',
    fr: 'Français',
    es: 'Español',
    ar: 'العربية',
    pt: 'Português',
    sw: 'Kiswahili',
    hi: 'हिन्दी',
    zh: '中文'
  };

  // RTL languages
  const isRTL = language === 'ar';

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageNames, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

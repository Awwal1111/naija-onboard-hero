import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type Language = 'en' | 'ha' | 'yo' | 'ig' | 'pcm';

interface Translations {
  [key: string]: {
    en: string;
    ha: string;
    yo: string;
    ig: string;
    pcm: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.feed': {
    en: 'Feed',
    ha: 'Labari',
    yo: 'Iroyin',
    ig: 'Ozi',
    pcm: 'Feed'
  },
  'nav.chat': {
    en: 'Chat',
    ha: 'Hira',
    yo: 'Ibaraẹnisọrọ',
    ig: 'Nkwurịta ọnụ',
    pcm: 'Yarn'
  },
  'nav.expert': {
    en: 'Expert',
    ha: 'Gwani',
    yo: 'Amoye',
    ig: 'Ọkachamara',
    pcm: 'Pro'
  },
  'nav.jobs': {
    en: 'Jobs',
    ha: 'Ayyuka',
    yo: 'Iṣẹ',
    ig: 'Ọrụ',
    pcm: 'Work'
  },
  'nav.earn': {
    en: 'Earn',
    ha: 'Samu',
    yo: 'Jere',
    ig: 'Nweta',
    pcm: 'Make Money'
  },
  'nav.more': {
    en: 'More',
    ha: 'Ƙari',
    yo: 'Diẹ sii',
    ig: 'Ọzọ',
    pcm: 'More'
  },

  // Common Actions
  'action.save': {
    en: 'Save',
    ha: 'Ajiye',
    yo: 'Fi pamọ́',
    ig: 'Chekwaa',
    pcm: 'Save'
  },
  'action.cancel': {
    en: 'Cancel',
    ha: 'Soke',
    yo: 'Fagilee',
    ig: 'Kagbuo',
    pcm: 'Cancel'
  },
  'action.submit': {
    en: 'Submit',
    ha: 'Aika',
    yo: 'Fi silẹ',
    ig: 'Nyefee',
    pcm: 'Submit'
  },
  'action.confirm': {
    en: 'Confirm',
    ha: 'Tabbatar',
    yo: 'Jẹrisi',
    ig: 'Kwado',
    pcm: 'Confirm'
  },
  'action.delete': {
    en: 'Delete',
    ha: 'Share',
    yo: 'Pa rẹ',
    ig: 'Hichapụ',
    pcm: 'Delete'
  },
  'action.edit': {
    en: 'Edit',
    ha: 'Gyara',
    yo: 'Ṣatunkọ',
    ig: 'Dezie',
    pcm: 'Change'
  },
  'action.search': {
    en: 'Search',
    ha: 'Bincika',
    yo: 'Wa',
    ig: 'Chọọ',
    pcm: 'Find'
  },
  'action.loadMore': {
    en: 'Load More',
    ha: 'Ƙara Shigo',
    yo: 'Gbe diẹ sii',
    ig: 'Tinye Ọzọ',
    pcm: 'Show More'
  },

  // Settings
  'settings.title': {
    en: 'Settings',
    ha: 'Saiti',
    yo: 'Ètò',
    ig: 'Ntọala',
    pcm: 'Settings'
  },
  'settings.language': {
    en: 'Language',
    ha: 'Harshe',
    yo: 'Èdè',
    ig: 'Asụsụ',
    pcm: 'Language'
  },
  'settings.theme': {
    en: 'Theme',
    ha: 'Jigo',
    yo: 'Àkọlé',
    ig: 'Isiokwu',
    pcm: 'Style'
  },
  'settings.notifications': {
    en: 'Notifications',
    ha: 'Sanarwa',
    yo: 'Ìkìlọ̀',
    ig: 'Ọkwa',
    pcm: 'Alert'
  },
  'settings.privacy': {
    en: 'Privacy & Security',
    ha: 'Sirri da Tsaro',
    yo: 'Ìkọ̀kọ̀ àti Ààbò',
    ig: 'Nzuzo na Nchekwa',
    pcm: 'Privacy'
  },

  // Wallet
  'wallet.balance': {
    en: 'Balance',
    ha: 'Ragowar',
    yo: 'Ìyókù',
    ig: 'Ntụkwasị',
    pcm: 'Money Wey Remain'
  },
  'wallet.deposit': {
    en: 'Deposit',
    ha: 'Ajiya',
    yo: 'Fipamọ́',
    ig: 'Itinye ego',
    pcm: 'Add Money'
  },
  'wallet.withdraw': {
    en: 'Withdraw',
    ha: 'Fitar',
    yo: 'Yọ',
    ig: 'Wepu',
    pcm: 'Take Money'
  },
  'wallet.transfer': {
    en: 'Transfer',
    ha: 'Aikawa',
    yo: 'Gbé lọ',
    ig: 'Bufee',
    pcm: 'Send'
  },

  // Messages
  'message.welcome': {
    en: 'Welcome',
    ha: 'Barka da zuwa',
    yo: 'Ẹ káàbọ̀',
    ig: 'Nnọọ',
    pcm: 'Welcome'
  },
  'message.success': {
    en: 'Success',
    ha: 'Nasara',
    yo: 'Àṣeyọrí',
    ig: 'Ọganihu',
    pcm: 'E Don Work'
  },
  'message.error': {
    en: 'Error',
    ha: 'Kuskure',
    yo: 'Àṣìṣe',
    ig: 'Njehie',
    pcm: 'Problem'
  },
  'message.loading': {
    en: 'Loading...',
    ha: 'Ana lodi...',
    yo: 'Ń kojọ...',
    ig: 'Na-ebu...',
    pcm: 'Wait Small...'
  },
  'message.noData': {
    en: 'No data found',
    ha: 'Ba a sami bayanai ba',
    yo: 'Kò sí dátà',
    ig: 'Enweghị data',
    pcm: 'Nothing Dey Here'
  },

  // Profile
  'profile.myProfile': {
    en: 'My Profile',
    ha: 'Bayanan ni',
    yo: 'Ìpèdè mi',
    ig: 'Profaịlụ m',
    pcm: 'My Page'
  },
  'profile.editProfile': {
    en: 'Edit Profile',
    ha: 'Gyara Bayanai',
    yo: 'Ṣàtúnṣe Ìpèdè',
    ig: 'Dezie Profaịlụ',
    pcm: 'Change Profile'
  },

  // Jobs
  'jobs.postJob': {
    en: 'Post a Job',
    ha: 'Wallafa Aiki',
    yo: 'Fi Iṣẹ́ sílẹ̀',
    ig: 'Zipụta Ọrụ',
    pcm: 'Post Work'
  },
  'jobs.apply': {
    en: 'Apply Now',
    ha: 'Yi Aikace Yanzu',
    yo: 'Lo lọ́wọ́',
    ig: 'Tinye Akwụkwọ',
    pcm: 'Apply Now'
  },
  'jobs.myJobs': {
    en: 'My Jobs',
    ha: 'Ayyukana',
    yo: 'Iṣẹ́ Mi',
    ig: 'Ọrụ M',
    pcm: 'My Work'
  },

  // Fundraising
  'fundraising.title': {
    en: 'Fundraising',
    ha: 'Tara Kuɗi',
    yo: 'Ìkójọ Owó',
    ig: 'Nchịkọta Ego',
    pcm: 'Raise Money'
  },
  'fundraising.createCampaign': {
    en: 'Create Campaign',
    ha: 'Ƙirƙiri Yaƙi neman',
    yo: 'Ṣẹ̀dá Ìpolongo',
    ig: 'Mepụta Mkpọlite',
    pcm: 'Start Campaign'
  },
  'fundraising.contribute': {
    en: 'Contribute',
    ha: 'Ba da gudummawa',
    yo: 'Ṣe Ìfikún',
    ig: 'Nye Onyinye',
    pcm: 'Support'
  },
  'fundraising.myCampaigns': {
    en: 'My Campaigns',
    ha: 'Yaƙi neman na',
    yo: 'Àwọn Ìpolongo Mi',
    ig: 'Mkpọlite M',
    pcm: 'My Campaigns'
  },

  // Expert
  'expert.becomeExpert': {
    en: 'Become an Expert',
    ha: 'Zama Gwani',
    yo: 'Di Àmòye',
    ig: 'Bụrụ Ọkachamara',
    pcm: 'Become Pro'
  },
  'expert.hireExpert': {
    en: 'Hire Expert',
    ha: 'Yi haya Gwani',
    yo: 'Gbà Àmòye',
    ig: 'Goo Ọkachamara',
    pcm: 'Hire Pro'
  },

  // Empty States
  'empty.noPosts': {
    en: 'No posts yet',
    ha: 'Babu sakwanni tukuna',
    yo: 'Kò sí àwọn ifiranṣẹ́',
    ig: 'Enweghị ozi',
    pcm: 'No Post Yet'
  },
  'empty.noJobs': {
    en: 'No jobs available',
    ha: 'Babu ayyuka',
    yo: 'Kò sí iṣẹ́',
    ig: 'Enweghị ọrụ',
    pcm: 'No Work Dey'
  },
  'empty.noMessages': {
    en: 'No messages yet',
    ha: 'Babu saƙonni',
    yo: 'Kò sí ọ̀rọ̀',
    ig: 'Enweghị ozi',
    pcm: 'No Message Yet'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languageNames: { [key in Language]: string };
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
    pcm: 'Nigerian Pidgin'
  };

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
    <LanguageContext.Provider value={{ language, setLanguage, t, languageNames }}>
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

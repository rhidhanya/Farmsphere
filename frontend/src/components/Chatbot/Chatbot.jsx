import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Chatbot.css';
import { useTranslation } from 'react-i18next';
import { loanAPI, loanProductAPI, assistantAPI } from '../../api/client';
import {
  FPO_AVAILABLE_SCHEMES,
  ALL_DISPLAY_SCHEMES,
  calculateEMI,
} from '../../pages/FarmerLoans';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  X,
  Send,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

// 5 Structured questions with English and Tamil definitions
const QUESTION_DEFINITIONS = [
  {
    key: 'purpose',
    en: '1/5: What is the purpose of the loan? (e.g., Irrigation, Crop Seeds & Fertilizer, Farm Machinery, Polyhouse, Storage, Dairy)',
    ta: '1/5: கடனின் நோக்கம் என்ன? (எ.கா: பாசனம்/மோட்டார் பம்ப், பயிர் விதைகள் & உரம், பண்ணை இயந்திரங்கள்/டிராக்டர், பாலிஹவுஸ், சேமிப்புக் கிடங்கு, பால் பண்ணை)',
  },
  {
    key: 'amount',
    en: '2/5: What loan amount do you require? (e.g., ₹90,000)',
    ta: '2/5: உங்களுக்கு எவ்வளவு கடன் தொகை தேவை? (எ.கா: ₹90,000)',
  },
  {
    key: 'activity',
    en: '3/5: What type of farming or agricultural activity do you do? (e.g., Coconut farming, Wheat, Vegetables, Dairy)',
    ta: '3/5: நீங்கள் என்ன வகையான விவசாயம் அல்லது வேளாண்மை செய்கிறீர்கள்? (எ.கா: தென்னை விவசாயம், நெல், காய்கறிகள், பால் பண்ணை)',
  },
  {
    key: 'membership',
    en: '4/5: Are you a registered member of the FPO or farmer cooperative? (Yes / No)',
    ta: '4/5: நீங்கள் உழவர் உற்பத்தியாளர் நிறுவனத்தில் (FPO) அல்லது கூட்டுறவு சங்கத்தில் பதிவு செய்த உறுப்பினரா? (ஆம் / இல்லை)',
  },
  {
    key: 'repayment',
    en: '5/5: What is your preferred repayment period in months? (e.g., 12 months)',
    ta: '5/5: நீங்கள் விரும்பும் திருப்பிச் செலுத்தும் காலம் எத்தனை மாதங்கள்? (எ.கா: 12 மாதங்கள்)',
  },
];

// Quick suggestion chips with personal loan & general inquiries
const SUGGESTIONS_BY_LANG = {
  en: [
    'Which loan is suitable for me?',
    'What is my outstanding loan balance?',
    'When is my next installment due?',
    'What is my loan application status?',
    'What is my KYC status?',
    'What documents do I need to upload?',
    'How do I apply for a loan?',
  ],
  ta: [
    'எந்த கடன் எனக்கு ஏற்றது?',
    'எனது கடன் நிலுவைத் தொகை எவ்வளவு?',
    'அடுத்த தவணை எப்போது செலுத்த வேண்டும்?',
    'எனது கடன் விண்ணப்பத்தின் நிலை என்ன?',
    'எனது KYC நிலை என்ன?',
    'என்ன ஆவணங்கள் தேவை?',
    'கடனுக்கு விண்ணப்பிப்பது எப்படி?',
  ],
};

// Follow-up question chips after recommendations
const FOLLOW_UPS_BY_LANG = {
  en: [
    'What is my loan balance?',
    'When is my next installment due?',
    'How do I apply?',
    'What documents should I upload?',
    'What is the interest rate?',
    'What is my estimated EMI?',
    'How do I check my application status?',
  ],
  ta: [
    'எனது கடன் நிலுவை எவ்வளவு?',
    'அடுத்த தவணை எப்போது?',
    'விண்ணப்பிப்பது எப்படி?',
    'என்ன ஆவணங்களை பதிவேற்ற வேண்டும்?',
    'வட்டி விகிதம் என்ன?',
    'எனது மதிப்பிடப்பட்ட EMI எவ்வளவு?',
    'விண்ணப்ப நிலையை சரிபார்ப்பது எப்படி?',
  ],
};

// Localized Match Reasons
const MATCH_REASONS = {
  irrigation: {
    en: 'Direct match for irrigation and water infrastructure',
    ta: 'பாசனம் மற்றும் நீர் உள்கட்டமைப்புத் தேவைகளுக்கு நேரடி பொருத்தம்',
  },
  crops: {
    en: 'Matches seasonal cultivation inputs and working capital',
    ta: 'பருவகால சாகுபடி உள்ளீடுகள் மற்றும் நடைமுறை மூலதனத் தேவைகளுடன் பொருந்துகிறது',
  },
  machinery: {
    en: 'Matches agricultural mechanization and farm equipment financing',
    ta: 'வேளாண் இயந்திரமயமாக்கல் மற்றும் உபகரண நிதியுதவியுடன் பொருந்துகிறது',
  },
  polyhouse: {
    en: 'Matches controlled polyhouse cultivation credit',
    ta: 'பாதுகாக்கப்பட்ட பாலிஹவுஸ் பயிர் சாகுபடிக்கு பொருந்துகிறது',
  },
  storage: {
    en: 'Matches produce storage and post-harvest liquidity needs',
    ta: 'விளைபொருள் சேமிப்பு மற்றும் அறுவடைக்கு பிந்தைய பணப்புழக்கத் தேவைகளுக்கு பொருந்துகிறது',
  },
  dairy: {
    en: 'Matches dairy enterprise finance',
    ta: 'பால் பண்ணை மற்றும் கால்நடை பராமரிப்பிற்கு பொருந்துகிறது',
  },
  poultry: {
    en: 'Matches poultry farming operations',
    ta: 'கோழிப் பண்ணை செயல்பாடுகளுடன் பொருந்துகிறது',
  },
  goat: {
    en: 'Matches small ruminant rearing',
    ta: 'ஆடு வளர்ப்பு மற்றும் பராமரிப்புத் தேவைகளுக்கு பொருந்துகிறது',
  },
  fish: {
    en: 'Matches fisheries and aquaculture finance',
    ta: 'மீன் வளர்ப்பு மற்றும் நீர்வாழ் உயிரின நிதியுதவிக்கு பொருந்துகிறது',
  },
  coconut: {
    en: 'Specific alignment with coconut farming activity',
    ta: 'தென்னை சாகுபடி மற்றும் பராமரிப்புக்கு நேரடி பொருத்தம்',
  },
  general: {
    en: 'General alignment with your intended agricultural purpose',
    ta: 'உங்கள் விவசாய நோக்கத்துடன் பொதுவான பொருத்தம்',
  },
  fpo_member: {
    en: 'Active FPO membership fulfills key institutional eligibility',
    ta: 'செயலில் உள்ள FPO உறுப்பினர் தகுதி முக்கிய நிபந்தனையை நிறைவு செய்கிறது',
  },
};

// Helper: Check if text contains Tamil Unicode characters
const isTamilText = (text) => /[\u0B80-\u0BFF]/.test(text || '');

// Clean text for natural speech synthesis
const cleanTextForSpeech = (rawText, isTamil) => {
  if (!rawText) return '';
  let cleaned = rawText
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/###/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/•/g, ', ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#[A-Za-z0-9_-]+/g, '')
    .replace(/>/g, '')
    .replace(/--+/g, '')
    .replace(/[{}()\[\]]/g, ' ')
    .replace(/\n+/g, '. ');

  if (isTamil) {
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+)/g, '$1 ரூபாய்')
      .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, '$1-$2-$3')
      .replace(/%\s*ஆண்டுக்கு/gi, ' சதவீதம் ஆண்டுக்கு')
      .replace(/%\s*p\.a\./gi, ' சதவீதம் ஆண்டுக்கு')
      .replace(/%/g, ' சதவீதம் ')
      .replace(/\bEMI\b/gi, 'மாதத் தவணை')
      .replace(/\bKYC\b/gi, 'கே ஒய் சி')
      .replace(/\bFPO\b/gi, 'எஃப் பி ஓ')
      .replace(/\bID\b/gi, 'ஐடி')
      .replace(/\bAPP-([0-9]+)\b/gi, 'விண்ணப்ப எண் $1');
  } else {
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+)/g, '$1 Rupees')
      .replace(/%\s*p\.a\./gi, ' percent per annum')
      .replace(/%/g, ' percent ')
      .replace(/\bp\.a\.\b/gi, 'per annum')
      .replace(/\bp\.m\.\b/gi, 'per month')
      .replace(/\bEMI\b/gi, 'E M I')
      .replace(/\bFPO\b/gi, 'F P O')
      .replace(/\bKYC\b/gi, 'K Y C')
      .replace(/\bID\b/gi, 'I D');
  }

  return cleaned.replace(/\s+/g, ' ').trim();
};

// Helper: parse inline markdown elements safely into React nodes
const formatInline = (text) => {
  if (!text) return null;
  // Match **bold**, *italic*, and `code`
  const regex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={index} className="chatbot-code-inline">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

// Safe React Markdown Formatter: renders headings, lists, bold, and paragraphs cleanly
const FormattedChatText = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="chatbot-md-ul">
            {currentList.items.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`ol-${blocks.length}`} className="chatbot-md-ol">
            {currentList.items.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    // Check heading: ### or ## or #
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(
        <h4 key={`h-${blocks.length}`} className="chatbot-md-heading">
          {formatInline(headingMatch[1])}
        </h4>
      );
      continue;
    }

    // Check bullet list: • or - or * (when followed by space)
    const bulletMatch = line.match(/^(?:•|\-|\*)\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Check numbered list: 1. or 1) etc.
    const numberMatch = line.match(/^\d+[\.\)]\s+(.+)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Regular line
    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="chatbot-md-p">
        {formatInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="chatbot-formatted-text">{blocks}</div>;
};

const CHATBOT_VERSION = 'VOICE-GLOBAL-SYNC-2026-10-26';
console.log(`%c[CHATBOT] Loaded version: ${CHATBOT_VERSION} — global language synchronized`, 'color: #059669; font-weight: bold; font-size: 14px;');

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Active website language synchronized with global i18n ('ta' or 'en')
  const currentLang = i18n.language && i18n.language.startsWith('ta') ? 'ta' : 'en';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inQuestionnaire, setInQuestionnaire] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [finalRecommendations, setFinalRecommendations] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [catalogSchemes, setCatalogSchemes] = useState(ALL_DISPLAY_SCHEMES);

  // Web Speech States
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState(null);
  const [speechError, setSpeechError] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');
  const [voices, setVoices] = useState([]);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // Populate speech synthesis voices (handles async onvoiceschanged in Chrome/Safari)
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setVoices(v);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // When global portal language changes, cancel any active voice and clear errors
  useEffect(() => {
    stopSpeaking();
    setVoiceNotice('');
    setSpeechError('');
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, [i18n.language]);

  // Sync live products from backend catalog on mount
  useEffect(() => {
    loanProductAPI
      .getActive()
      .then((res) => {
        if (res.data?.data && res.data.data.length > 0) {
          const live = res.data.data;
          setCatalogSchemes((prev) =>
            prev.map((s) => {
              const matched = live.find((p) => p.slugId === s.id || p.code === s.code);
              return matched
                ? {
                    ...s,
                    _id: matched._id,
                    name: matched.name || s.name,
                    minAmount: matched.minAmount || s.minAmount,
                    maxAmount: matched.maxAmount || s.maxAmount,
                    interestRate:
                      matched.interestRate !== undefined ? matched.interestRate : s.interestRate,
                    minTenure: matched.minTenure || s.minTenure,
                    maxTenure: matched.maxTenure || s.maxTenure,
                    acceptingApplications: matched.acceptingApplications,
                  }
                : s;
            })
          );
        }
      })
      .catch((err) => {
        console.warn('Chatbot live catalog fetch notice:', err.message);
      });
  }, []);

  // Initialize Speech Recognition using global website language
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Select recognition language strictly matching website language
      const recLang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.lang = recLang;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
        setVoiceNotice('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInput(interim);
        }

        if (final) {
          const trimmedFinal = final.trim();
          setInput(trimmedFinal);
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Chatbot] Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError(
            currentLang === 'ta'
              ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. தயவுசெய்து உலாவி அமைப்புகளில் மைக்கை இயக்கவும்.'
              : 'Microphone permission denied. Please allow microphone access in your browser address bar.'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError(
            currentLang === 'ta'
              ? 'குரல் எதுவும் கேட்கவில்லை. மீண்டும் மைக் அழுத்தி தெளிவாகப் பேசவும்.'
              : 'No speech was detected. Please click the mic and speak clearly.'
          );
        } else {
          setSpeechError(
            currentLang === 'ta'
              ? `குரல் அறிதலில் பிழை: ${event.error}`
              : `Speech recognition error: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
      setIsSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [currentLang]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open, isListening]);

  // Toggle microphone
  const toggleListening = () => {
    stopSpeaking();
    setSpeechError('');
    setVoiceNotice('');

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      setSpeechError(
        currentLang === 'ta'
          ? 'குரல் உள்ளீடு உங்கள் உலாவியில் ஆதரிக்கப்படவில்லை (Web Speech API தேவை). Chrome அல்லது Edge உலாவியைப் பயன்படுத்தவும் அல்லது கீழே தட்டச்சு செய்யவும்.'
          : 'Speech recognition is not supported in this browser (Web Speech API required). Please use Chrome/Edge or type your question below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const recLang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.lang = recLang;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Chatbot] Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError(
            currentLang === 'ta'
              ? 'மைக் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்புகளில் மைக் அனுமதியை இயக்கவும்.'
              : 'Microphone permission was denied. Please allow microphone access in your browser address bar.'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError(
            currentLang === 'ta'
              ? 'குரல் எதுவும் கேட்கவில்லை. மீண்டும் மைக் அழுத்தி பேசவும்.'
              : 'No speech was detected. Please click the mic and speak clearly.'
          );
        } else {
          setSpeechError(
            currentLang === 'ta'
              ? `குரல் பிழை: ${event.error}`
              : `Speech recognition error: ${event.error}`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
      setIsListening(false);
      setSpeechError(
        currentLang === 'ta'
          ? 'மைக் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
          : 'Could not start microphone. Please try again.'
      );
    }
  };

  // Stop current speech playback
  const stopSpeaking = () => {
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch {
        // ignore
      }
      setIsSpeaking(false);
      setCurrentlySpeakingIndex(null);
    }
  };

  // Helper: Find Tamil Voice in browser
  const findTamilVoice = (voiceList) => {
    return voiceList.find((v) => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      const n = (v.name || '').toLowerCase();
      return l === 'ta-in' || l.startsWith('ta-') || l === 'ta' || n.includes('tamil');
    });
  };

  // Helper: Find English Voice in browser (prefer Indian English)
  const findEnglishVoice = (voiceList) => {
    return (
      voiceList.find((v) => {
        const l = (v.lang || '').toLowerCase().replace('_', '-');
        return l === 'en-in';
      }) ||
      voiceList.find((v) => {
        const l = (v.lang || '').toLowerCase().replace('_', '-');
        return l.startsWith('en');
      })
    );
  };

  // Speak an assistant message aloud
  const speakMessage = useCallback(
    async (msg, msgIndex) => {
      if (!synthRef.current) return;

      try {
        synthRef.current.cancel();

        if (isSpeaking && currentlySpeakingIndex === msgIndex) {
          setIsSpeaking(false);
          setCurrentlySpeakingIndex(null);
          return;
        }

        setVoiceNotice('');

        let msgContent = msg.text || getMessageRawText(msg);
        let audioText = msg.audioText;
        const isTamil = currentLang === 'ta';
        const targetLang = isTamil ? 'ta-IN' : 'en-IN';

        // Check if message content language mismatches global website language
        const contentHasTamil = isTamilText(msgContent);
        if (isTamil && !contentHasTamil) {
          // Message is English, but website is now in Tamil: fetch Tamil translation
          try {
            const queryToUse = msg.query || (msg.intent === 'LOAN_BALANCE' ? 'கடன் நிலுவைத் தொகை' : msg.intent === 'REPAYMENT_DUE' ? 'அடுத்த தவணை தேதி' : 'கடன் உதவி');
            const res = await assistantAPI.query({
              query: queryToUse,
              language: 'ta',
            });
            if (res.data?.success && res.data?.data?.reply) {
              msgContent = res.data.data.reply;
              audioText = res.data.data.audioText;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === msgIndex ? { ...m, text: msgContent, audioText: audioText, language: 'ta' } : m
                )
              );
            }
          } catch (e) {
            console.warn('[Chatbot] Translation on voice request warning:', e.message);
          }
        } else if (!isTamil && contentHasTamil) {
          // Message is Tamil, but website is now in English: fetch English translation
          try {
            const queryToUse = msg.query || (msg.intent === 'LOAN_BALANCE' ? 'What is my loan balance?' : msg.intent === 'REPAYMENT_DUE' ? 'When is my next EMI due?' : 'Loan assistance');
            const res = await assistantAPI.query({
              query: queryToUse,
              language: 'en',
            });
            if (res.data?.success && res.data?.data?.reply) {
              msgContent = res.data.data.reply;
              audioText = res.data.data.audioText;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === msgIndex ? { ...m, text: msgContent, audioText: audioText, language: 'en' } : m
                )
              );
            }
          } catch (e) {
            console.warn('[Chatbot] Translation on voice request warning:', e.message);
          }
        }

        const allVoices = voices.length > 0 ? voices : synthRef.current.getVoices() || [];

        let selectedVoice = null;
        if (isTamil) {
          selectedVoice = findTamilVoice(allVoices);
          if (!selectedVoice) {
            // Strict requirement: Never read Tamil text with an inappropriate English voice!
            setVoiceNotice(
              'இந்த சாதனத்தில் தமிழ் குரல் வசதி (Tamil Voice) கிடைக்கவில்லை. திரையில் உள்ள உரையைப் படிக்கவும்.'
            );
            return;
          }
        } else {
          selectedVoice = findEnglishVoice(allVoices);
        }

        const rawSpeechText = audioText || msgContent;
        const speechText = cleanTextForSpeech(rawSpeechText, isTamil);
        if (!speechText) return;

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = targetLang;
        utterance.rate = isTamil ? 0.9 : 0.95;
        utterance.pitch = 1.0;
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setCurrentlySpeakingIndex(msgIndex);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentlySpeakingIndex(null);
        };

        utterance.onerror = (e) => {
          console.warn('[Chatbot] Speech synthesis error:', e);
          setIsSpeaking(false);
          setCurrentlySpeakingIndex(null);
        };

        synthRef.current.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
        setIsSpeaking(false);
        setCurrentlySpeakingIndex(null);
      }
    },
    [isSpeaking, currentlySpeakingIndex, currentLang, voices]
  );

  // Helper to parse numeric values from user input
  const parseNumber = (val) => {
    if (!val) return null;
    const clean = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? null : num;
  };

  // Welcome message
  const startConversation = () => {
    setMessages([{ sender: 'bot', type: 'welcome' }]);
    setInQuestionnaire(false);
    setCurrentStep(0);
    setAnswers({});
    setFinalRecommendations([]);
    setSelectedScheme(null);
    setVoiceNotice('');
  };

  // Start the 5-step questionnaire
  const startQuestionnaire = () => {
    setInQuestionnaire(true);
    setCurrentStep(0);
    setAnswers({});
    setFinalRecommendations([]);
    setSelectedScheme(null);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'bot',
        type: 'question_intro',
        step: 0,
      },
    ]);
  };

  // Core Recommendation Engine
  const computeRecommendations = (collectedAnswers) => {
    const purposeInput = (collectedAnswers.purpose || '').toLowerCase();
    const activityInput = (collectedAnswers.activity || '').toLowerCase();
    const reqAmount = parseNumber(collectedAnswers.amount);
    const reqTenure = parseNumber(collectedAnswers.repayment);
    const isMember =
      (collectedAnswers.membership || '').toLowerCase().includes('yes') ||
      (collectedAnswers.membership || '').toLowerCase().includes('y') ||
      (collectedAnswers.membership || '').toLowerCase().includes('member') ||
      (collectedAnswers.membership || '').includes('ஆம்') ||
      (collectedAnswers.membership || '').includes('உறுப்பினர்');

    const catalog =
      catalogSchemes && catalogSchemes.length > 0 ? catalogSchemes : ALL_DISPLAY_SCHEMES;

    const scored = catalog.map((scheme) => {
      let score = 0;
      const matchReasonKeys = [];
      const schemePurpose = (scheme.purpose || '').toLowerCase();
      const schemeCat = (scheme.category || '').toLowerCase();
      const schemeName = (scheme.name || '').toLowerCase();
      const schemeDesc = (scheme.description || '').toLowerCase();
      const fullText = `${schemePurpose} ${schemeCat} ${schemeName} ${schemeDesc}`;

      // 1. Purpose Match
      if (purposeInput) {
        if (
          purposeInput.includes('irrigat') ||
          purposeInput.includes('water') ||
          purposeInput.includes('drip') ||
          purposeInput.includes('pump') ||
          purposeInput.includes('பாசனம்') ||
          purposeInput.includes('நீர்') ||
          purposeInput.includes('சொட்டு') ||
          purposeInput.includes('பம்ப்')
        ) {
          if (fullText.includes('irrigat') || fullText.includes('water')) {
            score += 55;
            matchReasonKeys.push('irrigation');
          }
        } else if (
          purposeInput.includes('crop') ||
          purposeInput.includes('seed') ||
          purposeInput.includes('fertiliz') ||
          purposeInput.includes('பயிர்') ||
          purposeInput.includes('விதை') ||
          purposeInput.includes('உரம்') ||
          purposeInput.includes('சாகுபடி')
        ) {
          if (fullText.includes('crop') || fullText.includes('input') || fullText.includes('seed')) {
            score += 50;
            matchReasonKeys.push('crops');
          }
        } else if (
          purposeInput.includes('machin') ||
          purposeInput.includes('tractor') ||
          purposeInput.includes('equip') ||
          purposeInput.includes('tiller') ||
          purposeInput.includes('இயந்திரம்') ||
          purposeInput.includes('டிராக்டர்') ||
          purposeInput.includes('கருவி')
        ) {
          if (fullText.includes('machin') || fullText.includes('tractor') || fullText.includes('equip')) {
            score += 50;
            matchReasonKeys.push('machinery');
          }
        } else if (
          purposeInput.includes('polyhouse') ||
          purposeInput.includes('greenhouse') ||
          purposeInput.includes('shade') ||
          purposeInput.includes('பாலிஹவுஸ்') ||
          purposeInput.includes('நிழல்')
        ) {
          if (fullText.includes('polyhouse') || fullText.includes('cultivation')) {
            score += 50;
            matchReasonKeys.push('polyhouse');
          }
        } else if (
          purposeInput.includes('stor') ||
          purposeInput.includes('warehous') ||
          purposeInput.includes('cold') ||
          purposeInput.includes('கிடங்கு') ||
          purposeInput.includes('சேமிப்பு')
        ) {
          if (fullText.includes('stor') || fullText.includes('warehous')) {
            score += 50;
            matchReasonKeys.push('storage');
          }
        } else if (
          purposeInput.includes('dairy') ||
          purposeInput.includes('cattle') ||
          purposeInput.includes('cow') ||
          purposeInput.includes('milk') ||
          purposeInput.includes('பால்') ||
          purposeInput.includes('மாடு') ||
          purposeInput.includes('கால்நடை')
        ) {
          if (fullText.includes('dairy')) {
            score += 50;
            matchReasonKeys.push('dairy');
          }
        } else if (
          purposeInput.includes('poultry') ||
          purposeInput.includes('bird') ||
          purposeInput.includes('chicken') ||
          purposeInput.includes('கோழி')
        ) {
          if (fullText.includes('poultry')) {
            score += 50;
            matchReasonKeys.push('poultry');
          }
        } else if (
          purposeInput.includes('goat') ||
          purposeInput.includes('sheep') ||
          purposeInput.includes('ஆடு')
        ) {
          if (fullText.includes('goat')) {
            score += 50;
            matchReasonKeys.push('goat');
          }
        } else if (
          purposeInput.includes('fish') ||
          purposeInput.includes('aqua') ||
          purposeInput.includes('மீன்')
        ) {
          if (fullText.includes('fish')) {
            score += 50;
            matchReasonKeys.push('fish');
          }
        } else if (purposeInput.split(' ').some((word) => word.length > 3 && fullText.includes(word))) {
          score += 25;
          matchReasonKeys.push('general');
        }
      }

      // 2. Activity Match
      if (activityInput) {
        if (
          (activityInput.includes('coconut') || activityInput.includes('தென்னை')) &&
          fullText.includes('coconut')
        ) {
          score += 35;
          matchReasonKeys.push('coconut');
        } else if (
          (activityInput.includes('dairy') || activityInput.includes('பால்')) &&
          fullText.includes('dairy')
        ) {
          score += 35;
          matchReasonKeys.push('dairy');
        }
      }

      // 3. Amount Compatibility
      let amountReason = null;
      if (reqAmount) {
        if (reqAmount >= scheme.minAmount && reqAmount <= scheme.maxAmount) {
          score += 30;
          amountReason = {
            en: `Requested amount ₹${reqAmount.toLocaleString('en-IN')} is within limits (₹${scheme.minAmount.toLocaleString('en-IN')} - ₹${scheme.maxAmount.toLocaleString('en-IN')})`,
            ta: `கோரப்பட்ட தொகை ₹${reqAmount.toLocaleString('en-IN')} திட்ட வரம்பிற்குள் உள்ளது (₹${scheme.minAmount.toLocaleString('en-IN')} - ₹${scheme.maxAmount.toLocaleString('en-IN')})`,
          };
        } else if (reqAmount < scheme.minAmount && reqAmount >= scheme.minAmount * 0.7) {
          score += 10;
          amountReason = {
            en: `Amount ₹${reqAmount.toLocaleString('en-IN')} is close to minimum limit (₹${scheme.minAmount.toLocaleString('en-IN')})`,
            ta: `தொகை ₹${reqAmount.toLocaleString('en-IN')} குறைந்தபட்ச வரம்பிற்கு அருகில் உள்ளது (₹${scheme.minAmount.toLocaleString('en-IN')})`,
          };
        }
      }

      // 4. Tenure Compatibility
      let tenureReason = null;
      if (reqTenure) {
        if (reqTenure >= scheme.minTenure && reqTenure <= scheme.maxTenure) {
          score += 20;
          tenureReason = {
            en: `Preferred tenure of ${reqTenure} months matches approved tenure (${scheme.minTenure} - ${scheme.maxTenure} months)`,
            ta: `விருப்பமான காலம் ${reqTenure} மாதங்கள் அனுமதிக்கப்பட்ட காலத்திற்குள் உள்ளது (${scheme.minTenure} - ${scheme.maxTenure} மாதங்கள்)`,
          };
        }
      }

      // 5. FPO Membership
      if (isMember) {
        score += 15;
        matchReasonKeys.push('fpo_member');
      }

      // 6. Real Scheme Priority
      if (!scheme.illustrative) {
        score += 50;
      }

      return {
        scheme,
        score,
        matchReasonKeys,
        amountReason,
        tenureReason,
      };
    });

    const matched = scored
      .filter((item) => item.score >= 40)
      .sort((a, b) => b.score - a.score);

    const topPicks = matched.slice(0, 2).map((item) => ({
      ...item.scheme,
      score: item.score,
      matchReasonKeys: item.matchReasonKeys,
      amountReason: item.amountReason,
      tenureReason: item.tenureReason,
    }));

    return topPicks;
  };

  // Finish Questionnaire and present recommendations
  const finishQuestionnaire = (collectedAnswers) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setInQuestionnaire(false);

      const topRecommendations = computeRecommendations(collectedAnswers);
      setFinalRecommendations(topRecommendations);

      if (topRecommendations.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            type: 'no_match',
          },
        ]);
        return;
      }

      setSelectedScheme(topRecommendations[0]);

      const recMessages = topRecommendations.map((sch, idx) => ({
        sender: 'bot',
        type: 'rec_item',
        scheme: sch,
        idx,
      }));

      setMessages((prev) => [
        ...prev,
        { sender: 'bot', type: 'rec_intro', count: topRecommendations.length },
        ...recMessages,
        { sender: 'bot', type: 'rec_followup', showFollowUps: true },
      ]);
    }, 700);
  };

  // Intent handler for follow-up and standalone questions
  const handleIntent = async (msgText, targetLang) => {
    const lower = msgText.toLowerCase().trim();
    const activeScheme =
      selectedScheme || (finalRecommendations.length > 0 ? finalRecommendations[0] : null);

    // 1. Request to find or recommend a loan questionnaire
    if (
      lower.includes('which loan is suitable') ||
      lower.includes('suitable for me') ||
      lower.includes('find a loan') ||
      lower.includes('suitable loan') ||
      lower.includes('start over') ||
      lower.includes('restart') ||
      lower.includes('எந்த கடன்') ||
      lower.includes('பொருத்தமான கடன்')
    ) {
      startQuestionnaire();
      return true;
    }

    // 2. Personal Account Queries Grounded in Real Backend Data
    const isPersonalQuery =
      lower.includes('balance') ||
      lower.includes('outstanding') ||
      lower.includes('paid so far') ||
      lower.includes('how much have i paid') ||
      lower.includes('how much do i owe') ||
      lower.includes('remaining') ||
      lower.includes('நிலுவை') ||
      lower.includes('பாக்கி') ||
      lower.includes('கடன் தொகை') ||
      lower.includes('அடுத்த தவணை') ||
      lower.includes('தவணை தேதி') ||
      lower.includes('next emi') ||
      lower.includes('due date') ||
      lower.includes('next installment') ||
      lower.includes('kyc') ||
      lower.includes('கேஒய்சி') ||
      lower.includes('சரிபார்ப்பு') ||
      lower.includes('விண்ணப்ப நிலை') ||
      lower.includes('கடன் நிலை') ||
      lower.includes('status') ||
      lower.includes('application') ||
      lower.includes('ஆவணங்கள்') ||
      lower.includes('விடுபட்ட') ||
      lower.includes('missing document');

    if (isPersonalQuery) {
      try {
        const res = await assistantAPI.query({
          query: msgText,
          language: targetLang,
        });

        if (res.data?.success && res.data?.data?.reply) {
          const data = res.data.data;
          setMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              type: 'assistant_reply',
              text: data.reply,
              audioText: data.audioText,
              intent: data.intent,
              language: data.language || targetLang,
              showFollowUps: true,
            },
          ]);
          return true;
        }
      } catch (err) {
        console.warn('[Chatbot] Assistant backend query notice:', err.message);
      }
    }

    // 3. "How do I apply?"
    if (
      lower.includes('how do i apply') ||
      lower.includes('how to apply') ||
      lower.includes('apply for a loan') ||
      lower === 'apply' ||
      lower.includes('application steps') ||
      lower.includes('விண்ணப்ப') ||
      lower.includes('விண்ணப்பிக்க') ||
      lower.includes('விண்ணப்பிப்பது எப்படி')
    ) {
      const amt = (parseNumber(answers.amount) || activeScheme?.defaultAmount || 50000).toLocaleString('en-IN');
      const tenure = parseNumber(answers.repayment) || activeScheme?.defaultTenure || 12;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          type: 'intent_apply',
          scheme: activeScheme,
          amount: amt,
          tenure: tenure,
          language: targetLang,
        },
      ]);
      return true;
    }

    // 4. "What documents should I upload?" / "What documents do I need?"
    if (
      lower.includes('document') ||
      lower.includes('docs') ||
      lower.includes('upload') ||
      lower.includes('what documents') ||
      lower.includes('ஆவணம்') ||
      lower.includes('ஆவணங்கள்') ||
      lower.includes('பதிவேற்ற')
    ) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          type: 'intent_docs',
          scheme: activeScheme,
          language: targetLang,
        },
      ]);
      return true;
    }

    // 5. "What is the interest rate?"
    if (
      lower.includes('interest rate') ||
      lower.includes('interest') ||
      lower.includes('roi') ||
      lower.includes('rate of interest') ||
      lower.includes('வட்டி') ||
      lower.includes('வட்டி விகிதம்')
    ) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          type: 'intent_interest',
          scheme: activeScheme,
          language: targetLang,
        },
      ]);
      return true;
    }

    // 6. "What is my estimated EMI?" / "How much EMI will I pay?"
    if (
      lower.includes('emi') ||
      lower.includes('installment') ||
      lower.includes('monthly payment') ||
      lower.includes('calculate emi') ||
      lower.includes('மாதத் தவணை') ||
      lower.includes('தவணை')
    ) {
      const targetScheme = activeScheme || FPO_AVAILABLE_SCHEMES[0];
      const amt = parseNumber(answers.amount) || targetScheme.defaultAmount;
      const tenure = parseNumber(answers.repayment) || targetScheme.defaultTenure;
      const rate = targetScheme.interestRate || 6.0;
      const emiCalc = calculateEMI(amt, rate, tenure);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          type: 'intent_emi',
          scheme: targetScheme,
          amt,
          tenure,
          rate,
          emiCalc,
          language: targetLang,
        },
      ]);
      return true;
    }

    // 7. General inquiry query sent to backend assistant
    try {
      const res = await assistantAPI.query({
        query: msgText,
        language: targetLang,
      });

      if (res.data?.success && res.data?.data?.reply) {
        const data = res.data.data;
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            type: 'assistant_reply',
            text: data.reply,
            audioText: data.audioText,
            intent: data.intent,
            language: data.language || targetLang,
            showFollowUps: true,
          },
        ]);
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  // Handle user sending a message
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    stopSpeaking();
    setVoiceNotice('');

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    // Global query language
    const queryLang = currentLang;

    setMessages((prev) => [...prev, { sender: 'user', text: trimmed, language: queryLang }]);
    setInput('');

    if (inQuestionnaire) {
      const currentQ = QUESTION_DEFINITIONS[currentStep];
      const answerVal =
        trimmed.toLowerCase() === 'skip' || trimmed === 'தவிர்' ? 'Not specified' : trimmed;
      const updatedAnswers = { ...answers, [currentQ.key]: answerVal };
      setAnswers(updatedAnswers);

      const nextStep = currentStep + 1;
      if (nextStep < QUESTION_DEFINITIONS.length) {
        setCurrentStep(nextStep);
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          setMessages((prev) => [
            ...prev,
            { sender: 'bot', type: 'question', step: nextStep, language: queryLang },
          ]);
        }, 400);
      } else {
        finishQuestionnaire(updatedAnswers);
      }
      return;
    }

    setLoading(true);
    const handled = await handleIntent(trimmed, queryLang);
    setLoading(false);

    if (!handled) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          type: 'fallback',
          showFollowUps: true,
          language: queryLang,
        },
      ]);
    }
  };

  // Handle clicking a suggestion chip
  const handleSuggestedClick = async (suggestionText) => {
    stopSpeaking();
    setVoiceNotice('');

    const queryLang = currentLang;

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: suggestionText, language: queryLang },
    ]);

    if (
      suggestionText.includes('suitable') ||
      suggestionText.includes('ஏற்றது') ||
      suggestionText.includes('பொருத்தமான')
    ) {
      startQuestionnaire();
      return;
    }

    setLoading(true);
    await handleIntent(suggestionText, queryLang);
    setLoading(false);
  };

  // Reset/Clear conversation
  const handleClear = () => {
    stopSpeaking();
    setVoiceNotice('');
    setSpeechError('');
    setMessages([]);
    setAnswers({});
    setCurrentStep(0);
    setInQuestionnaire(false);
    setFinalRecommendations([]);
    setSelectedScheme(null);
    setInput('');
  };

  // Edit previous answer in conversation
  const handleEdit = (msgIndex) => {
    stopSpeaking();
    setVoiceNotice('');
    const userMsg = messages[msgIndex];
    if (!userMsg || userMsg.sender !== 'user') return;

    let userMsgCount = 0;
    for (let i = 0; i <= msgIndex; i++) {
      if (messages[i].sender === 'user') userMsgCount++;
    }

    const targetStep = Math.min(userMsgCount - 1, QUESTION_DEFINITIONS.length - 1);
    if (targetStep < 0) return;

    const newMsgs = messages.slice(0, msgIndex);
    setMessages(newMsgs);
    setCurrentStep(targetStep);
    setInQuestionnaire(true);

    const newAns = { ...answers };
    for (let i = targetStep; i < QUESTION_DEFINITIONS.length; i++) {
      delete newAns[QUESTION_DEFINITIONS[i].key];
    }
    setAnswers(newAns);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', type: 'edit_intro', step: targetStep, language: currentLang },
      ]);
    }, 200);
  };

  // Extract raw text for TTS speech and formatted rendering
  const getMessageRawText = (msg) => {
    if (msg.sender === 'user') {
      return msg.text;
    }

    const lang = currentLang;

    switch (msg.type) {
      case 'assistant_reply':
        return msg.text;

      case 'welcome':
        return t('chatbot.messages.welcome');

      case 'question_intro': {
        const qText = QUESTION_DEFINITIONS[msg.step][lang] || QUESTION_DEFINITIONS[msg.step]['ta'];
        return t('chatbot.messages.startQuestionnaire') + qText;
      }

      case 'question':
        return QUESTION_DEFINITIONS[msg.step][lang] || QUESTION_DEFINITIONS[msg.step]['ta'];

      case 'edit_intro': {
        const qText = QUESTION_DEFINITIONS[msg.step][lang] || QUESTION_DEFINITIONS[msg.step]['ta'];
        return t('chatbot.messages.updateAnswer') + qText;
      }

      case 'no_match':
        return t('chatbot.messages.noMatchFound');

      case 'rec_intro':
        return msg.count === 1
          ? t('chatbot.messages.recIntroSingle')
          : t('chatbot.messages.recIntroMultiple');

      case 'rec_item': {
        const sch = msg.scheme;
        const isDemo = sch.illustrative;
        const badgeLabel = isDemo
          ? `[${t('chatbot.demoBadge', 'Illustrative Demo')}]`
          : `[${t('chatbot.activeBadge', 'Active Scheme')}]`;

        const reasonsList = [];
        (sch.matchReasonKeys || []).forEach((rk) => {
          if (MATCH_REASONS[rk]) {
            reasonsList.push(`• ${MATCH_REASONS[rk][lang] || MATCH_REASONS[rk]['ta']}`);
          }
        });
        if (sch.amountReason) {
          reasonsList.push(`• ${sch.amountReason[lang] || sch.amountReason['ta']}`);
        }
        if (sch.tenureReason) {
          reasonsList.push(`• ${sch.tenureReason[lang] || sch.tenureReason['ta']}`);
        }

        const localizedSchemeName = t(`farmerLoans.schemes.${sch.id}.name`, sch.name);
        const reasonsText = reasonsList.join('\n');
        const eligibilityReqs = (sch.eligibilityCriteria || [])
          .slice(0, 3)
          .map((c) => `• ${c}`)
          .join('\n');
        const docs = (sch.requiredDocuments || [])
          .slice(0, 3)
          .map((d) => `• ${d.title || d.type.replace('_', ' ')}`)
          .join('\n');

        let out = `### #${msg.idx + 1}: ${localizedSchemeName} ${badgeLabel}\n\n`;
        out += `**${t('chatbot.messages.financialTerms', 'Financial Terms:')}**\n• ${t('farmerLoans.interestRate')}: **${sch.interestRate}% ${t('chatbot.pa', 'p.a.')}**\n• ${t('chatbot.messages.sanctionLimit', 'Sanction Limit:')} ₹${sch.minAmount.toLocaleString('en-IN')} – ₹${sch.maxAmount.toLocaleString('en-IN')}\n• ${t('farmerLoans.tenure')}: ${sch.minTenure} – ${sch.maxTenure} ${t('chatbot.messages.tenureMonths', 'Months')}\n\n`;
        out += `**${t('chatbot.messages.whyMatches', 'Why It Matches Your Needs:')}**\n${reasonsText}\n\n`;
        if (eligibilityReqs) {
          out += `**${t('chatbot.messages.keyEligibility', 'Key Eligibility Verification Conditions:')}**\n${eligibilityReqs}\n\n`;
        }
        if (docs) {
          out += `**${t('chatbot.messages.reqDocs', 'Required Documents:')}**\n${docs}\n\n`;
        }
        if (isDemo) {
          out += `*${t('chatbot.messages.demoNotice', 'Notice: This is an illustrative demonstration product. Applications cannot be submitted for this entry.')}*`;
        }
        return out;
      }

      case 'rec_followup':
        return t('chatbot.messages.recFollowUp');

      case 'intent_apply': {
        const sch = msg.scheme;
        if (sch && !sch.illustrative) {
          const localizedName = t(`farmerLoans.schemes.${sch.id}.name`, sch.name);
          if (lang === 'ta') {
            return `### ${localizedName} திட்டத்திற்கு விண்ணப்பிப்பது எப்படி:\n\n1. கீழே உள்ள **இப்போதே விண்ணப்பிக்கவும்** பொத்தானைக் கிளிக் செய்யவும் (அல்லது விண்ணப்பிக்கும் பக்கத்திற்குச் செல்லவும்).\n2. நீங்கள் கோரிய தொகை (₹${msg.amount}) மற்றும் காலம் (${msg.tenure} மாதங்கள்) தானாக நிரப்பப்படும்.\n3. உங்கள் விவசாய நடவடிக்கை மற்றும் நோக்கத்தை மதிப்பாய்வு செய்து உறுதிப்படுத்தவும்.\n4. உங்கள் சரிபார்ப்பு ஆவணங்கள் (அடையாள அட்டை, FPO உறுப்பினர் சான்று, நில ஆவணம்/பட்டா, வங்கி கணக்கு புத்தகம்) தயாராக இருப்பதை உறுதிசெய்யவும்.\n5. **விண்ணப்பத்தை சமர்ப்பிக்கவும்** என்பதைக் கிளிக் செய்யவும். 'எனது விண்ணப்பங்கள்' பிரிவில் கண்காணிக்க விண்ணப்ப ஐடி (Application ID) வழங்கப்படும்.`;
          }
          return `### How to Apply for ${localizedName}:\n\n1. Click the **Apply Now** button below (or navigate to the Apply page).\n2. Your requested amount (₹${msg.amount}) and tenure (${msg.tenure} months) are pre-filled.\n3. Review and confirm your farming activity and purpose.\n4. Ensure your verification documents (Identity, FPO Membership, Land Record, Bank Statement) are ready.\n5. Click **Submit Application**. You will receive an Application ID to track under 'My Applications'.`;
        }
        if (lang === 'ta') {
          return `### ஃபார்ம்ஸ்பியர் கடன் விண்ணப்ப செயல்முறை:\n\n1. **திட்டங்களை உலாவுக**: **கிடைக்கும் கடன்கள்** பட்டியலில் கிடைக்கக்கூடிய கடன் திட்டங்களை ஆராயுங்கள்.\n2. **தகுதி மற்றும் EMI-ஐ சரிபார்க்கவும்**: தவணைகளைக் கணக்கிட எங்கள் ஊடாடும் கால்குலேட்டரைப் பயன்படுத்தவும்.\n3. **விண்ணப்பத்தை நிரப்பவும்**: செயலில் உள்ள திட்டத்தைத் தேர்ந்தெடுத்து **இப்போதே விண்ணப்பிக்கவும்** என்பதைக் கிளிக் செய்யவும்.\n4. **சரிபார்ப்பு ஆவணங்களை பதிவேற்றவும்**: அடையாள அட்டை, FPO பங்குச் சான்றிதழ் மற்றும் நில ஆவணங்களை வழங்கவும்.\n5. **FPO மதிப்பாய்வு & அனுமதி**: FPO கடன் குழு மதிப்பீடு செய்து உங்கள் சரிபார்க்கப்பட்ட வங்கிக் கணக்கில் நேரடியாக நிதியை வழங்கும்.\n\nஉங்களுக்கான குறிப்பிட்ட கடன் திட்டத்தைக் கண்டறிய வேண்டுமா? தொடங்க **எந்த கடன் எனக்கு ஏற்றது?** என்பதைக் கிளிக் செய்யவும்!`;
        }
        return `### FarmSphere Loan Application Process:\n\n1. **Browse Schemes**: Explore available credit lines in the **Available Loans** catalog.\n2. **Check Eligibility & EMI**: Use our interactive calculator to verify monthly installments.\n3. **Fill Application**: Select an active scheme and click **Apply Now**.\n4. **Upload Verification Docs**: Provide identity proof, FPO share certificate, and land records.\n5. **FPO Review & Sanction**: The FPO loan review committee evaluates and disburses approved funds directly to your verified bank account.\n\nWould you like me to find a specific loan scheme for you? Click **Which loan is suitable for me?** to get started!`;
      }

      case 'intent_docs': {
        const sch = msg.scheme;
        if (sch) {
          const localizedName = t(`farmerLoans.schemes.${sch.id}.name`, sch.name);
          const docList = (sch.requiredDocuments || [])
            .map((d, i) => `${i + 1}. **${d.title}** (${d.type.replace('_', ' ')}): ${d.description}`)
            .join('\n');
          if (lang === 'ta') {
            return `### ${localizedName} திட்டத்திற்கு தேவையான ஆவணங்கள்:\n\n${docList || '• நிலையான FPO அடையாளம், உறுப்பினர் மற்றும் நில ஆவணங்கள் தேவை.'}\n\n*குறிப்பு: கடன் விண்ணப்பத்தின் போது இந்த ஆவணங்களை நேரடியாக பதிவேற்றலாம் அல்லது **ஆவணங்கள்** பகுதியில் நிர்வகிக்கலாம்.*`;
          }
          return `### Required Documents for ${localizedName}:\n\n${docList || '• Standard FPO Identity, Membership, and Land records required.'}\n\n*Tip: You can upload these documents directly during loan application or manage them in the **Documents** tab.*`;
        }
        if (lang === 'ta') {
          return `### ஃபார்ம்ஸ்பியர் FPO கடன்களுக்குத் தேவையான நிலையான ஆவணங்கள்:\n\n1. **அடையாளச் சான்று**: அரசு புகைப்பட அடையாள அட்டை (ஆதார் அட்டை அல்லது வாக்காளர் அடையாள அட்டை)\n2. **முகவரிச் சான்று**: மின் கட்டண ரசீது, ரேஷன் அட்டை அல்லது பயன்பாட்டு ரசீது\n3. **FPO உறுப்பினர் சான்று**: பதிவுசெய்த செயலில் உள்ள உறுப்பினர் பங்கை உறுதிப்படுத்தும் பங்குச் சான்றிதழ்\n4. **நில ஆவணங்கள் / பட்டா**: சாகுபடி பரப்பளவைக் காட்டும் பட்டா/சிட்டா அல்லது பதிவுசெய்யப்பட்ட குத்தகை ஒப்பந்தம்\n5. **வங்கி கணக்கு புத்தகம் / அறிக்கை**: 6 மாத செயலில் உள்ள வங்கி கணக்கு அறிக்கை\n6. **விலைப்புள்ளிகள் / விலைப்பட்டியல்கள்**: விற்பனையாளர் விலைப்புள்ளி (இயந்திரங்கள் அல்லது பாசனக் கடன்களுக்கு)\n\n*உங்கள் குறிப்பிட்ட கடனுக்கான ஆவணங்களைப் பார்க்க "எந்த கடன் எனக்கு ஏற்றது?" என்று கேளுங்கள்!*`;
        }
        return `### Standard Required Documents for FarmSphere FPO Loans:\n\n1. **Identity Proof**: Government photo ID (Aadhaar Card or Voter ID)\n2. **Address Proof**: Electricity bill, Ration card, or utility receipt\n3. **FPO Membership Proof**: Share certificate confirming active registered membership\n4. **Land Records / Patta**: 7/12 extract or registered tenancy agreement showing cultivable area\n5. **Bank Passbook / Statement**: 6 months active bank account statement\n6. **Quotations / Invoices**: Vendor quotation (for Machinery or Irrigation loans)\n\n*Ask "Which loan is suitable for me?" to see the exact documents for your specific loan!*`;
      }

      case 'intent_interest': {
        const sch = msg.scheme;
        if (sch) {
          const localizedName = t(`farmerLoans.schemes.${sch.id}.name`, sch.name);
          if (lang === 'ta') {
            return `### ${localizedName} திட்டத்திற்கான வட்டி விகிதம்:\n\n• **ஆண்டு வட்டி விகிதம்**: **${sch.interestRate}% ஆண்டுக்கு**\n• **கணக்கீட்டு முறை**: மாதாந்திர குறைந்துவரும் இருப்பு முறை (Reducing Balance Method)\n• **செயலாக்கக் கட்டணம்**: ${sch.processingFee || '₹0 (இலவசம் - FPO மானியம்)'}\n• **திருப்பிச் செலுத்தும் இடைவெளி**: ${sch.repaymentFrequency === 'MONTHLY' ? 'மாதாந்திரம்' : sch.repaymentFrequency || 'மாதாந்திரம்'}\n\n*இந்த மானிய வட்டி விகிதம் நற்பெயர் கொண்ட செயலில் உள்ள FPO உறுப்பினர்களுக்கு மட்டுமே பொருந்தும்.*`;
          }
          return `### Interest Rate for ${localizedName}:\n\n• **Annual Interest Rate**: **${sch.interestRate}% p.a.**\n• **Calculation Method**: Monthly reducing balance method (standard institutional formula)\n• **Processing Fee**: ${sch.processingFee || '₹0 (Nil - FPO Subsidized)'}\n• **Repayment Frequency**: ${sch.repaymentFrequency || 'MONTHLY'}\n\n*This subsidized rate is available exclusively to active registered FPO members in good standing.*`;
        }
        if (lang === 'ta') {
          return `### ஃபார்ம்ஸ்பியர் FPO நிறுவன வட்டி விகிதங்கள்:\n\n• **பருவகால பயிர் சாகுபடிக் கடன்**: **4.0% ஆண்டுக்கு** (மானியம்)\n• **அறுவடைக்கு பிந்தைய சேமிப்புக் கடன்**: **5.0% ஆண்டுக்கு**\n• **பண்ணை இயந்திரங்கள் & உபகரணங்கள்**: **5.5% ஆண்டுக்கு**\n• **சூரியசக்தி நுண்ணீர்ப் பாசனம் & நீர்**: **6.0% ஆண்டுக்கு**\n• **பாலிஹவுஸ் & பாதுகாக்கப்பட்ட சாகுபடி**: **7.0% ஆண்டுக்கு**\n\nஅனைத்து அதிகாரப்பூர்வ திட்டங்களும் குறைந்துவரும் இருப்பு EMI முறையைப் பயன்படுத்துகின்றன, பூஜ்ஜியம் அல்லது மானிய செயலாக்கக் கட்டணங்களுடன்.`;
        }
        return `### FarmSphere FPO Institutional Interest Rates:\n\n• **Seasonal Crop Production Loan**: **4.0% p.a.** (Subsidized)\n• **Post-Harvest Storage Credit**: **5.0% p.a.**\n• **Farm Machinery & Equipment**: **5.5% p.a.**\n• **Solar Micro-Irrigation & Water**: **6.0% p.a.**\n• **Polyhouse & Protected Cultivation**: **7.0% p.a.**\n\nAll official schemes use the reducing balance EMI method with nil or subsidized processing fees.`;
      }

      case 'intent_emi': {
        const sch = msg.scheme;
        const localizedName = t(`farmerLoans.schemes.${sch.id}.name`, sch.name);
        if (lang === 'ta') {
          return `### ${localizedName} திட்டத்திற்கான மதிப்பிடப்பட்ட EMI விவரம்:\n\n• **அசல் கடன் தொகை**: ₹${msg.amt.toLocaleString('en-IN')}\n• **வட்டி விகிதம்**: ஆண்டுக்கு ${msg.rate}% (குறைந்துவரும் இருப்பு)\n• **கடன் காலம்**: ${msg.tenure} மாதங்கள்\n• **மாதாந்திர தவணை (EMI)**: **₹${msg.emiCalc.emi.toLocaleString('en-IN')} / மாதம்**\n• **செலுத்த வேண்டிய மொத்த வட்டி**: ₹${msg.emiCalc.totalInterest.toLocaleString('en-IN')}\n• **மொத்த திருப்பிச் செலுத்தும் தொகை (அசல் + வட்டி)**: ₹${msg.emiCalc.totalRepayment.toLocaleString('en-IN')}\n\n*(குறிப்பு: இது குறைந்துவரும் இருப்பு சூத்திரத்தின் அடிப்படையிலான உத்தேச மதிப்பீடு ஆகும். உங்கள் அனுமதி தேதியுடன் உண்மையான தவணை அட்டவணை வழங்கப்படும்.)*`;
        }
        return `### Estimated EMI Projection for ${localizedName}:\n\n• **Principal Loan Amount**: ₹${msg.amt.toLocaleString('en-IN')}\n• **Interest Rate**: ${msg.rate}% p.a. (Reducing balance)\n• **Loan Tenure**: ${msg.tenure} Months\n• **Monthly EMI**: **₹${msg.emiCalc.emi.toLocaleString('en-IN')} / month**\n• **Total Interest Payable**: ₹${msg.emiCalc.totalInterest.toLocaleString('en-IN')}\n• **Total Repayment (P + I)**: ₹${msg.emiCalc.totalRepayment.toLocaleString('en-IN')}\n\n*(Note: This is an indicative estimate based on the reducing balance formula. Actual installment schedules will align with your sanction date.)*`;
      }

      case 'fallback': {
        if (lang === 'ta') {
          return `ஃபார்ம்ஸ்பியரில் விவசாயக் கடன்கள் குறித்து உங்களுக்கு உதவ நான் தயாராக உள்ளேன்.\n\nநீங்கள் என்னிடம் கேட்கலாம் அல்லது மைக் அழுத்திப் பேசலாம்:\n• **"எனது கடன் நிலுவைத் தொகை எவ்வளவு?"** — கடன் இருப்பு அறிதல்\n• **"அடுத்த தவணை எப்போது?"** — தவணை விவரம் & கடைசி தேதி\n• **"விண்ணப்ப நிலையை எவ்வாறு அறிவது?"** — உங்கள் நேரடி கடன் விண்ணப்பம்\n• **"எனது KYC நிலை என்ன?"** — ஆவண சரிபார்ப்பு நிலை\n• **"எந்த கடன் எனக்கு ஏற்றது?"** — தனிப்பயனாக்கப்பட்ட திட்டங்கள்`;
        }
        return `I'm here to assist you with agricultural credit on FarmSphere.\n\nYou can ask or click mic to speak about:\n• **"What is my outstanding loan balance?"** — Real-time balance lookup\n• **"When is my next installment due?"** — Next EMI & due date\n• **"How do I check my application status?"** — Track your live loan application\n• **"What is my KYC status?"** — Check verification state\n• **"Which loan is suitable for me?"** — Personalized recommendations`;
      }

      default:
        return msg.text || '';
    }
  };

  return (
    <>
      {/* Floating Chatbot Launch Button */}
      <button
        className="chatbot-float-btn"
        onClick={() => {
          setOpen(!open);
          if (!open && messages.length === 0) startConversation();
        }}
        aria-label={t('chatbot.openAria', 'Open FarmSphere loan assistance chatbot')}
        title={t('chatbot.title', 'FarmSphere Loan Assistant')}
      >
        💬
      </button>

      {/* Floating Chatbot Window */}
      {open && (
        <div
          className="chatbot-window"
          role="dialog"
          aria-modal="true"
          aria-label={t('chatbot.title', 'FarmSphere Loan Assistant')}
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-title">
              <Sparkles size={18} className="chatbot-sparkle" />
              <span>{t('chatbot.title', 'FarmSphere Loan Assistant')}</span>
            </div>

            <div className="chatbot-controls">
              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={handleClear}
                title={t('chatbot.clearChat', 'Clear conversation')}
                aria-label={t('chatbot.clearChat', 'Clear conversation')}
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={() => {
                  stopSpeaking();
                  if (isListening && recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                    } catch {
                      // ignore
                    }
                    setIsListening(false);
                  }
                  setOpen(false);
                }}
                title={t('chatbot.closeChat', 'Close window')}
                aria-label={t('chatbot.closeChat', 'Close window')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Active Speaking Indicator Bar */}
          {isSpeaking && (
            <div className="chatbot-speaking-bar">
              <Volume2 className="pulsing-speaker-icon" size={16} />
              <span>
                {currentLang === 'ta' ? 'பதில் ஒலிக்கிறது (ஆடியோ)...' : 'Speaking response audio...'}
              </span>
              <button
                type="button"
                className="chatbot-stop-speaking-btn"
                onClick={stopSpeaking}
                title="Stop speaking"
              >
                {currentLang === 'ta' ? 'நிறுத்து' : 'Stop'}
              </button>
            </div>
          )}

          {/* Missing Tamil Voice Notice Banner */}
          {voiceNotice && (
            <div className="chatbot-voice-notice">
              <AlertCircle size={16} className="notice-icon" />
              <span>{voiceNotice}</span>
              <button type="button" onClick={() => setVoiceNotice('')}>×</button>
            </div>
          )}

          {/* Recognition Error Banner */}
          {speechError && (
            <div className="chatbot-error-banner">
              <AlertCircle size={16} className="error-icon" />
              <span>{speechError}</span>
              <button type="button" onClick={() => setSpeechError('')}>×</button>
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="chatbot-body">
            {messages.length === 0 ? (
              <div className="chatbot-suggestions">
                <p className="chatbot-faq-heading">
                  {currentLang === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்:' : 'Frequently Asked Questions:'}
                </p>
                {SUGGESTIONS_BY_LANG[currentLang].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSuggestedClick(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <div className="chatbot-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.sender}`}>
                    <div className="message-text">
                      <div className="message-content-box">
                        <FormattedChatText text={getMessageRawText(msg)} />
                      </div>

                      {/* If welcome message, show the suggestion chips inline for immediate discovery */}
                      {msg.type === 'welcome' && (
                        <div className="welcome-suggestion-chips">
                          {SUGGESTIONS_BY_LANG[currentLang].map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="suggestion-chip"
                              onClick={() => handleSuggestedClick(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Interactive Scheme Card if attached to message */}
                      {msg.scheme && (
                        <div className="rec-card">
                          <div className="rec-card-header">
                            <h4 className="rec-card-title">
                              {t(`farmerLoans.schemes.${msg.scheme.id}.name`, msg.scheme.name)}
                            </h4>
                            <span className={`rec-badge ${msg.scheme.illustrative ? 'demo' : 'real'}`}>
                              {msg.scheme.illustrative
                                ? t('chatbot.demoBadge', 'Illustrative Demo')
                                : t('chatbot.activeBadge', 'Active Scheme')}
                            </span>
                          </div>
                          <div className="rec-metrics-grid">
                            <div className="rec-metric-item">
                              <strong>{t('chatbot.metricInterest', 'Interest')}:</strong>{' '}
                              {msg.scheme.interestRate}% {t('chatbot.pa', 'p.a.')}
                            </div>
                            <div className="rec-metric-item">
                              <strong>{t('chatbot.metricTenure', 'Tenure')}:</strong>{' '}
                              {msg.scheme.minTenure}-{msg.scheme.maxTenure} {t('chatbot.months', 'm')}
                            </div>
                            <div className="rec-metric-item">
                              <strong>{t('chatbot.metricMin', 'Min')}:</strong> ₹
                              {msg.scheme.minAmount?.toLocaleString('en-IN')}
                            </div>
                            <div className="rec-metric-item">
                              <strong>{t('chatbot.metricMax', 'Max')}:</strong> ₹
                              {msg.scheme.maxAmount?.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="rec-actions">
                            <button
                              type="button"
                              className="rec-btn-details"
                              onClick={() => {
                                setOpen(false);
                                navigate('/farmer/loans', {
                                  state: { selectedSchemeId: msg.scheme.id },
                                });
                              }}
                            >
                              {t('chatbot.viewDetails', 'View Details')}
                            </button>
                            {msg.scheme.illustrative ? (
                              <button
                                type="button"
                                className="rec-btn-apply"
                                disabled
                                title="Applications not available for demo products"
                              >
                                {t('chatbot.applyDisabled', 'Apply Disabled')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="rec-btn-apply"
                                onClick={() => {
                                  setOpen(false);
                                  navigate('/farmer/apply', {
                                    state: {
                                      schemeId: msg.scheme.id,
                                      amount:
                                        parseNumber(answers.amount) || msg.scheme.defaultAmount,
                                      tenure:
                                        parseNumber(answers.repayment) || msg.scheme.defaultTenure,
                                      loanProductId: msg.scheme._id || undefined,
                                    },
                                  });
                                }}
                              >
                                {t('chatbot.applyNow', 'Apply Now →')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Follow-up question chips */}
                      {msg.showFollowUps && (
                        <div className="followup-chips">
                          {FOLLOW_UPS_BY_LANG[currentLang].map((fs) => (
                            <button
                              key={fs}
                              type="button"
                              className="followup-chip"
                              onClick={() => handleSuggestedClick(fs)}
                            >
                              {fs}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Speaker button on EVERY assistant response */}
                      {msg.sender === 'bot' && (
                        <div className="chat-msg-footer">
                          <button
                            type="button"
                            className={`msg-speaker-btn ${currentlySpeakingIndex === idx ? 'speaking' : ''}`}
                            onClick={() => speakMessage(msg, idx)}
                            title={currentlySpeakingIndex === idx ? 'Stop audio' : 'Listen aloud'}
                            aria-label="Listen to answer"
                          >
                            {currentlySpeakingIndex === idx ? (
                              <>
                                <VolumeX size={15} />
                                <span>{currentLang === 'ta' ? 'நிறுத்து' : 'Stop'}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={15} />
                                <span>{currentLang === 'ta' ? 'கேளுங்கள்' : 'Listen'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Speaker action button DIRECTLY BESIDE assistant response bubble */}
                    {msg.sender === 'bot' && (
                      <button
                        type="button"
                        className={`msg-speaker-beside-btn ${currentlySpeakingIndex === idx ? 'speaking' : ''}`}
                        onClick={() => speakMessage(msg, idx)}
                        title={
                          currentlySpeakingIndex === idx
                            ? currentLang === 'ta' ? 'ஆடியோவை நிறுத்து' : 'Stop audio'
                            : currentLang === 'ta' ? 'பதிலை உரக்கக் கேட்கவும்' : 'Listen aloud'
                        }
                        aria-label={currentlySpeakingIndex === idx ? 'Stop audio' : 'Listen aloud'}
                      >
                        {currentlySpeakingIndex === idx ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                    )}

                    {/* Edit button on user answers */}
                    {msg.sender === 'user' && inQuestionnaire && (
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(idx)}
                        title={t('chatbot.editAnswer', 'Edit this answer')}
                        aria-label={t('chatbot.editAnswer', 'Edit this answer')}
                      >
                        ✎
                      </button>
                    )}
                  </div>
                ))}

                {/* Typing/Loading Indicator */}
                {loading && (
                  <div className="chat-message bot typing-indicator">
                    <div className="dot-pulse" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Listening Live Status Bar */}
          {isListening && (
            <div className="chatbot-listening-bar">
              <div className="chatbot-wave-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <span>
                {currentLang === 'ta'
                  ? 'பேசுங்கள்... கேட்கிறது (மைக் இயங்குகிறது)'
                  : 'Listening to your voice... speak now'}
              </span>
            </div>
          )}

          {/* Footer Input Area with Microphone */}
          <div className="chatbot-footer">
            {/* Microphone Button */}
            <button
              type="button"
              className={`chatbot-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={loading}
              title={
                !isSpeechSupported
                  ? currentLang === 'ta'
                    ? 'குரல் உள்ளீடு ஆதரிக்கப்படவில்லை (விவரங்களுக்கு கிளிக் செய்யவும்)'
                    : 'Voice input not supported (Click for info)'
                  : isListening
                  ? currentLang === 'ta'
                    ? 'கேட்பதை நிறுத்து'
                    : 'Stop listening'
                  : currentLang === 'ta'
                  ? 'பேசி கேட்கவும் (மைக்)'
                  : 'Click to speak (Microphone)'
              }
              aria-label="Microphone input"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              {isListening && <span className="mic-pulse-ring" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={
                isListening
                  ? currentLang === 'ta'
                    ? 'உங்கள் குரல் கேட்கிறது... பேசுங்கள்...'
                    : 'Listening to your voice... speak now...'
                  : inQuestionnaire
                  ? t('chatbot.inputPlaceholderQuestionnaire', "Type your answer or 'skip'…")
                  : currentLang === 'ta'
                  ? 'கேள்வியைத் தட்டச்சு செய்யவும் அல்லது மைக் அழுத்தவும்…'
                  : 'Ask a question or click mic to speak…'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              aria-label={t('chatbot.sendAria', 'Send message')}
            />

            {/* Send Button */}
            <button
              type="button"
              className="chatbot-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label={t('chatbot.sendAria', 'Send message')}
              title={currentLang === 'ta' ? 'அனுப்பவும்' : 'Send'}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;

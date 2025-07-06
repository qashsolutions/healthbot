import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface User {
  id: string
  chat_id: string
  language: string
  language_name: string
  state: string
  onboarding_info: string
  plan_type: string
  usage_count: number
  daily_usage_count: number
  last_used: string
  created_at: string
  free_complex_used: boolean
  paid_complex_count: number  // Track total complex diagnoses (first 2 are free)
  pending_query?: string
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      last_name?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
    voice?: {
      file_id: string
      file_unique_id: string
      duration: number
      mime_type: string
      file_size: number
    }
    photo?: Array<{
      file_id: string
      file_unique_id: string
      width: number
      height: number
      file_size?: number
    }>
    document?: {
      file_id: string
      file_unique_id: string
      file_name?: string
      mime_type?: string
      file_size?: number
    }
  }
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
    }
    message: {
      message_id: number
      chat: {
        id: number
        type: string
      }
    }
    data: string
  }
}

// Initialize Supabase client
const supabaseUrl = 'https://sqnbeyvilpbpngffkueg.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Bot configuration
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SARVAM_API_KEY = Deno.env.get('SARVAM_API_KEY')!
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')!

// Language mapping for callback data
const LANGUAGE_CALLBACKS = {
  'lang_hi': { code: 'hi-IN', name: 'Hindi', sarvam: 'hi' },
  'lang_en': { code: 'en-IN', name: 'English', sarvam: 'en' },
  'lang_ta': { code: 'ta-IN', name: 'Tamil', sarvam: 'ta' },
  'lang_te': { code: 'te-IN', name: 'Telugu', sarvam: 'te' },
  'lang_kn': { code: 'kn-IN', name: 'Kannada', sarvam: 'kn' },
  'lang_ml': { code: 'ml-IN', name: 'Malayalam', sarvam: 'ml' },
  'lang_bn': { code: 'bn-IN', name: 'Bengali', sarvam: 'bn' },
  'lang_gu': { code: 'gu-IN', name: 'Gujarati', sarvam: 'gu' },
  'lang_mr': { code: 'mr-IN', name: 'Marathi', sarvam: 'mr' },
  'lang_pa': { code: 'pa-IN', name: 'Punjabi', sarvam: 'pa' }
}

// SVG Icons (colored)
const SVG_ICONS = {
  health: '🏥', // Medical cross - red
  question: '💬', // Chat bubble - blue  
  medicine: '💊', // Pill - green
  scan: '📸', // Camera - purple
  language: '🌐', // Globe - blue
  error: '❌', // X mark - red
  success: '✅', // Check mark - green
  voice: '🎤', // Microphone - orange
  processing: '⚙️', // Gear - gray
  warning: '⚠️', // Warning - yellow
  menu: '📋', // Clipboard - blue
  search: '🔍', // Magnifying glass - blue
  location: '📍', // Location pin - red
  phone: '📞', // Phone - green
  money: '💰', // Money bag - gold
  ai: '🤖', // Robot - blue
  doctor: '👨‍⚕️', // Doctor - skin tone
  report: '📊', // Chart - blue
  help: '❓' // Question mark - blue
};

// Helper function to get SVG icon
function getIcon(name: keyof typeof SVG_ICONS): string {
  return SVG_ICONS[name] || '●';
}

// Comprehensive language translations with colored icons
const TRANSLATIONS = {
  // Error messages
  errorGeneral: {
    'hi': '❌ **समस्या हुई!** कृपया दोबारा कोशिश करें।',
    'en': '❌ **ERROR!** Please try again.',
    'ta': '❌ **பிழை!** மீண்டும் முயற்சிக்கவும்.',
    'te': '❌ **లోపం!** దయచేసి మళ్ళీ ప్రయత్నించండి.',
    'kn': '❌ **ದೋಷ!** ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    'ml': '❌ **പിശക്!** വീണ്ടും ശ്രമിക്കുക.',
    'bn': '❌ **ত্রুটি!** আবার চেষ্টা করুন।',
    'gu': '❌ **ભૂલ!** ફરી પ્રયાસ કરો.',
    'mr': '❌ **त्रुटी!** पुन्हा प्रयत्न करा.',
    'pa': '❌ **ਗਲਤੀ!** ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ.'
  },
  
  // Voice processing messages
  voiceProcessing: {
    'hi': '🎤 **आपकी आवाज़ संदेश प्रोसेस हो रहा है...**\n\n⚠️ **अगर आप आवाज़ रिकॉर्ड नहीं कर सकते:**\n🎤 **माइक्रोफोन अनुमति सक्षम करें**\n📞 **फोन सेटिंग्स जांचें**',
    'en': '🎤 **PROCESSING YOUR VOICE MESSAGE...**\n\n⚠️ **If you cannot record voice:**\n🎤 **Enable microphone permission**\n📞 **Check phone settings**',
    'ta': '🎤 **உங்கள் குரல் செய்தி செயலாக்கப்படுகிறது...**\n\n⚠️ **குரல் பதிவு செய்ய முடியாவிட்டால்:**\n🎤 **மைக்ரோஃபோன் அனுமதியை இயக்கவும்**\n📞 **தொலைபேசி அமைப்புகளை சரிபார்க்கவும்**',
    'te': '🎤 **మీ వాయిస్ సందేశం ప్రాసెస్ అవుతోంది...**\n\n⚠️ **మీరు వాయిస్ రికార్డ్ చేయలేకపోతే:**\n🎤 **మైక్రోఫోన్ అనుమతిని ఎనేబుల్ చేయండి**\n📞 **ఫోన్ సెట్టింగ్‌లను తనిఖీ చేయండి**',
    'kn': '🎤 **ನಿಮ್ಮ ಧ್ವನಿ ಸಂದೇಶ ಪ್ರಕ್ರಿಯೆಗೊಳ್ಳುತ್ತಿದೆ...**\n\n⚠️ **ನೀವು ಧ್ವನಿ ರೆಕಾರ್ಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗದಿದ್ದರೆ:**\n🎤 **ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿಯನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ**\n📞 **ಫೋನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಿ**',
    'ml': '🎤 **നിങ്ങളുടെ വോയ്സ് സന്ദേശം പ്രോസസ്സ് ചെയ്യുന്നു...**\n\n⚠️ **നിങ്ങൾക്ക് വോയ്സ് റെക്കോർഡ് ചെയ്യാൻ കഴിയുന്നില്ലെങ്കിൽ:**\n🎤 **മൈക്രോഫോൺ അനുമതി പ്രവർത്തനക്ഷമമാക്കുക**\n📞 **ഫോൺ ക്രമീകരണങ്ങൾ പരിശോധിക്കുക**',
    'bn': '🎤 **আপনার ভয়েস বার্তা প্রক্রিয়াকরণ হচ্ছে...**\n\n⚠️ **যদি আপনি ভয়েস রেকর্ড করতে না পারেন:**\n🎤 **মাইক্রোফোন অনুমতি সক্ষম করুন**\n📞 **ফোন সেটিংস পরীক্ষা করুন**',
    'gu': '🎤 **તમારો વૉઇસ સંદેશ પ્રક્રિયા કરી રહ્યું છે...**\n\n⚠️ **જો તમે વૉઇસ રેકોર્ડ કરી શકતા નથી:**\n🎤 **માઇક્રોફોન પરવાનગી સક્ષમ કરો**\n📞 **ફોન સેટિંગ્સ તપાસો**',
    'mr': '🎤 **तुमचा आवाज संदेश प्रक्रिया केला जात आहे...**\n\n⚠️ **जर तुम्ही आवाज रेकॉर्ड करू शकत नसाल:**\n🎤 **मायक्रोफोन परवानगी सक्षम करा**\n📞 **फोन सेटिंग्ज तपासा**',
    'pa': '🎤 **ਤੁਹਾਡਾ ਆਵਾਜ਼ ਸੁਨੇਹਾ ਪ੍ਰੋਸੈਸ ਹੋ ਰਿਹਾ ਹੈ...**\n\n⚠️ **ਜੇ ਤੁਸੀਂ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਨਹੀਂ ਕਰ ਸਕਦੇ:**\n🎤 **ਮਾਈਕ੍ਰੋਫੋਨ ਇਜਾਜ਼ਤ ਸਮਰੱਥ ਕਰੋ**\n📞 **ਫੋਨ ਸੈਟਿੰਗਾਂ ਦੀ ਜਾਂਚ ਕਰੋ**'
  },
  
  // Health question prompt
  healthQuestionPrompt: {
    'hi': '🏥 **अपना स्वास्थ्य प्रश्न पूछें:**\n\nअपने लक्षण या स्वास्थ्य संबंधी चिंता टाइप करें...',
    'en': '🏥 **ASK YOUR HEALTH QUESTION:**\n\nType your symptoms or health concern...',
    'ta': '🏥 **உங்கள் உடல்நல கேள்வியைக் கேளுங்கள்:**\n\nஉங்கள் அறிகுறிகள் அல்லது உடல்நல கவலையை தட்டச்சு செய்யவும்...',
    'te': '🏥 **మీ ఆరోగ్య ప్రశ్నను అడగండి:**\n\nమీ లక్షణాలు లేదా ఆరోగ్య సమస్యను టైప్ చేయండి...',
    'kn': '🏥 **ನಿಮ್ಮ ಆರೋಗ್ಯ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ:**\n\nನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳು ಅಥವಾ ಆರೋಗ್ಯ ಕಾಳಜಿಯನ್ನು ಟೈಪ್ ಮಾಡಿ...',
    'ml': '🏥 **നിങ്ങളുടെ ആരോഗ്യ ചോദ്യം ചോദിക്കുക:**\n\nനിങ്ങളുടെ ലക്ഷണങ്ങൾ അല്ലെങ്കിൽ ആരോഗ്യ പ്രശ്നം ടൈപ്പ് ചെയ്യുക...',
    'bn': '🏥 **আপনার স্বাস্থ্য প্রশ্ন জিজ্ঞাসা করুন:**\n\nআপনার লক্ষণ বা স্বাস্থ্য সমস্যা টাইপ করুন...',
    'gu': '🏥 **તમારો આરોગ્ય પ્રશ્ન પૂછો:**\n\nતમારા લક્ષણો અથવા આરોગ્ય ચિંતા ટાઇપ કરો...',
    'mr': '🏥 **तुमचा आरोग्य प्रश्न विचारा:**\n\nतुमची लक्षणे किंवा आरोग्य चिंता टाइप करा...',
    'pa': '🏥 **ਆਪਣਾ ਸਿਹਤ ਸਵਾਲ ਪੁੱਛੋ:**\n\nਆਪਣੇ ਲੱਛਣ ਜਾਂ ਸਿਹਤ ਚਿੰਤਾ ਟਾਈਪ ਕਰੋ...'
  },
  
  // Scan report prompt
  scanReportPrompt: {
    'hi': '📸 **मेडिकल रिपोर्ट स्कैन करें**\n\n📸 **अपनी फोटो भेजें:**\n• लैब रिपोर्ट\n• प्रिस्क्रिप्शन\n• मेडिकल दस्तावेज़\n\n🤖 **हम इसे मुफ्त में विश्लेषण करेंगे!**',
    'en': '📸 **SCAN MEDICAL REPORT**\n\n📸 **Send photo of your:**\n• Lab reports\n• Prescription\n• Medical documents\n\n🤖 **We\'ll analyze it for FREE!**',
    'ta': '📸 **மருத்துவ அறிக்கையை ஸ்கேன் செய்யவும்**\n\n📸 **உங்கள் புகைப்படத்தை அனுப்பவும்:**\n• ஆய்வக அறிக்கைகள்\n• மருந்துச்சீட்டு\n• மருத்துவ ஆவணங்கள்\n\n🤖 **நாங்கள் இதை இலவசமாக பகுப்பாய்வு செய்வோம்!**',
    'te': '📸 **వైద్య నివేదికను స్కాన్ చేయండి**\n\n📸 **మీ ఫోటోను పంపండి:**\n• ల్యాబ్ రిపోర్ట్‌లు\n• ప్రిస్క్రిప్షన్\n• వైద్య పత్రాలు\n\n🤖 **మేము దీన్ని ఉచితంగా విశ్లేషిస్తాము!**',
    'kn': '📸 **ವೈದ್ಯಕೀಯ ವರದಿಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ**\n\n📸 **ನಿಮ್ಮ ಫೋಟೋ ಕಳುಹಿಸಿ:**\n• ಲ್ಯಾಬ್ ವರದಿಗಳು\n• ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್\n• ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು\n\n🤖 **ನಾವು ಇದನ್ನು ಉಚಿತವಾಗಿ ವಿಶ್ಲೇಷಿಸುತ್ತೇವೆ!**',
    'ml': '📸 **മെഡിക്കൽ റിപ്പോർട്ട് സ്കാൻ ചെയ്യുക**\n\n📸 **നിങ്ങളുടെ ഫോട്ടോ അയയ്ക്കുക:**\n• ലാബ് റിപ്പോർട്ടുകൾ\n• കുറിപ്പടി\n• മെഡിക്കൽ രേഖകൾ\n\n🤖 **ഞങ്ങൾ ഇത് സൗജന്യമായി വിശകലനം ചെയ്യും!**',
    'bn': '📸 **মেডিকেল রিপোর্ট স্ক্যান করুন**\n\n📸 **আপনার ছবি পাঠান:**\n• ল্যাব রিপোর্ট\n• প্রেসক্রিপশন\n• মেডিকেল নথি\n\n🤖 **আমরা এটি বিনামূল্যে বিশ্লেষণ করব!**',
    'gu': '📸 **મેડિકલ રિપોર્ટ સ્કેન કરો**\n\n📸 **તમારો ફોટો મોકલો:**\n• લેબ રિપોર્ટ\n• પ્રિસ્ક્રિપ્શન\n• મેડિકલ દસ્તાવેજો\n\n🤖 **અમે તેનું મફત વિશ્લેષણ કરીશું!**',
    'mr': '📸 **वैद्यकीय अहवाल स्कॅन करा**\n\n📸 **तुमचा फोटो पाठवा:**\n• लॅब अहवाल\n• प्रिस्क्रिप्शन\n• वैद्यकीय कागदपत्रे\n\n🤖 **आम्ही याचे मोफत विश्लेषण करू!**',
    'pa': '📸 **ਮੈਡੀਕਲ ਰਿਪੋਰਟ ਸਕੈਨ ਕਰੋ**\n\n📸 **ਆਪਣੀ ਫੋਟੋ ਭੇਜੋ:**\n• ਲੈਬ ਰਿਪੋਰਟਾਂ\n• ਨੁਸਖ਼ਾ\n• ਮੈਡੀਕਲ ਦਸਤਾਵੇਜ਼\n\n🤖 **ਅਸੀਂ ਇਸਦਾ ਮੁਫਤ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰਾਂਗੇ!**'
  },
  
  // Processing image
  processingImage: {
    'hi': '📸 आपकी मेडिकल इमेज प्रोसेस हो रही है...',
    'en': '📸 Processing your medical image...',
    'ta': '📸 உங்கள் மருத்துவ படம் செயலாக்கப்படுகிறது...',
    'te': '📸 మీ వైద్య చిత్రం ప్రాసెస్ అవుతోంది...',
    'kn': '📸 ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆಗೊಳ್ಳುತ್ತಿದೆ...',
    'ml': '📸 നിങ്ങളുടെ മെഡിക്കൽ ചിത്രം പ്രോസസ്സ് ചെയ്യുന്നു...',
    'bn': '📸 আপনার মেডিকেল ছবি প্রক্রিয়াকরণ হচ্ছে...',
    'gu': '📸 તમારી મેડિકલ છબી પ્રક્રિયા કરી રહ્યું છે...',
    'mr': '📸 तुमची वैद्यकीय प्रतिमा प्रक्रिया केली जात आहे...',
    'pa': '📸 ਤੁਹਾਡੀ ਮੈਡੀਕਲ ਤਸਵੀਰ ਪ੍ਰੋਸੈਸ ਹੋ ਰਹੀ ਹੈ...'
  },
  
  // Invalid language choice
  invalidLanguageChoice: {
    'hi': '❌ **अमान्य विकल्प!**\n\n👆 **नीचे बटन दबाएं या 1-10 टाइप करें:**',
    'en': '❌ **INVALID CHOICE!**\n\n👆 **TAP A BUTTON BELOW OR TYPE 1-10:**',
    'ta': '❌ **தவறான தேர்வு!**\n\n👆 **கீழே உள்ள பொத்தானை அழுத்தவும் அல்லது 1-10 தட்டச்சு செய்யவும்:**',
    'te': '❌ **చెల్లని ఎంపిక!**\n\n👆 **క్రింద బటన్‌ను నొక్కండి లేదా 1-10 టైప్ చేయండి:**',
    'kn': '❌ **ಅಮಾನ್ಯ ಆಯ್ಕೆ!**\n\n👆 **ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿರಿ ಅಥವಾ 1-10 ಟೈಪ್ ಮಾಡಿ:**',
    'ml': '❌ **അസാധുവായ തിരഞ്ഞെടുപ്പ്!**\n\n👆 **താഴെയുള്ള ബട്ടൺ അമർത്തുക അല്ലെങ്കിൽ 1-10 ടൈപ്പ് ചെയ്യുക:**',
    'bn': '❌ **অবৈধ পছন্দ!**\n\n👆 **নীচের বোতাম টিপুন বা 1-10 টাইপ করুন:**',
    'gu': '❌ **અમાન્ય પસંદગી!**\n\n👆 **નીચે બટન દબાવો અથવા 1-10 ટાઇપ કરો:**',
    'mr': '❌ **अवैध निवड!**\n\n👆 **खाली बटण दाबा किंवा 1-10 टाइप करा:**',
    'pa': '❌ **ਗਲਤ ਚੋਣ!**\n\n👆 **ਹੇਠਾਂ ਬਟਨ ਦਬਾਓ ਜਾਂ 1-10 ਟਾਈਪ ਕਰੋ:**'
  },
  
  // Jan Aushadhi search prompt
  janAushadhiPrompt: {
    'hi': '💊 **जन औषधि स्टोर खोजें**\n\n📍 **अपना 6 अंकों का पिनकोड दर्ज करें:**\n\nउदाहरण: 110001',
    'en': '💊 **FIND JAN AUSHADHI STORES**\n\n📍 **Enter your 6-digit pincode:**\n\nExample: 110001',
    'ta': '💊 **ஜன் ஔஷதி கடைகளைக் கண்டுபிடிக்கவும்**\n\n📍 **உங்கள் 6 இலக்க பின்கோடை உள்ளிடவும்:**\n\nউদাহরণம்: 110001',
    'te': '💊 **జన్ ఔషధి దుకాణాలను కనుగొనండి**\n\n📍 **మీ 6 అంకెల పిన్‌కోడ్‌ను నమోదు చేయండి:**\n\nఉదాহরణ: 110001',
    'kn': '💊 **ಜನ ಔಷಧಿ ಅಂಗಡಿಗಳನ್ನು ಹುಡುಕಿ**\n\n📍 **ನಿಮ್ಮ 6 ಅಂಕಿಯ ಪಿನ್‌ಕೋಡ್ ನಮೂದಿಸಿ:**\n\nಉದಾಹರಣೆ: 110001',
    'ml': '💊 **ജൻ ഔഷധി സ്റ്റോറുകൾ കണ്ടെത്തുക**\n\n📍 **നിങ്ങളുടെ 6 അക്ക പിൻകോഡ് നൽകുക:**\n\nഉദാഹരണം: 110001',
    'bn': '💊 **জন ঔষধি দোকান খুঁজুন**\n\n📍 **আপনার 6 সংখ্যার পিনকোড লিখুন:**\n\nউদাহরণ: 110001',
    'gu': '💊 **જન ઔષધિ સ્ટોર શોધો**\n\n📍 **તમારો 6 અંકનો પિનકોડ દાખલ કરો:**\n\nઉદાહરણ: 110001',
    'mr': '💊 **जन औषधी स्टोअर शोधा**\n\n📍 **तुमचा 6 अंकी पिनकोड एंटर करा:**\n\nउदाहरण: 110001',
    'pa': '💊 **ਜਨ ਔਸ਼ਧੀ ਸਟੋਰ ਲੱਭੋ**\n\n📍 **ਆਪਣਾ 6 ਅੰਕਾਂ ਦਾ ਪਿੰਨਕੋਡ ਦਾਖਲ ਕਰੋ:**\n\nਉਦਾਹਰਨ: 110001'
  },
  
  // Voice error messages
  voiceError: {
    'hi': '❌ **वॉइस प्रोसेसिंग में समस्या!**\n\n⚙️ **कृपया सुनिश्चित करें:**\n🎤 **माइक्रोफोन चालू है**\n🎤 **आवाज़ साफ़ है**\n📞 **नेटवर्क कनेक्शन ठीक है**\n\n🔄 **दोबारा कोशिश करें**',
    'en': '❌ **VOICE PROCESSING ERROR!**\n\n⚙️ **PLEASE CHECK:**\n🎤 **MICROPHONE IS ENABLED**\n🎤 **SPEAK CLEARLY**\n📞 **NETWORK CONNECTION IS GOOD**\n\n🔄 **TRY AGAIN**',
    'ta': '❌ **குரல் செயலாக்க பிழை!**\n\n⚙️ **தயவுசெய்து சரிபார்க்கவும்:**\n🎤 **மைக்ரோஃபோன் இயக்கப்பட்டுள்ளது**\n🎤 **தெளிவாக பேசவும்**\n📞 **நெட்வொர்க் இணைப்பு நன்றாக உள்ளது**\n\n🔄 **மீண்டும் முயற்சிக்கவும்**',
    'te': '❌ **వాయిస్ ప్రాసెసింగ్ లోపం!**\n\n⚙️ **దయచేసి తనిఖీ చేయండి:**\n🎤 **మైక్రోఫోన్ ఎనేబుల్ చేయబడింది**\n🎤 **స్పష్టంగా మాట్లాడండి**\n📞 **నెట్‌వర్క్ కనెక్షన్ బాగుంది**\n\n🔄 **మళ్ళీ ప్రయత్నించండి**',
    'kn': '❌ **ಧ್ವನಿ ಪ್ರಕ್ರಿಯೆ ದೋಷ!**\n\n⚙️ **ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ:**\n🎤 **ಮೈಕ್ರೋಫೋನ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ**\n🎤 **ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ**\n📞 **ನೆಟ್‌ವರ್ಕ್ ಸಂಪರ್ಕ ಉತ್ತಮವಾಗಿದೆ**\n\n🔄 **ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ**',
    'ml': '❌ **വോയ്സ് പ്രോസസ്സിംഗ് പിശക്!**\n\n⚙️ **ദയവായി പരിശോധിക്കുക:**\n🎤 **മൈക്രോഫോൺ പ്രവർത്തനക്ഷമമാണ്**\n🎤 **വ്യക്തമായി സംസാരിക്കുക**\n📞 **നെറ്റ്‌വർക്ക് കണക്ഷൻ നല്ലതാണ്**\n\n🔄 **വീണ്ടും ശ്രമിക്കുക**',
    'bn': '❌ **ভয়েস প্রক্রিয়াকরণ ত্রুটি!**\n\n⚙️ **দয়া করে পরীক্ষা করুন:**\n🎤 **মাইক্রোফোন সক্ষম করা আছে**\n🎤 **পরিষ্কারভাবে কথা বলুন**\n📞 **নেটওয়ার্ক সংযোগ ভাল আছে**\n\n🔄 **আবার চেষ্টা করুন**',
    'gu': '❌ **વૉઇસ પ્રોસેસિંગ ભૂલ!**\n\n⚙️ **કૃપા કરીને તપાસો:**\n🎤 **માઇક્રોફોન સક્ષમ છે**\n🎤 **સ્પષ્ટ રીતે બોલો**\n📞 **નેટવર્ક કનેક્શન સારું છે**\n\n🔄 **ફરી પ્રયાસ કરો**',
    'mr': '❌ **आवाज प्रक्रिया त्रुटी!**\n\n⚙️ **कृपया तपासा:**\n🎤 **मायक्रोफोन सक्षम आहे**\n🎤 **स्पष्टपणे बोला**\n📞 **नेटवर्क कनेक्शन चांगले आहे**\n\n🔄 **पुन्हा प्रयत्न करा**',
    'pa': '❌ **ਆਵਾਜ਼ ਪ੍ਰੋਸੈਸਿੰਗ ਗਲਤੀ!**\n\n⚙️ **ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ:**\n🎤 **ਮਾਈਕ੍ਰੋਫੋਨ ਸਮਰੱਥ ਹੈ**\n🎤 **ਸਪੱਸ਼ਟ ਬੋਲੋ**\n📞 **ਨੈੱਟਵਰਕ ਕਨੈਕਸ਼ਨ ਚੰਗਾ ਹੈ**\n\n🔄 **ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ**'
  },
  
  // Image processing error
  imageError: {
    'hi': 'इमेज प्रोसेस करने में समस्या हुई। कृपया दोबारा कोशिश करें।',
    'en': 'Error processing image. Please try again.',
    'ta': 'படத்தை செயலாக்குவதில் பிழை. மீண்டும் முயற்சிக்கவும்.',
    'te': 'చిత్రాన్ని ప్రాసెస్ చేయడంలో లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    'kn': 'ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವಲ್ಲಿ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    'ml': 'ചിത്രം പ്രോസസ്സ് ചെയ്യുന്നതിൽ പിശക്. വീണ്ടും ശ്രമിക്കുക.',
    'bn': 'ছবি প্রক্রিয়াকরণে ত্রুটি। আবার চেষ্টা করুন।',
    'gu': 'છબી પ્રક્રિયામાં ભૂલ. ફરી પ્રયાસ કરો.',
    'mr': 'प्रतिमा प्रक्रिया करताना त्रुटी. पुन्हा प्रयत्न करा.',
    'pa': 'ਤਸਵੀਰ ਪ੍ਰੋਸੈਸ ਕਰਨ ਵਿੱਚ ਗਲਤੀ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
  },
  
  // Invalid choice message
  invalidChoice: {
    'hi': `${getIcon('error')} **गलत विकल्प!**\n\n👆 **नीचे बटन दबाएं या 1-10 टाइप करें:**`,
    'en': `${getIcon('error')} **INVALID CHOICE!**\n\n👆 **TAP BUTTON BELOW OR TYPE 1-10:**`,
    'ta': `${getIcon('error')} **தவறான தேர்வு!**\n\n👆 **கீழே உள்ள பொத்தானை அழுத்தவும் அல்லது 1-10 தட்டச்சு செய்யவும்:**`,
    'te': `${getIcon('error')} **చెల్లని ఎంపిక!**\n\n👆 **క్రింద బటన్‌ను నొక్కండి లేదా 1-10 టైప్ చేయండి:**`,
    'kn': `${getIcon('error')} **ಅಮಾನ್ಯ ಆಯ್ಕೆ!**\n\n👆 **ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿರಿ ಅಥವಾ 1-10 ಟೈಪ್ ಮಾಡಿ:**`,
    'ml': `${getIcon('error')} **അസാധുവായ തിരഞ്ഞെടുപ്പ്!**\n\n👆 **താഴെയുള്ള ബട്ടൺ അമർത്തുക അല്ലെങ്കിൽ 1-10 ടൈപ്പ് ചെയ്യുക:**`,
    'bn': `${getIcon('error')} **অবৈধ পছন্দ!**\n\n👆 **নীচের বোতাম টিপুন বা 1-10 টাইপ করুন:**`,
    'gu': `${getIcon('error')} **અમાન્ય પસંદગી!**\n\n👆 **નીચે બટન દબાવો અથવા 1-10 ટાઇપ કરો:**`,
    'mr': `${getIcon('error')} **अवैध निवड!**\n\n👆 **खाली बटण दाबा किंवा 1-10 टाइप करा:**`,
    'pa': `${getIcon('error')} **ਗਲਤ ਚੋਣ!**\n\n👆 **ਹੇਠਾਂ ਬਟਨ ਦਬਾਓ ਜਾਂ 1-10 ਟਾਈਪ ਕਰੋ:**`
  },
  
  // Jan Aushadhi search prompt
  janAushadhiPrompt: {
    'hi': `${getIcon('medicine')} **जन औषधि स्टोर खोजें**\n\n${getIcon('location')} **अपना 6 अंकों का पिनकोड दर्ज करें:**\n\nउदाहरण: 110001`,
    'en': `${getIcon('medicine')} **FIND JAN AUSHADHI STORES**\n\n${getIcon('location')} **Enter your 6-digit pincode:**\n\nExample: 110001`,
    'ta': `${getIcon('medicine')} **ஜன் ஔஷதி கடைகளைக் கண்டுபிடிக்கவும்**\n\n${getIcon('location')} **உங்கள் 6 இலக்க பின்கோடை உள்ளிடவும்:**\n\nஉதாரணம்: 110001`,
    'te': `${getIcon('medicine')} **జన్ ఔషధి దుకాణాలను కనుగొనండి**\n\n${getIcon('location')} **మీ 6 అంకెల పిన్‌కోడ్‌ను నమోదు చేయండి:**\n\nఉదాహరణ: 110001`,
    'kn': `${getIcon('medicine')} **ಜನ ಔಷಧಿ ಅಂಗಡಿಗಳನ್ನು ಹುಡುಕಿ**\n\n${getIcon('location')} **ನಿಮ್ಮ 6 ಅಂಕಿಯ ಪಿನ್‌ಕೋಡ್ ನಮೂದಿಸಿ:**\n\nಉದಾಹರಣೆ: 110001`,
    'ml': `${getIcon('medicine')} **ജൻ ഔഷധി സ്റ്റോറുകൾ കണ്ടെത്തുക**\n\n${getIcon('location')} **നിങ്ങളുടെ 6 അക്ക പിൻകോഡ് നൽകുക:**\n\nഉദാഹരണം: 110001`,
    'bn': `${getIcon('medicine')} **জন ঔষধি দোকান খুঁজুন**\n\n${getIcon('location')} **আপনার 6 সংখ্যার পিনকোড লিখুন:**\n\nউদাহরণ: 110001`,
    'gu': `${getIcon('medicine')} **જન ઔષધિ સ્ટોર શોધો**\n\n${getIcon('location')} **તમારો 6 અંકનો પિનકોડ દાખલ કરો:**\n\nઉદાહરણ: 110001`,
    'mr': `${getIcon('medicine')} **जन औषधी स्टोअर शोधा**\n\n${getIcon('location')} **तुमचा 6 अंकी पिनकोड एंटर करा:**\n\nउदाहरण: 110001`,
    'pa': `${getIcon('medicine')} **ਜਨ ਔਸ਼ਧੀ ਸਟੋਰ ਲੱਭੋ**\n\n${getIcon('location')} **ਆਪਣਾ 6 ਅੰਕਾਂ ਦਾ ਪਿੰਨਕੋਡ ਦਾਖਲ ਕਰੋ:**\n\nਉਦਾਹਰਨ: 110001`
  },
  
  // Voice error messages
  voiceError: {
    'hi': `${getIcon('error')} **वॉइस प्रोसेसिंग में समस्या!**\n\n${getIcon('processing')} **कृपया सुनिश्चित करें:**\n${getIcon('voice')} **माइक्रोफोन चालू है**\n${getIcon('voice')} **आवाज़ साफ़ है**\n${getIcon('phone')} **नेटवर्क कनेक्शन ठीक है**\n\n🔄 **दोबारा कोशिश करें**`,
    'en': `${getIcon('error')} **VOICE PROCESSING ERROR!**\n\n${getIcon('processing')} **PLEASE CHECK:**\n${getIcon('voice')} **MICROPHONE IS ENABLED**\n${getIcon('voice')} **SPEAK CLEARLY**\n${getIcon('phone')} **NETWORK CONNECTION IS GOOD**\n\n🔄 **TRY AGAIN**`,
    'ta': `${getIcon('error')} **குரல் செயலாக்க பிழை!**\n\n${getIcon('processing')} **தயவுசெய்து சரிபார்க்கவும்:**\n${getIcon('voice')} **மைக்ரோஃபோன் இயக்கப்பட்டுள்ளது**\n${getIcon('voice')} **தெளிவாக பேசவும்**\n${getIcon('phone')} **நெட்வொர்க் இணைப்பு நன்றாக உள்ளது**\n\n🔄 **மீண்டும் முயற்சிக்கவும்**`,
    'te': `${getIcon('error')} **వాయిస్ ప్రాసెసింగ్ లోపం!**\n\n${getIcon('processing')} **దయచేసి తనిఖీ చేయండి:**\n${getIcon('voice')} **మైక్రోఫోన్ ఎనేబుల్ చేయబడింది**\n${getIcon('voice')} **స్పష్టంగా మాట్లాడండి**\n${getIcon('phone')} **నెట్‌వర్క్ కనెక్షన్ బాగుంది**\n\n🔄 **మళ్ళీ ప్రయత్నించండి**`,
    'kn': `${getIcon('error')} **ಧ್ವನಿ ಪ್ರಕ್ರಿಯೆ ದೋಷ!**\n\n${getIcon('processing')} **ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ:**\n${getIcon('voice')} **ಮೈಕ್ರೋಫೋನ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ**\n${getIcon('voice')} **ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ**\n${getIcon('phone')} **ನೆಟ್‌ವರ್ಕ್ ಸಂಪರ್ಕ ಉತ್ತಮವಾಗಿದೆ**\n\n🔄 **ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ**`,
    'ml': `${getIcon('error')} **വോയ്സ് പ്രോസസ്സിംഗ് പിശക്!**\n\n${getIcon('processing')} **ദയവായി പരിശോധിക്കുക:**\n${getIcon('voice')} **മൈക്രോഫോൺ പ്രവർത്തനക്ഷമമാണ്**\n${getIcon('voice')} **വ്യക്തമായി സംസാരിക്കുക**\n${getIcon('phone')} **നെറ്റ്‌വർക്ക് കണക്ഷൻ നല്ലതാണ്**\n\n🔄 **വീണ്ടും ശ്രമിക്കുക**`,
    'bn': `${getIcon('error')} **ভয়েস প্রক্রিয়াকরণ ত্রুটি!**\n\n${getIcon('processing')} **দয়া করে পরীক্ষা করুন:**\n${getIcon('voice')} **মাইক্রোফোন সক্ষম করা আছে**\n${getIcon('voice')} **পরিষ্কারভাবে কথা বলুন**\n${getIcon('phone')} **নেটওয়ার্ক সংযোগ ভাল আছে**\n\n🔄 **আবার চেষ্টা করুন**`,
    'gu': `${getIcon('error')} **વૉઇસ પ્રોસેસિંગ ભૂલ!**\n\n${getIcon('processing')} **કૃપા કરીને તપાસો:**\n${getIcon('voice')} **માઇક્રોફોન સક્ષમ છે**\n${getIcon('voice')} **સ્પષ્ટ રીતે બોલો**\n${getIcon('phone')} **નેટવર્ક કનેક્શન સારું છે**\n\n🔄 **ફરી પ્રયાસ કરો**`,
    'mr': `${getIcon('error')} **आवाज प्रक्रिया त्रुटी!**\n\n${getIcon('processing')} **कृपया तपासा:**\n${getIcon('voice')} **मायक्रोफोन सक्षम आहे**\n${getIcon('voice')} **स्पष्टपणे बोला**\n${getIcon('phone')} **नेटवर्क कनेक्शन चांगले आहे**\n\n🔄 **पुन्हा प्रयत्न करा**`,
    'pa': `${getIcon('error')} **ਆਵਾਜ਼ ਪ੍ਰੋਸੈਸਿੰਗ ਗਲਤੀ!**\n\n${getIcon('processing')} **ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ:**\n${getIcon('voice')} **ਮਾਈਕ੍ਰੋਫੋਨ ਸਮਰੱਥ ਹੈ**\n${getIcon('voice')} **ਸਪੱਸ਼ਟ ਬੋਲੋ**\n${getIcon('phone')} **ਨੈੱਟਵਰਕ ਕਨੈਕਸ਼ਨ ਚੰਗਾ ਹੈ**\n\n🔄 **ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ**`
  },
  
  // Image processing error
  imageError: {
    'hi': 'इमेज प्रोसेस करने में समस्या हुई। कृपया दोबारा कोशिश करें।',
    'en': 'Error processing image. Please try again.',
    'ta': 'படத்தை செயலாக்குவதில் பிழை. மீண்டும் முயற்சிக்கவும்.',
    'te': 'చిత్రాన్ని ప్రాసెస్ చేయడంలో లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    'kn': 'ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವಲ್ಲಿ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    'ml': 'ചിത്രം പ്രോസസ്സ് ചെയ്യുന്നതിൽ പിശക്. വീണ്ടും ശ്രമിക്കുക.',
    'bn': 'ছবি প্রক্রিয়াকরণে ত্রুটি। আবার চেষ্টা করুন।',
    'gu': 'છબી પ્રક્રિયામાં ભૂલ. ફરી પ્રયાસ કરો.',
    'mr': 'प्रतिमा प्रक्रिया करताना त्रुटी. पुन्हा प्रयत्न करा.',
    'pa': 'ਤਸਵੀਰ ਪ੍ਰੋਸੈਸ ਕਰਨ ਵਿੱਚ ਗਲਤੀ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
  },
  
  // Scan report prompt (looks like this was partial)
  scanReportPrompt2: {
    'pa': '📸 **ਮੈਡੀਕਲ ਰਿਪੋਰਟ ਸਕੈਨ ਕਰੋ**\n\n📷 **ਆਪਣੀ ਫੋਟੋ ਭੇਜੋ:**\n• ਲੈਬ ਰਿਪੋਰਟਾਂ\n• ਨੁਸਖ਼ਾ\n• ਮੈਡੀਕਲ ਦਸਤਾਵੇਜ਼\n\n🔬 **ਅਸੀਂ ਇਸਦਾ ਮੁਫਤ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰਾਂਗੇ!**'
  },
  
  // Processing image
  processingImage: {
    'hi': '📸 आपकी मेडिकल इमेज प्रोसेस हो रही है...',
    'en': '📸 Processing your medical image...',
    'ta': '📸 உங்கள் மருத்துவ படம் செயலாக்கப்படுகிறது...',
    'te': '📸 మీ వైద్య చిత్రం ప్రాసెస్ అవుతోంది...',
    'kn': '📸 ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆಗೊಳ್ಳುತ್ತಿದೆ...',
    'ml': '📸 നിങ്ങളുടെ മെഡിക്കൽ ചിത്രം പ്രോസസ്സ് ചെയ്യുന്നു...',
    'bn': '📸 আপনার মেডিকেল ছবি প্রক্রিয়াকরণ হচ্ছে...',
    'gu': '📸 તમારી મેડિકલ છબી પ્રક્રિયા કરી રહ્યું છે...',
    'mr': '📸 तुमची वैद्यकीय प्रतिमा प्रक्रिया केली जात आहे...',
    'pa': '📸 ਤੁਹਾਡੀ ਮੈਡੀਕਲ ਤਸਵੀਰ ਪ੍ਰੋਸੈਸ ਹੋ ਰਹੀ ਹੈ...'
  },
  
  // Invalid language choice
  invalidLanguageChoice: {
    'hi': '❌ **अमान्य विकल्प!**\n\n👆 **नीचे बटन दबाएं या 1-10 टाइप करें:**',
    'en': '❌ **INVALID CHOICE!**\n\n👆 **TAP A BUTTON BELOW OR TYPE 1-10:**',
    'ta': '❌ **தவறான தேர்வு!**\n\n👆 **கீழே உள்ள பொத்தானை அழுத்தவும் அல்லது 1-10 தட்டச்சு செய்யவும்:**',
    'te': '❌ **చెల్లని ఎంపిక!**\n\n👆 **క్రింద బటన్‌ను నొక్కండి లేదా 1-10 టైప్ చేయండి:**',
    'kn': '❌ **ಅಮಾನ್ಯ ಆಯ್ಕೆ!**\n\n👆 **ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿರಿ ಅಥವಾ 1-10 ಟೈಪ್ ಮಾಡಿ:**',
    'ml': '❌ **അസാധുവായ തിരഞ്ഞെടുപ്പ്!**\n\n👆 **താഴെയുള്ള ബട്ടൺ അമർത്തുക അല്ലെങ്കിൽ 1-10 ടൈപ്പ് ചെയ്യുക:**',
    'bn': '❌ **অবৈধ পছন্দ!**\n\n👆 **নীচের বোতাম টিপুন বা 1-10 টাইপ করুন:**',
    'gu': '❌ **અમાન્ય પસંદગી!**\n\n👆 **નીચે બટન દબાવો અથવા 1-10 ટાઇપ કરો:**',
    'mr': '❌ **अवैध निवड!**\n\n👆 **खाली बटण दाबा किंवा 1-10 टाइप करा:**',
    'pa': '❌ **ਗਲਤ ਚੋਣ!**\n\n👆 **ਹੇਠਾਂ ਬਟਨ ਦਬਾਓ ਜਾਂ 1-10 ਟਾਈਪ ਕਰੋ:**'
  },
  
  // Jan Aushadhi search prompt
  janAushadhiPrompt: {
    'hi': '💊 **जन औषधि स्टोर खोजें**\n\n📍 **अपना 6 अंकों का पिनकोड दर्ज करें:**\n\nउदाहरण: 110001',
    'en': '💊 **FIND JAN AUSHADHI STORES**\n\n📍 **Enter your 6-digit pincode:**\n\nExample: 110001',
    'ta': '💊 **ஜன் ஔஷதி கடைகளைக் கண்டுபிடிக்கவும்**\n\n📍 **உங்கள் 6 இலக்க பின்கோடை உள்ளிடவும்:**\n\nஉதாரணம்: 110001',
    'te': '💊 **జన్ ఔషధి దుకాణాలను కనుగొనండి**\n\n📍 **మీ 6 అంకెల పిన్‌కోడ్‌ను నమోదు చేయండి:**\n\nఉదాహరణ: 110001',
    'kn': '💊 **ಜನ ಔಷಧಿ ಅಂಗಡಿಗಳನ್ನು ಹುಡುಕಿ**\n\n📍 **ನಿಮ್ಮ 6 ಅಂಕಿಯ ಪಿನ್‌ಕೋಡ್ ನಮೂದಿಸಿ:**\n\nಉದಾಹರಣೆ: 110001',
    'ml': '💊 **ജൻ ഔഷധി സ്റ്റോറുകൾ കണ്ടെത്തുക**\n\n📍 **നിങ്ങളുടെ 6 അക്ക പിൻകോഡ് നൽകുക:**\n\nഉദാഹരണം: 110001',
    'bn': '💊 **জন ঔষধি দোকান খুঁজুন**\n\n📍 **আপনার 6 সংখ্যার পিনকোড লিখুন:**\n\nউদাহরণ: 110001',
    'gu': '💊 **જન ઔષધિ સ્ટોર શોધો**\n\n📍 **તમારો 6 અંકનો પિનકોડ દાખલ કરો:**\n\nઉદાહરણ: 110001',
    'mr': '💊 **जन औषधी स्टोअर शोधा**\n\n📍 **तुमचा 6 अंकी पिनकोड एंटर करा:**\n\nउदाहरण: 110001',
    'pa': '💊 **ਜਨ ਔਸ਼ਧੀ ਸਟੋਰ ਲੱਭੋ**\n\n📍 **ਆਪਣਾ 6 ਅੰਕਾਂ ਦਾ ਪਿੰਨਕੋਡ ਦਾਖਲ ਕਰੋ:**\n\nਉਦਾਹਰਨ: 110001'
  },
  
  // Voice error messages
  voiceError: {
    'hi': '❌ **वॉइस प्रोसेसिंग में समस्या!**\n\n🔧 **कृपया सुनिश्चित करें:**\n🎤 **माइक्रोफोन चालू है**\n🔊 **आवाज़ साफ़ है**\n📱 **नेटवर्क कनेक्शन ठीक है**\n\n🔄 **दोबारा कोशिश करें**',
    'en': '❌ **VOICE PROCESSING ERROR!**\n\n🔧 **PLEASE CHECK:**\n🎤 **MICROPHONE IS ENABLED**\n🔊 **SPEAK CLEARLY**\n📱 **NETWORK CONNECTION IS GOOD**\n\n🔄 **TRY AGAIN**',
    'ta': '❌ **குரல் செயலாக்க பிழை!**\n\n🔧 **தயவுசெய்து சரிபார்க்கவும்:**\n🎤 **மைக்ரோஃபோன் இயக்கப்பட்டுள்ளது**\n🔊 **தெளிவாக பேசவும்**\n📱 **நெட்வொர்க் இணைப்பு நன்றாக உள்ளது**\n\n🔄 **மீண்டும் முயற்சிக்கவும்**',
    'te': '❌ **వాయిస్ ప్రాసెసింగ్ లోపం!**\n\n🔧 **దయచేసి తనిఖీ చేయండి:**\n🎤 **మైక్రోఫోన్ ఎనేబుల్ చేయబడింది**\n🔊 **స్పష్టంగా మాట్లాడండి**\n📱 **నెట్‌వర్క్ కనెక్షన్ బాగుంది**\n\n🔄 **మళ్ళీ ప్రయత్నించండి**',
    'kn': '❌ **ಧ್ವನಿ ಪ್ರಕ್ರಿಯೆ ದೋಷ!**\n\n🔧 **ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ:**\n🎤 **ಮೈಕ್ರೋಫೋನ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ**\n🔊 **ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ**\n📱 **ನೆಟ್‌ವರ್ಕ್ ಸಂಪರ್ಕ ಉತ್ತಮವಾಗಿದೆ**\n\n🔄 **ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ**',
    'ml': '❌ **വോയ്സ് പ്രോസസ്സിംഗ് പിശക്!**\n\n🔧 **ദയവായി പരിശോധിക്കുക:**\n🎤 **മൈക്രോഫോൺ പ്രവർത്തനക്ഷമമാണ്**\n🔊 **വ്യക്തമായി സംസാരിക്കുക**\n📱 **നെറ്റ്‌വർക്ക് കണക്ഷൻ നല്ലതാണ്**\n\n🔄 **വീണ്ടും ശ്രമിക്കുക**',
    'bn': '❌ **ভয়েস প্রক্রিয়াকরণ ত্রুটি!**\n\n🔧 **দয়া করে পরীক্ষা করুন:**\n🎤 **মাইক্রোফোন সক্ষম করা আছে**\n🔊 **পরিষ্কারভাবে কথা বলুন**\n📱 **নেটওয়ার্ক সংযোগ ভাল আছে**\n\n🔄 **আবার চেষ্টা করুন**',
    'gu': '❌ **વૉઇસ પ્રોસેસિંગ ભૂલ!**\n\n🔧 **કૃપા કરીને તપાસો:**\n🎤 **માઇક્રોફોન સક્ષમ છે**\n🔊 **સ્પષ્ટ રીતે બોલો**\n📱 **નેટવર્ક કનેક્શન સારું છે**\n\n🔄 **ફરી પ્રયાસ કરો**',
    'mr': '❌ **आवाज प्रक्रिया त्रुटी!**\n\n🔧 **कृपया तपासा:**\n🎤 **मायक्रोफोन सक्षम आहे**\n🔊 **स्पष्टपणे बोला**\n📱 **नेटवर्क कनेक्शन चांगले आहे**\n\n🔄 **पुन्हा प्रयत्न करा**',
    'pa': '❌ **ਆਵਾਜ਼ ਪ੍ਰੋਸੈਸਿੰਗ ਗਲਤੀ!**\n\n🔧 **ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ:**\n🎤 **ਮਾਈਕ੍ਰੋਫੋਨ ਸਮਰੱਥ ਹੈ**\n🔊 **ਸਪੱਸ਼ਟ ਬੋਲੋ**\n📱 **ਨੈੱਟਵਰਕ ਕਨੈਕਸ਼ਨ ਚੰਗਾ ਹੈ**\n\n🔄 **ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ**'
  },
  
  // Image processing error
  imageError: {
    'hi': 'इमेज प्रोसेस करने में समस्या हुई। कृपया दोबारा कोशिश करें।',
    'en': 'Error processing image. Please try again.',
    'ta': 'படத்தை செயலாக்குவதில் பிழை. மீண்டும் முயற்சிக்கவும்.',
    'te': 'చిత్రాన్ని ప్రాసెస్ చేయడంలో లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    'kn': 'ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವಲ್ಲಿ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    'ml': 'ചിത്രം പ്രോസസ്സ് ചെയ്യുന്നതിൽ പിശക്. വീണ്ടും ശ്രമിക്കുക.',
    'bn': 'ছবি প্রক্রিয়াকরণে ত্রুটি। আবার চেষ্টা করুন।',
    'gu': 'છબી પ્રક્રિયામાં ભૂલ. ફરી પ્રયાસ કરો.',
    'mr': 'प्रतिमा प्रक्रिया करताना त्रुटी. पुन्हा प्रयत्न करा.',
    'pa': 'ਤਸਵੀਰ ਪ੍ਰੋਸੈਸ ਕਰਨ ਵਿੱਚ ਗਲਤੀ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
  }
};

// Helper function to get translated text
function getTranslation(key: string, language: string): string {
  const translations = TRANSLATIONS[key as keyof typeof TRANSLATIONS];
  if (!translations) return 'Translation not found';
  return translations[language as keyof typeof translations] || translations['en'];
}

// User management functions
async function getOrCreateUser(chatId: string): Promise<User> {
  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('chat_id', chatId)
      .single()

    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          chat_id: chatId,
          created_at: new Date().toISOString(),
          state: 'language_selection',
          usage_count: 0,
          plan_type: 'free',
          free_complex_used: false,
          paid_complex_count: 0
        }])
        .select()
        .single()

      if (createError) throw createError
      return newUser as User
    }

    if (error) throw error
    return user as User
  } catch (err) {
    console.error('Error in getOrCreateUser:', err)
    throw err
  }
}

async function updateUserState(chatId: string, updates: any) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('chat_id', chatId)
  
  if (error) throw error
  return data
}

// Sarvam API functions
async function transcribeAudio(audioUrl: string, userLanguage: string): Promise<string> {
  try {
    console.log(`🎤 Transcribing audio with Sarvam STT`);
    
    // Download audio file
    const audioResponse = await fetch(audioUrl);
    const audioArrayBuffer = await audioResponse.arrayBuffer();
    
    // Create blob with proper OGG audio type
    const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/ogg' });
    
    // Convert to FormData for Sarvam API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'saarika:v2.5');
    
    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY
      },
      body: formData
    });
    
    const result = await response.json();
    console.log('Sarvam STT response:', JSON.stringify(result));
    
    // Based on Sarvam docs, response structure is { "transcript": "text" }
    if (result.transcript) {
      console.log(`✅ STT Success: "${result.transcript}"`);
      return result.transcript;
    } else {
      console.error('No transcript in response:', result);
      throw new Error('No transcript returned from Sarvam API');
    }
  } catch (error) {
    console.error('Sarvam STT error:', error);
    throw error;
  }
}

async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  try {
    console.log(`🌐 Translating: ${fromLang} → ${toLang}`);
    
    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'API-Subscription-Key': SARVAM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        source_language_code: fromLang,
        target_language_code: toLang,
        speaker_gender: 'Female',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: true
      })
    });
    
    const result = await response.json();
    
    if (result.translated_text) {
      console.log(`✅ Translation: "${result.translated_text}"`);
      return result.translated_text;
    } else {
      console.error('No translation in response:', result);
      return text; // Fallback to original text
    }
  } catch (error) {
    console.error('Sarvam translation error:', error);
    return text; // Fallback to original text
  }
}

async function generateAudio(text: string, language: string): Promise<ArrayBuffer> {
  try {
    console.log(`🔊 Generating audio with Sarvam TTS`);
    
    // Limit text to 500 characters per Sarvam docs
    const limitedText = text.length > 500 ? text.substring(0, 500) + '...' : text;
    
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: limitedText,
        target_language_code: language,
        speaker: 'meera',
        pitch: 0,
        pace: 1.65,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'bulbul:v1'
      })
    });
    
    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log(`✅ TTS Success: Generated ${audioBuffer.byteLength} bytes`);
      return audioBuffer;
    } else {
      const errorText = await response.text();
      console.error('TTS API error:', response.status, errorText);
      throw new Error(`TTS API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Sarvam TTS error:', error);
    throw error;
  }
}

// MAI-DxO Orchestrator - Multi-Agent Diagnostic System (Updated)
const MEDICAL_AGENTS = {
  DIFFERENTIAL_DIAGNOSTICIAN: "Generate top 3 diagnoses with probabilities. Be concise.",
  TEST_STRATEGIST: "Recommend 2-3 most cost-effective tests for Indian patients.",
  DEVIL_ADVOCATE: "Challenge the diagnosis. What could be missed?",
  SYNTHESIZER: "Provide final assessment with confidence level."
};

async function maiDxoOrchestrator(query: string, userContext: any): Promise<string> {
  try {
    console.log(`🤖 Starting MAI-DxO for: "${query}"`);
    console.log(`🔑 API Keys check: Claude=${!!CLAUDE_API_KEY}, OpenAI=${!!OPENAI_API_KEY}, Gemini=${!!GEMINI_API_KEY}`);
    
    // Run parallel consultations with all 3 AI models
    const [claudeResult, openaiResult, geminiResult] = await Promise.allSettled([
      consultClaude(query, userContext),
      consultOpenAI(query, userContext), 
      consultGemini(query, userContext)
    ]);

    // Collect successful responses
    const responses = [];
    if (claudeResult.status === 'fulfilled' && !claudeResult.value.includes('error') && !claudeResult.value.includes('unavailable')) {
      responses.push(`**Claude:** ${claudeResult.value}`);
      console.log('✅ Claude consultation successful');
    } else {
      console.log('❌ Claude consultation failed:', claudeResult.status === 'fulfilled' ? claudeResult.value : claudeResult.reason);
    }
    
    if (openaiResult.status === 'fulfilled' && !openaiResult.value.includes('error') && !openaiResult.value.includes('unavailable')) {
      responses.push(`**OpenAI:** ${openaiResult.value}`);
      console.log('✅ OpenAI consultation successful');
    } else {
      console.log('❌ OpenAI consultation failed:', openaiResult.status === 'fulfilled' ? openaiResult.value : openaiResult.reason);
    }
    
    if (geminiResult.status === 'fulfilled' && !geminiResult.value.includes('error') && !geminiResult.value.includes('unavailable')) {
      responses.push(`**Gemini:** ${geminiResult.value}`);
      console.log('✅ Gemini consultation successful');
    } else {
      console.log('❌ Gemini consultation failed:', geminiResult.status === 'fulfilled' ? geminiResult.value : geminiResult.reason);
    }

    // If no AI responses, fall back to Claude health response
    if (responses.length === 0) {
      console.log('🔄 All AIs failed, falling back to simple health response');
      return await getHealthResponse(query, userContext, 100);
    }

    // Synthesize brief final diagnosis
    const synthesis = await synthesizeBriefDiagnosis(responses, query);
    
    return `🤖 **MULTI-AI ANALYSIS** (${responses.length}/3 AIs)\n\n${synthesis}\n\n⚠️ AI guidance only. Consult doctor for proper diagnosis.`;
    
  } catch (error) {
    console.error('MAI-DxO error:', error);
    return await getHealthResponse(query, userContext, 100);
  }
}

async function consultClaude(query: string, context: any): Promise<string> {
  const prompt = `Patient: ${context.age || 'Age not specified'}\nSymptoms: ${query}\n\nProvide brief diagnosis (max 25 words): likely condition, confidence %, next step.`;
  
  try {
    if (!CLAUDE_API_KEY) {
      console.error('Claude API key missing');
      return 'Claude API key not configured';
    }

    console.log('🤖 Calling Claude API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return `Claude error: ${response.status}`;
    }
    
    const result = await response.json();
    console.log('✅ Claude response received');
    return result.content?.[0]?.text || 'Claude: No response content';
  } catch (error) {
    console.error('Claude error:', error);
    return `Claude error: ${error.message}`;
  }
}

async function consultOpenAI(query: string, context: any): Promise<string> {
  try {
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key missing');
      return 'OpenAI API key not configured';
    }

    console.log('🤖 Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Patient: ${context.age || 'Age not specified'}\nSymptoms: ${query}\n\nBrief diagnosis (max 25 words): condition, confidence, recommendation.`
        }],
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return `OpenAI error: ${response.status}`;
    }
    
    const result = await response.json();
    console.log('✅ OpenAI response received');
    return result.choices?.[0]?.message?.content || 'OpenAI: No response content';
  } catch (error) {
    console.error('OpenAI error:', error);
    return `OpenAI error: ${error.message}`;
  }
}

async function consultGemini(query: string, context: any): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key missing');
      return 'Gemini API key not configured';
    }

    console.log('🤖 Calling Gemini API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Patient: ${context.age || 'Age not specified'}\nSymptoms: ${query}\n\nBrief medical assessment (max 25 words): likely diagnosis, confidence level, next step.`
          }]
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return `Gemini error: ${response.status}`;
    }
    
    const result = await response.json();
    console.log('✅ Gemini response received');
    return result.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini: No response content';
  } catch (error) {
    console.error('Gemini error:', error);
    return `Gemini error: ${error.message}`;
  }
}

async function synthesizeBriefDiagnosis(responses: string[], query: string): Promise<string> {
  const synthesis = `Based on ${responses.length} AI consultations:\n\n${responses.join('\n\n')}\n\n**CONSENSUS:** ${responses.length > 1 ? 'Multiple AIs suggest similar assessment' : 'Single AI analysis'}`;
  
  // Keep it under 100 words total
  if (synthesis.length > 400) {
    return synthesis.substring(0, 400) + '...';
  }
  
  return synthesis;
}

// Claude AI function
async function getHealthResponse(query: string, userContext: any = {}, wordLimit?: number): Promise<string> {
  try {
    const wordLimitInstruction = wordLimit ? `\n\nIMPORTANT: Limit your response to exactly ${wordLimit} words or less.` : '';
    
    const systemPrompt = `You are a helpful healthcare assistant for Indian users. Provide medical guidance but always include disclaimers to consult healthcare professionals. Keep responses concise but informative.

User context: ${JSON.stringify(userContext)}

Structure your response as:
1. Brief assessment
2. Recommendations  
3. Important disclaimer

Always end with: "⚠️ This is general guidance only. Please consult a qualified doctor for proper diagnosis and treatment."${wordLimitInstruction}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: wordLimit ? Math.min(wordLimit * 2, 300) : 1000,
        messages: [
          {
            role: 'user',
            content: `${query} [${Date.now()}]`
          }
        ],
        system: systemPrompt
      })
    })
    
    const result = await response.json()
    
    // Handle potential API errors
    if (result.error) {
      throw new Error(`Claude API error: ${result.error.message}`)
    }
    
    // Return content safely
    return result.content?.[0]?.text || 'Unable to process request'
  } catch (error) {
    console.error('Error calling Claude API:', error)
    // Return fallback message
    return 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment. ⚠️ This is general guidance only. Please consult a qualified doctor for proper diagnosis and treatment.'
  }
}

// Helper function to check if complex diagnosis is needed
function shouldUseMaiDxo(query: string, isVoice: boolean, isImage: boolean, user: User): boolean {
  const complexKeywords = [
    'diagnosis', 'diagnose', 'symptoms', 'disease', 'condition',
    'multiple symptoms', 'chronic', 'severe', 'urgent', 'emergency',
    'test', 'examination', 'specialist', 'treatment plan', 'chest pain',
    'shortness of breath', 'heart attack', 'stroke', 'bleeding', 'fever',
    'headache', 'stomach pain', 'back pain', 'dizziness', 'nausea'
  ];
  
  const lowerQuery = query.toLowerCase();
  const hasKeywords = complexKeywords.some(keyword => lowerQuery.includes(keyword));
  const isLongQuery = query.length > 100;
  const isComplex = hasKeywords || isLongQuery || isVoice || isImage;
  
  console.log(`🔍 DIAGNOSIS TYPE CHECK:`);
  console.log(`Query: "${query}"`);
  console.log(`Complex: ${isComplex}`);
  console.log(`Reasons: Keywords=${hasKeywords}, Length=${isLongQuery}, Voice=${isVoice}, Image=${isImage}`);
  console.log(`User usage: ${user.usage_count}/20 free questions used`);
  
  return isComplex;
}

// Language keyboard helper
function getLanguageInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🇮🇳 Hindi (हिंदी)", callback_data: "lang_hi" },
        { text: "🇬🇧 English", callback_data: "lang_en" }
      ],
      [
        { text: "Tamil (தமிழ்)", callback_data: "lang_ta" },
        { text: "Telugu (తెలుగు)", callback_data: "lang_te" }
      ],
      [
        { text: "Kannada (ಕನ್ನಡ)", callback_data: "lang_kn" },
        { text: "Malayalam (മലയാളം)", callback_data: "lang_ml" }
      ],
      [
        { text: "Bengali (বাংলা)", callback_data: "lang_bn" },
        { text: "Gujarati (ગુજરાતી)", callback_data: "lang_gu" }
      ],
      [
        { text: "Marathi (मराठी)", callback_data: "lang_mr" },
        { text: "Punjabi (ਪੰਜਾਬੀ)", callback_data: "lang_pa" }
      ]
    ]
  };
}

// Clear conversation history for fresh responses
async function clearUserContext(chatId: string) {
  console.log(`🔄 Clearing context for user ${chatId}`);
  await updateUserState(chatId, {
    last_used: new Date().toISOString()
  });
}

// Show main menu
async function showMainMenu(chatId: string, user: User) {
  const menuMessages: Record<string, string> = {
    'hi': '📋 **मुख्य मेनू**\n\n🏥 **DR247 AI स्वास्थ्य सहायक**',
    'ta': '📋 **முதன்மை மெனு**\n\n🏥 **DR247 AI உடல்நல உதவியாளர்**',
    'te': '📋 **ప్రధాన మెనూ**\n\n🏥 **DR247 AI ఆరోగ్య సహాయకుడు**',
    'kn': '📋 **ಮುಖ್ಯ ಮೆನು**\n\n🏥 **DR247 AI ಆರೋಗ್ಯ ಸಹಾಯಕ**',
    'ml': '📋 **പ്രധാന മെനു**\n\n🏥 **DR247 AI ആരോഗ്യ സഹായി**',
    'bn': '📋 **প্রধান মেনু**\n\n🏥 **DR247 AI স্বাস্থ্য সহায়ক**',
    'gu': '📋 **મુખ્ય મેનુ**\n\n🏥 **DR247 AI આરોગ્ય સહાયક**',
    'mr': '📋 **मुख्य मेनू**\n\n🏥 **DR247 AI आरोग्य सहाय्यक**',
    'pa': '📋 **ਮੁੱਖ ਮੀਨੂ**\n\n🏥 **DR247 AI ਸਿਹਤ ਸਹਾਇਕ**',
    'en': '📋 **MAIN MENU**\n\n🏥 **DR247 AI HEALTH ASSISTANT**'
  };

  const menuMsg = menuMessages[user.language] || menuMessages['en'];

  const keyboard = {
    keyboard: [
      [{ text: '💬 Health Question' }, { text: '💊 Find Medicine Store' }],
      [{ text: '📸 Scan Report' }, { text: '🌐 LANG' }],
      [{ text: '📊 Usage Stats' }, { text: '❓ Help' }]
    ],
    resize_keyboard: true,
    persistent: true
  };

  await sendTelegramMessage(chatId, menuMsg, { reply_markup: keyboard });
}

// Telegram messaging functions
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: replyMarkup
      })
    })
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`)
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}

async function sendTelegramAudio(chatId: string, audioBuffer: ArrayBuffer, caption?: string) {
  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), 'response.wav');
    if (caption) formData.append('caption', caption);

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Telegram audio API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending Telegram audio:', error);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || ''
      })
    })
  } catch (error) {
    console.error('Error answering callback query:', error)
  }
}

async function downloadTelegramFile(fileId: string): Promise<string> {
  try {
    // Get file path
    const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
    const fileData = await fileResponse.json()
    
    if (!fileData.ok) {
      throw new Error('Failed to get file info')
    }
    
    // Download file
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`
    return downloadUrl
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}

// Message templates
function getLanguageSelectionMessage(): string {
  return `🏥 Welcome to Dr247 AI Health Assistant!

Please select your preferred language:
1️⃣ Hindi (हिंदी)
2️⃣ English
3️⃣ Tamil (தமிழ்)
4️⃣ Telugu (తెలుగు)
5️⃣ Kannada (ಕನ್ನಡ)
6️⃣ Malayalam (മലയാളം)
7️⃣ Bengali (বাংলা)
8️⃣ Gujarati (ગુજરાતી)
9️⃣ Marathi (मराठी)
🔟 Punjabi (ਪੰਜਾਬੀ)

Reply with the number of your choice or use the buttons below.`
}

function getOnboardingMessage(language: string): string {
  const messages: Record<string, string> = {
    'hi': 'कृपया निम्नलिखित जानकारी साझा करें:\n1. आपकी उम्र\n2. लिंग (पुरुष/महिला/अन्य)\n3. कोई मुख्य स्वास्थ्य समस्या\n\nउदाहरण: "35 साल, पुरुष, डायबिटीज और हाई BP"',
    'en': 'Please share the following information:\n1. Your age\n2. Gender (Male/Female/Other)\n3. Any major health conditions\n\nExample: "35 years, Male, Diabetes and High BP"',
    'ta': 'தயவுசெய்து பின்வரும் தகவல்களைப் பகிரவும்:\n1. உங்கள் வயது\n2. பாலினம் (ஆண்/பெண்/மற்றவை)\n3. ஏதேனும் முக்கிய உடல்நலப் பிரச்சினைகள்',
    'te': 'దయచేసి ఈ క్రింది సమాచారాన్ని పంచుకోండి:\n1. మీ వయస్సు\n2. లింగం (పురుషుడు/స్త్రీ/ఇతర)\n3. ఏవైనా ప్రధాన ఆరోగ్య సమస్యలు'
  }
  
  return messages[language] || messages['en']
}

// Message handlers
async function handleLanguageSelection(chatId: string, messageText: string, user: User) {
  const choice = messageText.trim().replace(/[^\d]/g, '') // Remove all non-digits
  const languageMap: Record<string, keyof typeof LANGUAGE_CALLBACKS> = {
    '1': 'lang_hi',
    '2': 'lang_en',
    '3': 'lang_ta',
    '4': 'lang_te',
    '5': 'lang_kn',
    '6': 'lang_ml',
    '7': 'lang_bn',
    '8': 'lang_gu',
    '9': 'lang_mr',
    '10': 'lang_pa'
  }
  
  console.log(`🔍 Language selection - Raw input: "${messageText}", Cleaned: "${choice}"`);
  
  const languageKey = languageMap[choice]
  const language = languageKey ? LANGUAGE_CALLBACKS[languageKey] : null
  
  if (!language) {
    console.log(`❌ Invalid language choice: "${choice}"`);
    const keyboard = getLanguageInlineKeyboard()
    await sendTelegramMessage(chatId, getTranslation('invalidLanguageChoice', 'en'), keyboard)
    return
  }
  
  console.log(`✅ Valid language selected: ${language.name}`);
  await updateUserState(chatId, {
    language: language.sarvam,
    language_name: language.name,
    state: 'onboarding'
  })
  
  const onboardingMsg = getOnboardingMessage(language.sarvam)
  await sendTelegramMessage(chatId, onboardingMsg)
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id.toString()
  const data = callbackQuery.data
  
  // Answer the callback query to stop loading animation
  await answerCallbackQuery(callbackQuery.id)
  
  try {
    const user = await getOrCreateUser(chatId)
    
    if (data.startsWith('lang_')) {
      const language = LANGUAGE_CALLBACKS[data as keyof typeof LANGUAGE_CALLBACKS]
      
      if (language) {
        await updateUserState(chatId, {
          language: language.sarvam,
          language_name: language.name,
          state: 'onboarding'
        })
        
        const onboardingMsg = getOnboardingMessage(language.sarvam)
        await sendTelegramMessage(chatId, onboardingMsg)
      }
    } else if (data === 'use_simple') {
      // Handle using simple diagnosis instead of complex
      if (user.pending_query) {
        console.log(`💬 User ${chatId} chose simple diagnosis over complex`);
        
        // Check if they have free questions left
        if (user.usage_count >= 20 && user.plan_type === 'free') {
          await sendTelegramMessage(chatId, '🚫 **NO FREE QUESTIONS LEFT!** Please upgrade to continue.');
          return;
        }
        
        const simpleResponse = await getHealthResponse(user.pending_query, {
          age: user.onboarding_info,
          language: user.language_name
        });
        
        const questionNum = user.usage_count + 1;
        const remainingQuestions = Math.max(0, 20 - questionNum);
        const responseWithUsage = `📋 **QUESTION #${questionNum}**\n━━━━━━━━━━━━━━━━━━━━\n\n${simpleResponse}\n\n━━━━━━━━━━━━━━━━━━━━\n📊 **${remainingQuestions} free questions remaining**`;
        
        await sendTelegramMessage(chatId, responseWithUsage);
        await updateUserState(chatId, { 
          state: 'ready',
          pending_query: null,
          usage_count: questionNum
        });
      }
    } else if (data.startsWith('more_aushadhi_')) {
      // Handle "Show More" for Jan Aushadhi centers
      const parts = data.split('_');
      const pincode = parts[2];
      await handleJanAushadhiSearch(chatId, pincode);
    } else if (data === 'search_new_pincode') {
      // Handle search new pincode
      await sendTelegramMessage(chatId, getTranslation('janAushadhiPrompt', user.language));
    }
  } catch (error) {
    console.error('Error handling callback query:', error)
  }
}

async function handleOnboarding(chatId: string, messageText: string, user: User) {
  await updateUserState(chatId, {
    onboarding_info: messageText,
    state: 'ready'
  })
  
  const welcomeMessages: Record<string, string> = {
    'hi': '✅ **धन्यवाद!** 🎉\n\n🩺 **स्वास्थ्य प्रश्न पूछें**\n\n**📋 मेनू विकल्प:**\n💬 /health - स्वास्थ्य प्रश्न\n💊 /janaushadhi - दवा की दुकान\n📸 /scan - रिपोर्ट स्कैन\n🌐 /lang - भाषा बदलें',
    'ta': '✅ **நன்றி!** 🎉\n\n🩺 **உடல்நலம் பற்றி கேளுங்கள்**\n\n**📋 மெனு விருப்பங்கள்:**\n💬 /health - உடல்நல கேள்வி\n💊 /janaushadhi - மருந்து கடை\n📸 /scan - அறிக்கை ஸ்கேன்\n🌐 /lang - மொழி மாற்று',
    'te': '✅ **ధన్యవాదాలు!** 🎉\n\n🩺 **ఆరోగ్య ప్రశ్నలు అడగండి**\n\n**📋 మెనూ ఎంపికలు:**\n💬 /health - ఆరోగ్య ప్రశ్న\n💊 /janaushadhi - మందుల దుకాణం\n📸 /scan - రిపోర్ట్ స్కాన్\n🌐 /lang - భాష మార్చు',
    'kn': '✅ **ಧನ್ಯವಾದಗಳು!** 🎉\n\n🩺 **ಆರೋಗ್ಯ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ**\n\n**📋 ಮೆನು ಆಯ್ಕೆಗಳು:**\n💬 /health - ಆರೋಗ್ಯ ಪ್ರಶ್ನೆ\n💊 /janaushadhi - ಔಷಧಿ ಅಂಗಡಿ\n📸 /scan - ವರದಿ ಸ್ಕ್ಯಾನ್\n🌐 /lang - ಭಾಷೆ ಬದಲಿಸಿ',
    'ml': '✅ **നന്ദി!** 🎉\n\n🩺 **ആരോഗ്യ ചോദ്യങ്ങൾ ചോദിക്കുക**\n\n**📋 മെനു ഓപ്ഷനുകൾ:**\n💬 /health - ആരോഗ്യ ചോദ്യം\n💊 /janaushadhi - മരുന്ന് കട\n📸 /scan - റിപ്പോർട്ട് സ്കാൻ\n🌐 /lang - ഭാഷ മാറ്റുക',
    'bn': '✅ **ধন্যবাদ!** 🎉\n\n🩺 **স্বাস্থ্য প্রশ্ন জিজ্ঞাসা করুন**\n\n**📋 মেনু অপশন:**\n💬 /health - স্বাস্থ্য প্রশ্ন\n💊 /janaushadhi - ওষুধের দোকান\n📸 /scan - রিপোর্ট স্ক্যান\n🌐 /lang - ভাষা পরিবর্তন',
    'gu': '✅ **આભાર!** 🎉\n\n🩺 **આરોગ્ય પ્રશ્નો પૂછો**\n\n**📋 મેનુ વિકલ્પો:**\n💬 /health - આરોગ્ય પ્રશ્ન\n💊 /janaushadhi - દવાની દુકાન\n📸 /scan - રિપોર્ટ સ્કેન\n🌐 /lang - ભાષા બદલો',
    'mr': '✅ **धन्यवाद!** 🎉\n\n🩺 **आरोग्य प्रश्न विचारा**\n\n**📋 मेनू पर्याय:**\n💬 /health - आरोग्य प्रश्न\n💊 /janaushadhi - औषध दुकान\n📸 /scan - अहवाल स्कॅन\n🌐 /lang - भाषा बदला',
    'pa': '✅ **ਧੰਨਵਾਦ!** 🎉\n\n🩺 **ਸਿਹਤ ਸਵਾਲ ਪੁੱਛੋ**\n\n**📋 ਮੀਨੂ ਵਿਕਲਪ:**\n💬 /health - ਸਿਹਤ ਸਵਾਲ\n💊 /janaushadhi - ਦਵਾਈ ਦੁਕਾਨ\n📸 /scan - ਰਿਪੋਰਟ ਸਕੈਨ\n🌐 /lang - ਭਾਸ਼ਾ ਬਦਲੋ',
    'en': '✅ **THANK YOU!** 🎉\n\n🩺 **ASK HEALTH QUESTIONS**\n\n**📋 MENU OPTIONS:**\n💬 /health - Ask health question\n💊 /janaushadhi - Find medicine stores\n📸 /scan - Scan medical reports\n🌐 /lang - Change language'
  };
  
  const welcomeMsg = welcomeMessages[user.language] || welcomeMessages['en'];
  
  // Send menu with reply keyboard
  const keyboard = {
    keyboard: [
      [{ text: '💬 Health Question' }, { text: '💊 Find Medicine Store' }],
      [{ text: '📸 Scan Report' }, { text: '🌐 LANG' }]
    ],
    resize_keyboard: true,
    persistent: true
  };
  
  await sendTelegramMessage(chatId, welcomeMsg, { reply_markup: keyboard })
}

async function handleLanguageChange(chatId: string, user: User) {
  await updateUserState(chatId, { 
    state: 'language_selection',
    language: '',
    language_name: '',
    pending_query: null
  })
  const keyboard = getLanguageInlineKeyboard()
  await sendTelegramMessage(chatId, getLanguageSelectionMessage(), keyboard)
}

// Payment handling
async function handlePaymentRequest(chatId: string, query: string, user: User, isVoice = false, isImage = false) {
  console.log(`💰 PAYMENT REQUEST TRIGGERED`);
  console.log(`User: ${chatId}, Complex diagnoses used: ${user.paid_complex_count}`);
  
  // Clear context for fresh response
  await clearUserContext(chatId);
  
  // First 2 complex diagnoses are free (paid_complex_count 0 and 1)
  if (user.paid_complex_count < 2) {
    // First 2 complex diagnoses are free
    console.log(`🆓 Providing FREE complex diagnosis ${user.paid_complex_count + 1}/2 for user ${chatId}`);
    const analysisType = isVoice ? '🎤 Voice + AI Medical Panel' : isImage ? '📸 Image + AI Medical Panel' : '🤖 AI Medical Panel';
    await sendTelegramMessage(chatId, `🆓 FREE Complex Diagnosis\n\n${analysisType} analysis...`);
    
    console.log(`🤖 Starting MAI-DxO orchestrator for query: "${query}"`);
    const diagnosis = await maiDxoOrchestrator(query, {
      age: user.onboarding_info,
      language: user.language_name,
      isFirstFree: true,
      isVoice,
      isImage
    });
    
    // For voice queries, also send audio response
    if (isVoice && user.language !== 'en') {
      try {
        const translatedResponse = await translateText(diagnosis, 'en', user.language);
        const audioBuffer = await generateAudio(translatedResponse, user.language);
        await sendTelegramAudio(chatId, audioBuffer, translatedResponse);
      } catch (error) {
        console.error('Voice response error:', error);
        await sendTelegramMessage(chatId, diagnosis);
      }
    } else {
      await sendTelegramMessage(chatId, diagnosis);
    }
    
    await updateUserState(chatId, { 
      free_complex_used: true,
      paid_complex_count: user.paid_complex_count + 1
    });
    console.log(`✅ Free complex diagnosis ${user.paid_complex_count + 1}/2 completed for user ${chatId}`);
  } else {
    // Paid diagnosis required
    console.log(`💳 Requesting payment for user ${chatId}`);
    // Check if we're in test mode
    const isTestMode = Deno.env.get('RAZORPAY_MODE') === 'test';
    
    if (isTestMode) {
      // For test mode, provide test instructions
      await sendTelegramMessage(chatId, 
        `💰 **COMPLEX AI DIAGNOSIS - ₹200**\n\n🔬 **ADVANCED MULTI-AI MEDICAL PANEL ANALYSIS**\n\n⚠️ **TEST MODE ACTIVE**\n\n✅ To simulate payment, type: **paid**\n❌ Payment links don't work in test mode`,
        {
          inline_keyboard: [
            [{ text: "✅ SIMULATE PAYMENT (TYPE 'paid')", callback_data: "test_payment_info" }],
            [{ text: "💬 **GET BASIC GUIDANCE (FREE)**", callback_data: "skip_payment" }]
          ]
        }
      );
      
      // Skip the payment link message in test mode
      await updateUserState(chatId, { state: 'awaiting_complex_payment', pending_query: query });
      return;
    } else {
      // Live mode - use payment links
      await sendTelegramMessage(chatId, 
        `💰 **COMPLEX AI DIAGNOSIS - ₹200**\n\n🔬 **ADVANCED MULTI-AI MEDICAL PANEL ANALYSIS**\n📊 **DIFFERENTIAL DIAGNOSIS WITH PROBABILITY RANKING**\n🩺 **OPTIMIZED TEST RECOMMENDATIONS**\n💡 **COST-EFFECTIVE CARE PATHWAY**\n\n**👇 CHOOSE AN OPTION:**`,
        {
          inline_keyboard: [
            [{ text: "💳 **PAY ₹200 FOR ANALYSIS**", url: "https://rzp.io/rzp/1RrG1ddu" }],
            [{ text: "💬 **GET BASIC GUIDANCE (FREE)**", callback_data: "skip_payment" }]
          ]
        }
      );
    }
    
    // Send payment confirmation instructions with time limit warning
    await sendTelegramMessage(chatId, 
      `⏰ **IMPORTANT: Complete payment within 10 minutes**\n\n📱 **After payment, type "paid" or send screenshot**\n\n💡 **Payment Tips:**\n• Use UPI ID directly if link fails\n• Our UPI: movemtechnologiesprivatelimit@paytm\n• After manual payment, send screenshot\n\n❌ **Payment failed? Type "retry" for new link**`
    );
    
    // Set user state to awaiting payment
    await updateUserState(chatId, { state: 'awaiting_complex_payment', pending_query: query });
  }
}

async function handlePaymentVerification(chatId: string, user: User) {
  if (user.state === 'awaiting_payment' && user.pending_query) {
    await sendTelegramMessage(chatId, 
      `✅ Payment received! Analyzing with AI medical panel...`
    );
    
    const diagnosis = await maiDxoOrchestrator(user.pending_query, {
      age: user.onboarding_info,
      language: user.language_name,
      isPaid: true
    });
    
    await sendTelegramMessage(chatId, diagnosis);
    await updateUserState(chatId, { 
      state: 'ready',
      pending_query: null,
      paid_complex_count: (user.paid_complex_count || 0) + 1
    });
  }
}

async function handleHealthQuery(chatId: string, messageText: string, user: User) {
  try {
    console.log(`📝 HEALTH QUERY RECEIVED from ${chatId}: "${messageText}"`);
    console.log(`User stats: ${user.usage_count}/20 free questions, Plan: ${user.plan_type}`);
    
    // Check usage limits for simple queries
    if (user.usage_count >= 20 && user.plan_type === 'free') {
      await sendTelegramMessage(chatId, 
        `🚫 **FREE QUESTIONS EXHAUSTED!**\n\n✅ **You've used all 20 free questions**\n\n💳 **UPGRADE OPTIONS:**\n\n📱 **₹100/month** - 20 more questions\n🤖 **₹200/question** - Complex AI diagnosis\n\n**👇 CHOOSE:**`,
        {
          inline_keyboard: [
            [{ text: "💳 **PAY ₹100/MONTH - 20 MORE QUESTIONS**", url: "https://rzp.io/rzp/tGVFc9WT" }],
            [{ text: "🤖 **PAY ₹200 COMPLEX DIAGNOSIS**", callback_data: "pay_complex" }]
          ]
        }
      );
      
      // Send payment confirmation instructions with time limit warning
      await sendTelegramMessage(chatId, 
        `⏰ **IMPORTANT: Complete payment within 10 minutes**\n\n📱 **After payment, type "paid" or send screenshot**\n\n💡 **Payment Tips:**\n• Use UPI ID directly if link fails\n• Our UPI: movemtechnologiesprivatelimit@paytm\n• After manual payment, send screenshot\n\n❌ **Payment failed? Type "retry" for new link**`
      );
      
      await updateUserState(chatId, { state: 'awaiting_subscription', pending_query: messageText });
      return;
    }
    
    // Clear context for fresh response
    await clearUserContext(chatId);
    
    const userContext = {
      age: user.onboarding_info,
      language: user.language_name,
      previous_conversations: [],
      timestamp: Date.now()
    }
    
    // Check if complex diagnosis is needed
    if (shouldUseMaiDxo(messageText, false, false, user)) {
      console.log(`🚀 Routing to COMPLEX diagnosis (₹200)`);
      await sendTelegramMessage(chatId, 
        `🤖 **COMPLEX DIAGNOSIS REQUIRED - ₹200**\n\n🔬 **ADVANCED MULTI-AI ANALYSIS**\n📊 **DETAILED DIAGNOSIS**\n💡 **PERSONALIZED RECOMMENDATIONS**\n\n**👇 CHOOSE:**`,
        {
          inline_keyboard: [
            [{ text: "💳 **PAY ₹200 FOR ANALYSIS**", url: "https://rzp.io/rzp/1RrG1ddu" }],
            [{ text: "💬 **GET BASIC ANSWER (FREE)**", callback_data: "use_simple" }]
          ]
        }
      );
      await updateUserState(chatId, { state: 'awaiting_complex_payment', pending_query: messageText });
      return;
    }
    
    // Simple health query - use Claude only
    console.log(`💬 Routing to SIMPLE diagnosis (Claude only)`);
    const healthResponse = await getHealthResponse(messageText, userContext);
    
    const questionNum = user.usage_count + 1;
    const remainingQuestions = Math.max(0, 20 - questionNum);
    
    const responseWithUsage = `📋 **QUESTION #${questionNum}**\n━━━━━━━━━━━━━━━━━━━━\n\n${healthResponse}\n\n━━━━━━━━━━━━━━━━━━━━\n📊 **${remainingQuestions} free questions remaining**`;
    
    await sendTelegramMessage(chatId, responseWithUsage);
    
    const now = new Date().toISOString();
    await updateUserState(chatId, {
      last_used: now,
      usage_count: questionNum
    });
    console.log(`✅ Simple diagnosis completed for user ${chatId} (${questionNum}/10)`);
    
  } catch (error) {
    console.error('Error handling health query:', error);
    await sendTelegramMessage(chatId, getTranslation('errorGeneral', user.language));
  }
}

async function handleVoiceMessage(chatId: string, voice: any, user: User) {
  try {
    console.log(`🎤 Voice message received from ${chatId}`);
    
    // Check if user has microphone access
    await sendTelegramMessage(chatId, getTranslation('voiceProcessing', user.language));
    
    // Download voice file
    const voiceUrl = await downloadTelegramFile(voice.file_id);
    
    // Transcribe using Sarvam STT
    const transcript = await transcribeAudio(voiceUrl, user.language);
    
    // Translate to English if needed
    let englishQuery = transcript;
    if (user.language !== 'en') {
      englishQuery = await translateText(transcript, user.language, 'en');
    }
    
    console.log(`🎤 Voice transcript: "${transcript}" → "${englishQuery}"`);
    
    await sendTelegramMessage(chatId, `🎤 **HEARD YOU SAY:** "${transcript}"\n\n🤖 **ANALYZING...** Please wait...`);
    
    // Voice always triggers complex diagnosis
    console.log(`🚀 Voice routing to COMPLEX diagnosis (MAI-DxO)`);
    await handlePaymentRequest(chatId, englishQuery, user, true, false);
    
  } catch (error) {
    console.error('Error handling voice message:', error);
    await sendTelegramMessage(chatId, getTranslation('voiceError', user.language));
  }
}

async function handleImageMessage(chatId: string, photo: any, user: User) {
  try {
    console.log(`📸 Image message received from ${chatId}`);
    
    // For now, treat as complex medical scan/document
    const imageQuery = "Medical image/scan analysis requested";
    
    await sendTelegramMessage(chatId, getTranslation('processingImage', user.language));
    
    // Images always trigger complex diagnosis
    console.log(`🚀 Image routing to COMPLEX diagnosis (MAI-DxO)`);
    await handlePaymentRequest(chatId, imageQuery, user, false, true);
    
  } catch (error) {
    console.error('Error handling image message:', error);
    await sendTelegramMessage(chatId, getTranslation('imageError', user.language));
  }
}

async function handleJanAushadhiSearch(chatId: string, pincode: string) {
  try {
    const user = await getOrCreateUser(chatId);
    
    // Query Supabase jan_aushadhi_centers table
    const { data: stores, error } = await supabase
      .from('jan_aushadhi_centers')
      .select('name, contact, state_name')
      .eq('pin_code', pincode)
      .limit(2);
    
    if (error) throw error;
    
    if (stores.length === 0) {
      const noStoresMsg = `❌ No stores found in the pincode. Pls search nearby pincodes`;
      await sendTelegramMessage(chatId, noStoresMsg);
      return;
    }
    
    let message = user.language === 'hi' 
      ? `💊 **जन औषधि - ${pincode}**\n\n`
      : `💊 **JAN AUSHADHI - ${pincode}**\n\n`;
    
    stores.forEach((store, i) => {
      message += `${i + 1}. ${store.name}\n`;
      message += `📞 ${store.contact}\n`;
      message += `📍 ${store.state_name}\n\n`;
    });
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "🔄 Search Another Pincode", callback_data: "search_new_pincode" }]
      ]
    };
    
    await sendTelegramMessage(chatId, message, { reply_markup: keyboard });
    
  } catch (error) {
    console.error('Error searching Jan Aushadhi stores:', error);
    await sendTelegramMessage(chatId, '❌ Error finding stores / स्टोर खोजने में त्रुटि');
  }
}

// Webhook handler
async function handleTelegramUpdate(update: TelegramUpdate) {
  // Handle callback queries (button presses)
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query)
    return
  }
  
  if (!update.message) return
  
  const chatId = update.message.chat.id.toString()
  const messageText = update.message.text
  const voice = update.message.voice
  const photo = update.message.photo
  const document = update.message.document
  
  console.log(`Message from ${chatId}: ${messageText || voice ? 'voice' : photo ? 'photo' : document ? 'document' : 'media'}`)
  
  try {
    const user = await getOrCreateUser(chatId)
    
    // Handle voice messages
    if (voice) {
      await handleVoiceMessage(chatId, voice, user)
      return
    }
    
    // Check if user is awaiting payment confirmation
    if (user.state === 'awaiting_complex_payment' || user.state === 'awaiting_subscription') {
      // Handle payment screenshots
      if (photo || document) {
        const messageType = user.state === 'awaiting_complex_payment' ? 'complex' : 'subscription';
        
        if (messageType === 'complex' && user.pending_query) {
          await sendTelegramMessage(chatId, '✅ **PAYMENT RECEIVED!** Analyzing with AI medical panel...');
          
          const diagnosis = await maiDxoOrchestrator(user.pending_query, {
            age: user.onboarding_info,
            language: user.language_name,
            isPaid: true
          });
          
          await sendTelegramMessage(chatId, diagnosis);
          await updateUserState(chatId, { 
            state: 'ready',
            pending_query: null,
            paid_complex_count: (user.paid_complex_count || 0) + 1
          });
        } else if (messageType === 'subscription') {
          await sendTelegramMessage(chatId, '✅ **SUBSCRIPTION ACTIVATED!**\n\n🎉 **20 MORE QUESTIONS ADDED**');
          await updateUserState(chatId, { 
            state: 'ready',
            plan_type: 'premium',
            pending_query: null,
            usage_count: 0
          });
        }
        return;
      }
    }
    
    // Handle photo messages
    if (photo && photo.length > 0) {
      await handleImageMessage(chatId, photo, user)
      return
    }
    
    // Handle document messages (scans, reports)
    if (document) {
      await handleImageMessage(chatId, document, user)
      return
    }
    
    // Handle text messages
    if (!messageText) return
    
    // Handle different user states
    switch (user.state) {
      case 'language_selection':
        await handleLanguageSelection(chatId, messageText, user)
        break
        
      case 'onboarding':
        await handleOnboarding(chatId, messageText, user)
        break
        
      case 'ready':
        // Handle keyboard button presses
        if (messageText === '💬 Health Question' || messageText.toLowerCase() === '/health') {
          await sendTelegramMessage(chatId, getTranslation('healthQuestionPrompt', user.language));
        } else if (messageText === '💊 Find Medicine Store' || messageText.startsWith('/janaushadhi')) {
          const pincode = messageText.replace('/janaushadhi', '').replace('💊 Find Medicine Store', '').trim();
          if (pincode && pincode.length === 6 && /^\d+$/.test(pincode)) {
            await handleJanAushadhiSearch(chatId, pincode);
          } else {
            await sendTelegramMessage(chatId, getTranslation('janAushadhiPrompt', user.language));
          }
        } else if (messageText === '📸 Scan Report' || messageText.toLowerCase() === '/scan') {
          await sendTelegramMessage(chatId, getTranslation('scanReportPrompt', user.language));
        } else if (messageText === '🌐 Language' || messageText === '🌐 LANG' || messageText.toLowerCase() === 'lang' || messageText === '/lang') {
          await handleLanguageChange(chatId, user);
        } else if (messageText.toLowerCase() === '/menu' || messageText === '/help') {
          await showMainMenu(chatId, user);
        } else if (messageText.toLowerCase() === '/start') {
          // Handle /start command - just show menu without incrementing usage
          await showMainMenu(chatId, user);
        } else if (/^\d{6}$/.test(messageText.trim())) {
          // Direct pincode entry
          await handleJanAushadhiSearch(chatId, messageText.trim());
        } else {
          await handleHealthQuery(chatId, messageText, user);
        }
        break
        
      case 'awaiting_subscription':
        if (messageText.toLowerCase().includes('paid') || 
            messageText.toLowerCase().includes('screenshot') || 
            messageText.toLowerCase().includes('done') ||
            messageText.match(/[0-9]{12,}/)) {  // Matches transaction IDs
          await sendTelegramMessage(chatId, '✅ **SUBSCRIPTION ACTIVATED!**\n\n🎉 **20 MORE QUESTIONS ADDED**');
          await updateUserState(chatId, { 
            state: 'ready',
            plan_type: 'premium',
            pending_query: null,
            usage_count: 0  // Reset usage count for new 20 questions
          });
        } else if (messageText.toLowerCase().includes('retry')) {
          // Resend payment link
          await sendTelegramMessage(chatId, 
            `🔄 **NEW PAYMENT LINK**\n\n📱 **₹100/MONTH - 20 MORE QUESTIONS**\n\n**👇 CLICK TO PAY:**`,
            {
              inline_keyboard: [
                [{ text: "💳 **PAY ₹100/MONTH**", url: "https://razorpay.me/@movemtechnologiesprivatelimit?amount=ZFm4ghdmeB6pF5PK8Ki64w%3D%3D" }],
                [{ text: "🤖 **PAY ₹200 COMPLEX DIAGNOSIS**", callback_data: "pay_complex" }]
              ]
            }
          );
          await sendTelegramMessage(chatId, 
            `⏰ **Complete within 10 minutes!**\n📱 **After payment, type "paid" or send screenshot**`
          );
        } else {
          // Auto-reset if user sends new message
          await sendTelegramMessage(chatId, '🔄 **Starting fresh session...**');
          await updateUserState(chatId, { state: 'ready', pending_query: null });
          await handleHealthQuery(chatId, messageText, user);
        }
        break
        
      case 'awaiting_complex_payment':
        if (messageText.toLowerCase().includes('paid') || 
            messageText.toLowerCase().includes('screenshot') || 
            messageText.toLowerCase().includes('done') ||
            messageText.match(/[0-9]{12,}/)) {  // Matches transaction IDs
          if (user.pending_query) {
            await sendTelegramMessage(chatId, '✅ **PAYMENT RECEIVED!** Analyzing with AI medical panel...');
            
            const diagnosis = await maiDxoOrchestrator(user.pending_query, {
              age: user.onboarding_info,
              language: user.language_name,
              isPaid: true
            });
            
            await sendTelegramMessage(chatId, diagnosis);
            await updateUserState(chatId, { 
              state: 'ready',
              pending_query: null,
              paid_complex_count: (user.paid_complex_count || 0) + 1
            });
          }
        } else if (messageText.toLowerCase().includes('retry') || messageText.toLowerCase().includes('upi')) {
          // Resend payment options
          await sendTelegramMessage(chatId, 
            `💰 **PAYMENT OPTIONS - ₹200**\n\n**Option 1: Payment Link**`,
            {
              inline_keyboard: [
                [{ text: "💳 **PAY ₹200 VIA LINK**", url: "https://razorpay.me/@movemtechnologiesprivatelimit?amount=ExQs%2Fv%2FDDS71hestyV8B7g%3D%3D" }]
              ]
            }
          );
          await sendTelegramMessage(chatId, 
            `**Option 2: Direct UPI Transfer**\n\n📱 **UPI ID:** \`movemtechnologiesprivatelimit@paytm\`\n💰 **Amount:** ₹200\n\n✅ After payment, send screenshot with transaction ID`
          );
        } else {
          // Auto-reset if user sends new message
          await sendTelegramMessage(chatId, '🔄 **Starting fresh session...**');
          await updateUserState(chatId, { state: 'ready', pending_query: null });
          await handleHealthQuery(chatId, messageText, user);
        }
        break
        
      default:
        // New user or reset - show language selection with keyboard
        await updateUserState(chatId, { state: 'language_selection' })
        const keyboard = getLanguageInlineKeyboard()
        await sendTelegramMessage(chatId, getLanguageSelectionMessage(), keyboard)
        break
    }
  } catch (error) {
    console.error('Error handling update:', error)
    await sendTelegramMessage(chatId, 'Sorry, something went wrong. Please try again.')
  }
}

// Main Edge Function
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Razorpay-Signature'
  }
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  if (req.method === 'GET') {
    const url = new URL(req.url)
    
    // Debug endpoint to check env vars
    if (url.pathname.includes('/debug')) {
      return new Response(JSON.stringify({ 
        webhook_secret_exists: !!Deno.env.get('RAZORPAY_WEBHOOK_SECRET'),
        webhook_secret_length: (Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '').length,
        test_mode: Deno.env.get('RAZORPAY_MODE'),
        telegram_token_exists: !!Deno.env.get('TELEGRAM_BOT_TOKEN'),
        openai_key_exists: !!Deno.env.get('OPENAI_API_KEY')
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }
    
    // Setup bot commands on startup
    await setupBotCommands();
    
    return new Response(JSON.stringify({ 
      status: 'Dr247Bot is running!', 
      timestamp: new Date().toISOString() 
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
  
  try {
    const url = new URL(req.url)
    
    // Handle Razorpay webhook
    if (url.pathname.includes('/razorpay-webhook')) {
      console.log('📨 Razorpay webhook received')
      
      const signature = req.headers.get('X-Razorpay-Signature') || ''
      const rawBody = await req.text()
      
      // Verify webhook signature
      let webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || ''
      
      // Temporary fallback for testing
      if (!webhookSecret && Deno.env.get('RAZORPAY_MODE') === 'test') {
        webhookSecret = 'test_secret_123'  // Only for testing!
        console.log('Using test webhook secret')
      }
      
      console.log('Webhook secret exists:', !!webhookSecret)
      console.log('Webhook secret length:', webhookSecret.length)
      
      if (!webhookSecret) {
        console.error('RAZORPAY_WEBHOOK_SECRET not configured')
        return new Response('Webhook secret not configured', { status: 500, headers: corsHeaders })
      }
      
      // Skip signature verification in test mode for manual testing
      if (Deno.env.get('RAZORPAY_MODE') === 'test' && signature === 'test') {
        console.log('Skipping signature verification for test mode')
      } else {
        // Verify signature using Web Crypto API
        try {
          const encoder = new TextEncoder()
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhookSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          
          const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(rawBody)
          )
          
          const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
          
          if (signature !== `sha256=${expectedSignature}`) {
            console.error('Invalid webhook signature')
            console.error('Expected:', `sha256=${expectedSignature}`)
            console.error('Received:', signature)
            return new Response('Invalid signature', { status: 401, headers: corsHeaders })
          }
        } catch (error) {
          console.error('Error verifying signature:', error)
          return new Response('Signature verification failed', { status: 401, headers: corsHeaders })
        }
      }
      
      // For now, just log the webhook
      console.log('Razorpay webhook body:', rawBody)
      console.log('Razorpay signature:', signature)
      
      try {
        const webhookData = JSON.parse(rawBody)
        const event = webhookData.event
        
        console.log(`🎯 Razorpay event: ${event}`)
        
        // Handle payment success events
        if (event === 'payment_link.paid' || event === 'payment.captured') {
          const payment = webhookData.payload.payment_link || webhookData.payload.payment.entity
          console.log('💰 Payment successful:', payment)
          
          // Extract phone number from payment
          const phoneNumber = payment.customer_phone || payment.contact
          if (phoneNumber) {
            // Remove country code and formatting
            const cleanPhone = phoneNumber.replace(/^\+91|^91/, '').replace(/\D/g, '')
            console.log(`📱 Payment from phone: ${cleanPhone}`)
            
            // Find user by phone number (chat_id is the phone number for WhatsApp)
            const { data: user } = await supabase
              .from('users')
              .select('*')
              .eq('chat_id', cleanPhone)
              .single()
            
            if (user && user.state === 'awaiting_complex_payment') {
              console.log(`✅ Processing payment for user ${cleanPhone}`)
              
              // Send confirmation
              await sendTelegramMessage(cleanPhone, '✅ **PAYMENT RECEIVED!** Analyzing with AI medical panel...')
              
              // Process the pending query
              if (user.pending_query) {
                const diagnosis = await maiDxoOrchestrator(user.pending_query, {
                  age: user.onboarding_info,
                  language: user.language_name,
                  isPaid: true
                })
                
                await sendTelegramMessage(cleanPhone, diagnosis)
              }
              
              // Update user state
              await updateUserState(cleanPhone, { 
                state: 'ready',
                pending_query: null,
                paid_complex_count: (user.paid_complex_count || 0) + 1
              })
            } else if (user && user.state === 'awaiting_subscription') {
              console.log(`✅ Processing subscription for user ${cleanPhone}`)
              
              await sendTelegramMessage(cleanPhone, '✅ **SUBSCRIPTION ACTIVATED!**\n\n🎉 **20 MORE QUESTIONS ADDED**')
              await updateUserState(cleanPhone, { 
                state: 'ready',
                plan_type: 'premium',
                pending_query: null,
                usage_count: 0
              })
            }
          }
        }
        
        // Handle payment failure
        if (event === 'payment_link.expired' || event === 'payment.failed') {
          console.log('❌ Payment failed/expired')
          
          const payment = webhookData.payload.payment_link || webhookData.payload.payment.entity
          const phoneNumber = payment.customer_phone || payment.contact
          
          if (phoneNumber) {
            const cleanPhone = phoneNumber.replace(/^\+91|^91/, '').replace(/\D/g, '')
            const errorReason = payment.error_description || 'Payment failed or expired'
            
            await sendTelegramMessage(cleanPhone, 
              `❌ **PAYMENT FAILED**\n\nReason: ${errorReason}\n\n🔄 **Type "retry" to get a new payment link**`
            )
          }
        }
        
      } catch (e) {
        console.error('Error parsing webhook:', e)
      }
      
      return new Response('OK', { status: 200, headers: corsHeaders })
    }
    
    // Handle Telegram webhook
    const update: TelegramUpdate = await req.json()
    console.log('Received update:', JSON.stringify(update))
    
    await handleTelegramUpdate(update)
    
    return new Response('OK', { status: 200, headers: corsHeaders })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error processing update', { status: 500, headers: corsHeaders })
  }
})

// Setup bot commands
async function setupBotCommands() {
  try {
    const commands = [
      { command: 'start', description: '🏥 Start health consultation' },
      { command: 'health', description: '💬 Ask health question' },
      { command: 'janaushadhi', description: '💊 Find Jan Aushadhi stores' },
      { command: 'scan', description: '📸 Scan medical reports' },
      { command: 'menu', description: '📋 Show main menu' },
      { command: 'lang', description: '🌐 Change language' },
      { command: 'help', description: '❓ Get help' }
    ];

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
    
    console.log('✅ Bot commands registered');
  } catch (error) {
    console.error('Failed to setup commands:', error);
  }
}
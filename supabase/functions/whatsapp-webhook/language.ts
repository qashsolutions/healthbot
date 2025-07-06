import { LANGUAGES, SVG_ICONS } from './constants.ts'

// Get icon helper
export function getIcon(name: keyof typeof SVG_ICONS): string {
  return SVG_ICONS[name] || '●'
}

// Language translations
export const TRANSLATIONS = {
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
  
  welcomeMessage: {
    'hi': `🙏 **नमस्ते!** मैं आपका AI हेल्थ असिस्टेंट हूं।\n\n💊 **मैं आपकी मदद कर सकता हूं:**\n• लक्षणों का विश्लेषण\n• दवाओं की जानकारी\n• स्वास्थ्य सलाह\n• जन औषधि स्टोर खोजें\n\n**शुरू करने के लिए अपना प्रश्न टाइप करें या मेनू देखें।**`,
    'en': `🙏 **Hello!** I'm your AI Health Assistant.\n\n💊 **I can help with:**\n• Symptom analysis\n• Medicine information\n• Health advice\n• Find Jan Aushadhi stores\n\n**Type your question or view menu to start.**`,
    'ta': `🙏 **வணக்கம்!** நான் உங்கள் AI சுகாதார உதவியாளர்.\n\n💊 **நான் உதவ முடியும்:**\n• அறிகுறி பகுப்பாய்வு\n• மருந்து தகவல்\n• சுகாதார ஆலோசனை\n• ஜன் ஔஷதி கடைகளைக் கண்டுபிடிக்கவும்\n\n**உங்கள் கேள்வியை டைப் செய்யவும் அல்லது மெனுவைப் பார்க்கவும்.**`,
    'te': `🙏 **నమస్తే!** నేను మీ AI ఆరోగ్య సహాయకుడిని.\n\n💊 **నేను సహాయం చేయగలను:**\n• లక్షణ విశ్లేషణ\n• ఔషధ సమాచారం\n• ఆరోగ్య సలహా\n• జన్ ఔషధి దుకాణాలను కనుగొనండి\n\n**మీ ప్రశ్నను టైప్ చేయండి లేదా మెనుని చూడండి.**`,
    'kn': `🙏 **ನಮಸ್ತೆ!** ನಾನು ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕ.\n\n💊 **ನಾನು ಸಹಾಯ ಮಾಡಬಹುದು:**\n• ರೋಗಲಕ್ಷಣ ವಿಶ್ಲೇಷಣೆ\n• ಔಷಧಿ ಮಾಹಿತಿ\n• ಆರೋಗ್ಯ ಸಲಹೆ\n• ಜನ ಔಷಧಿ ಅಂಗಡಿಗಳನ್ನು ಹುಡುಕಿ\n\n**ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮೆನು ನೋಡಿ.**`,
    'ml': `🙏 **നമസ്തേ!** ഞാൻ നിങ്ങളുടെ AI ആരോഗ്യ സഹായിയാണ്.\n\n💊 **എനിക്ക് സഹായിക്കാൻ കഴിയും:**\n• രോഗലക്ഷണ വിശകലനം\n• മരുന്ന് വിവരങ്ങൾ\n• ആരോഗ്യ ഉപദേശം\n• ജൻ ഔഷധി സ്റ്റോറുകൾ കണ്ടെത്തുക\n\n**നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ മെനു കാണുക.**`,
    'bn': `🙏 **নমস্কার!** আমি আপনার AI স্বাস্থ্য সহায়ক।\n\n💊 **আমি সাহায্য করতে পারি:**\n• লক্ষণ বিশ্লেষণ\n• ওষুধের তথ্য\n• স্বাস্থ্য পরামর্শ\n• জন ঔষধি দোকান খুঁজুন\n\n**আপনার প্রশ্ন টাইপ করুন বা মেনু দেখুন।**`,
    'gu': `🙏 **નમસ્તે!** હું તમારો AI હેલ્થ આસિસ્ટન્ટ છું.\n\n💊 **હું મદદ કરી શકું છું:**\n• લક્ષણ વિશ્લેષણ\n• દવાની માહિતી\n• આરોગ્ય સલાહ\n• જન ઔષધિ સ્ટોર શોધો\n\n**તમારો પ્રશ્ન ટાઇપ કરો અથવા મેનુ જુઓ.**`,
    'mr': `🙏 **नमस्कार!** मी तुमचा AI आरोग्य सहाय्यक आहे.\n\n💊 **मी मदत करू शकतो:**\n• लक्षण विश्लेषण\n• औषध माहिती\n• आरोग्य सल्ला\n• जन औषधी स्टोअर शोधा\n\n**तुमचा प्रश्न टाइप करा किंवा मेनू पहा.**`,
    'pa': `🙏 **ਸਤ ਸ੍ਰੀ ਅਕਾਲ!** ਮੈਂ ਤੁਹਾਡਾ AI ਸਿਹਤ ਸਹਾਇਕ ਹਾਂ।\n\n💊 **ਮੈਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ:**\n• ਲੱਛਣ ਵਿਸ਼ਲੇਸ਼ਣ\n• ਦਵਾਈ ਦੀ ਜਾਣਕਾਰੀ\n• ਸਿਹਤ ਸਲਾਹ\n• ਜਨ ਔਸ਼ਧੀ ਸਟੋਰ ਲੱਭੋ\n\n**ਆਪਣਾ ਸਵਾਲ ਟਾਈਪ ਕਰੋ ਜਾਂ ਮੀਨੂ ਵੇਖੋ।**`
  },
  
  onboardingPrompt: {
    'hi': '🎂 **आपकी उम्र बताएं** (जैसे: 25):',
    'en': '🎂 **Please enter your age** (e.g., 25):',
    'ta': '🎂 **உங்கள் வயதை உள்ளிடவும்** (எ.கா: 25):',
    'te': '🎂 **దయచేసి మీ వయస్సు నమోదు చేయండి** (ఉదా: 25):',
    'kn': '🎂 **ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ** (ಉದಾ: 25):',
    'ml': '🎂 **ദയവായി നിങ്ങളുടെ പ്രായം നൽകുക** (ഉദാ: 25):',
    'bn': '🎂 **আপনার বয়স লিখুন** (যেমন: 25):',
    'gu': '🎂 **કૃપા કરીને તમારી ઉંમર દાખલ કરો** (દા.ત.: 25):',
    'mr': '🎂 **कृपया तुमचे वय प्रविष्ट करा** (उदा: 25):',
    'pa': '🎂 **ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਉਮਰ ਦਾਖਲ ਕਰੋ** (ਉਦਾ: 25):'
  }
}

// Get translation helper
export function getTranslation(key: string, language: string): string {
  const translations = TRANSLATIONS[key as keyof typeof TRANSLATIONS]
  if (!translations) return 'Translation not found'
  return translations[language as keyof typeof translations] || translations['en']
}

// Get language selection message
export function getLanguageSelectionMessage(): string {
  return `🌐 **Choose Your Language / अपनी भाषा चुनें**

Select from the buttons below:
नीचे दिए गए बटनों से चुनें:`
}

// Get language inline keyboard
export function getLanguageInlineKeyboard(): any {
  const keyboard = []
  for (let i = 0; i < LANGUAGES.length; i += 2) {
    const row = []
    row.push({
      text: `${LANGUAGES[i].flag} ${LANGUAGES[i].name}`,
      callback_data: `lang_${LANGUAGES[i].code}`
    })
    if (i + 1 < LANGUAGES.length) {
      row.push({
        text: `${LANGUAGES[i + 1].flag} ${LANGUAGES[i + 1].name}`,
        callback_data: `lang_${LANGUAGES[i + 1].code}`
      })
    }
    keyboard.push(row)
  }
  return { reply_markup: { inline_keyboard: keyboard } }
}
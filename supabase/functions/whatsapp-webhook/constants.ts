// Environment variables and configuration
export const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
export const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
export const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Payment configurations
export const PAYMENT_AMOUNTS = {
  COMPLEX_DIAGNOSIS: {
    amount: 200,
    url: 'https://razorpay.me/@movemtechnologiesprivatelimit?amount=ExQs%2Fv%2FDDS71hestyV8B7g%3D%3D'
  },
  MONTHLY_SUBSCRIPTION: {
    amount: 100,
    url: 'https://razorpay.me/@movemtechnologiesprivatelimit?amount=ZFm4ghdmeB6pF5PK8Ki64w%3D%3D'
  }
}

// Usage limits
export const FREE_USAGE_LIMIT = 20
export const FREE_COMPLEX_LIMIT = 2

// User states
export const USER_STATES = {
  LANGUAGE_SELECTION: 'language_selection',
  ONBOARDING: 'onboarding',
  READY: 'ready',
  AWAITING_SUBSCRIPTION: 'awaiting_subscription',
  AWAITING_COMPLEX_PAYMENT: 'awaiting_complex_payment',
  AWAITING_PINCODE: 'awaiting_pincode'
} as const

// Languages configuration
export const LANGUAGES = [
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' }
]

// SVG Icons
export const SVG_ICONS = {
  'heart': '❤️',
  'medicine': '💊',
  'doctor': '👨‍⚕️',
  'hospital': '🏥',
  'emergency': '🚨',
  'phone': '📞',
  'info': 'ℹ️',
  'warning': '⚠️',
  'check': '✅',
  'cross': '❌',
  'money': '💰',
  'location': '📍',
  'search': '🔍',
  'clock': '⏰',
  'chat': '💬',
  'voice': '🎤',
  'photo': '📷',
  'menu': '📋',
  'help': '🆘',
  'home': '🏠',
  'back': '⬅️',
  'forward': '➡️',
  'up': '⬆️',
  'down': '⬇️',
  'question': '❓',
  'exclamation': '❗',
  'lightbulb': '💡',
  'stethoscope': '🩺',
  'pill': '💊',
  'syringe': '💉',
  'test_tube': '🧪',
  'microscope': '🔬',
  'thermometer': '🌡️',
  'bandage': '🩹',
  'wheelchair': '🦽',
  'ambulance': '🚑',
  'dna': '🧬',
  'brain': '🧠',
  'lung': '🫁',
  'eye': '👁️',
  'ear': '👂',
  'tooth': '🦷',
  'bone': '🦴',
  'muscle': '💪',
  'drop_of_blood': '🩸',
  'virus': '🦠',
  'face_mask': '😷',
  'lab_coat': '🥼',
  'medical_record': '📋',
  'prescription': '📄',
  'calendar': '📅',
  'stopwatch': '⏱️',
  'alarm': '⏰',
  'shield': '🛡️',
  'ribbon': '🎗️',
  'herbs': '🌿',
  'meditation': '🧘',
  'sleep': '😴',
  'nutrition': '🥗',
  'water': '💧',
  'fire': '🔥',
  'ice': '🧊',
  'sun': '☀️',
  'moon': '🌙',
  'star': '⭐',
  'error': '❌'
}
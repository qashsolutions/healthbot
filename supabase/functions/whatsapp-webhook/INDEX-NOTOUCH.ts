// Convert to FormData for Sarvam API
    const formData = new FormData();import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
  paid_complex_count: number
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

// MAI-DxO Orchestrator - Multi-Agent Diagnostic System
async function maiDxoOrchestrator(query: string, userContext: any): Promise<string> {
  try {
    console.log(`🤖 Starting MAI-DxO orchestrator for query: "${query}"`);
    
    // Virtual panel of 5 specialist physicians
    const specialists = [
      { role: "Dr. Hypothesis", focus: "differential diagnosis with probability ranking" },
      { role: "Dr. Test-Chooser", focus: "selecting optimal diagnostic tests" },
      { role: "Dr. Challenger", focus: "identifying bias and contradictory evidence" },
      { role: "Dr. Synthesizer", focus: "integrating all findings" },
      { role: "Dr. Cost-Optimizer", focus: "minimizing unnecessary tests" }
    ];

    const responses = [];
    
    // Get responses from multiple AI models (ensemble approach)
    console.log(`📡 Getting Claude response...`);
    const claudeResponse = await getClaudeResponse(query, userContext, specialists);
    responses.push(claudeResponse);
    
    console.log(`📡 Getting OpenAI response...`);
    const openaiResponse = await getOpenAIResponse(query, userContext, specialists);
    responses.push(openaiResponse);
    
    console.log(`📡 Getting Gemini response...`);
    const geminiResponse = await getGeminiResponse(query, userContext, specialists);
    responses.push(geminiResponse);
    
    // Synthesize final diagnosis from all models
    console.log(`🔬 Synthesizing final diagnosis...`);
    const finalDiagnosis = await synthesizeDiagnosis(responses, query, userContext);
    
    return finalDiagnosis;
  } catch (error) {
    console.error('Error in MAI-DxO:', error);
    // Fallback to Claude only if multi-AI fails
    return await getHealthResponse(query, userContext);
  }
}

async function getClaudeResponse(query: string, context: any, specialists: any[]): Promise<string> {
  const prompt = `You are part of a virtual medical panel. ${specialists.map(s => s.role + ": " + s.focus).join(", ")}
  
Patient query: ${query}
Context: ${JSON.stringify(context)}

Provide structured analysis:
1. DIFFERENTIAL DIAGNOSIS (top 3 with probabilities)
2. RECOMMENDED TESTS (most informative, cost-effective)
3. RISK ASSESSMENT
4. NEXT STEPS

Be thorough but cost-conscious.`;

  return await getHealthResponse(prompt, context);
}

async function getOpenAIResponse(query: string, context: any, specialists: any[]): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a specialist physician in a diagnostic panel. Provide detailed medical analysis with differential diagnosis, test recommendations, and cost considerations.'
          },
          {
            role: 'user',
            content: `Patient query: ${query}\nContext: ${JSON.stringify(context)}`
          }
        ],
        max_tokens: 1000
      })
    });
    
    const result = await response.json();
    
    // Better error handling
    if (result.error) {
      console.error('OpenAI API error:', result.error);
      return 'OpenAI analysis unavailable: ' + result.error.message;
    }
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error('OpenAI unexpected response structure:', result);
      return 'OpenAI analysis unavailable: unexpected response';
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'OpenAI analysis unavailable';
  }
}

async function getGeminiResponse(query: string, context: any, specialists: any[]): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `As a medical specialist, analyze this case: ${query}\nContext: ${JSON.stringify(context)}\nProvide differential diagnosis, test recommendations, and cost analysis.`
          }]
        }]
      })
    });
    
    const result = await response.json();
    
    // Better error handling
    if (result.error) {
      console.error('Gemini API error:', result.error);
      return 'Gemini analysis unavailable: ' + result.error.message;
    }
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
      console.error('Gemini unexpected response structure:', result);
      return 'Gemini analysis unavailable: unexpected response';
    }
    
    return result.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Gemini analysis unavailable';
  }
}

async function synthesizeDiagnosis(responses: string[], query: string, context: any): Promise<string> {
  const synthesisPrompt = `You are the lead physician synthesizing opinions from a medical panel.

Panel responses:
${responses.map((r, i) => `Specialist ${i + 1}: ${r}`).join('\n\n')}

Original query: ${query}

Synthesize into a final diagnostic assessment:
1. CONSENSUS DIAGNOSIS with confidence level
2. KEY TESTS RECOMMENDED (prioritized by value)
3. IMMEDIATE ACTIONS
4. COST ESTIMATE
5. FOLLOW-UP PLAN

⚠️ IMPORTANT: This is advanced AI analysis. Always consult qualified medical professionals for actual diagnosis and treatment.

Credit: This analysis uses Microsoft's MAI-DxO methodology (Sequential Diagnosis with Language Models, Nori et al., 2025)`;

  return await getHealthResponse(synthesisPrompt, context);
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
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
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
  console.log(`User usage: ${user.usage_count}/10 free questions used`);
  
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
    'hi': '📋 **मुख्य मेनू**\n\n🩺 **DR247 AI स्वास्थ्य सहायक**',
    'ta': '📋 **முதன்மை மெனு**\n\n🩺 **DR247 AI உடல்நல உதவியாளர்**',
    'te': '📋 **ప్రధాన మెనూ**\n\n🩺 **DR247 AI ఆరోగ్య సహాయకుడు**',
    'kn': '📋 **ಮುಖ್ಯ ಮೆನು**\n\n🩺 **DR247 AI ಆರೋಗ್ಯ ಸಹಾಯಕ**',
    'ml': '📋 **പ്രധാന മെനു**\n\n🩺 **DR247 AI ആരോഗ്യ സഹായി**',
    'bn': '📋 **প্রধান মেনু**\n\n🩺 **DR247 AI স্বাস্থ্য সহায়ক**',
    'gu': '📋 **મુખ્ય મેનુ**\n\n🩺 **DR247 AI આરોગ્ય સહાયક**',
    'mr': '📋 **मुख्य मेनू**\n\n🩺 **DR247 AI आरोग्य सहाय्यक**',
    'pa': '📋 **ਮੁੱਖ ਮੀਨੂ**\n\n🩺 **DR247 AI ਸਿਹਤ ਸਹਾਇਕ**',
    'en': '📋 **MAIN MENU**\n\n🩺 **DR247 AI HEALTH ASSISTANT**'
  };

  const menuMsg = menuMessages[user.language] || menuMessages['en'];

  const keyboard = {
    keyboard: [
      [{ text: '💬 Health Question' }, { text: '💊 Find Medicine Store' }],
      [{ text: '📸 Scan Report' }, { text: '🌐 Language' }],
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
8️⃣ Gujarati (ગুজરાতী)
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
    await sendTelegramMessage(chatId, '❌ **INVALID CHOICE!**\n\n👆 **TAP A BUTTON BELOW OR TYPE 1-10:**', keyboard)
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
        if (user.usage_count >= 10 && user.plan_type === 'free') {
          await sendTelegramMessage(chatId, '🚫 **NO FREE QUESTIONS LEFT!** Please upgrade to continue.');
          return;
        }
        
        const simpleResponse = await getHealthResponse(user.pending_query, {
          age: user.onboarding_info,
          language: user.language_name
        });
        
        const questionNum = user.usage_count + 1;
        const remainingQuestions = Math.max(0, 10 - questionNum);
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
      const offset = parseInt(parts[3]);
      await handleJanAushadhiSearch(chatId, pincode, offset);
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
      [{ text: '📸 Scan Report' }, { text: '🌐 Language' }]
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
  console.log(`User: ${chatId}, Free used: ${user.free_complex_used}`);
  
  // Clear context for fresh response
  await clearUserContext(chatId);
  
  if (!user.free_complex_used) {
    // First complex diagnosis is free
    console.log(`🆓 Providing FREE complex diagnosis for user ${chatId}`);
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
      paid_complex_count: 0
    });
    console.log(`✅ Free complex diagnosis completed for user ${chatId}`);
  } else {
    // Paid diagnosis required
    console.log(`💳 Requesting payment for user ${chatId}`);
    await sendTelegramMessage(chatId, 
      `💰 **COMPLEX AI DIAGNOSIS - ₹500**\n\n🔬 **ADVANCED MULTI-AI MEDICAL PANEL ANALYSIS**\n📊 **DIFFERENTIAL DIAGNOSIS WITH PROBABILITY RANKING**\n🩺 **OPTIMIZED TEST RECOMMENDATIONS**\n💡 **COST-EFFECTIVE CARE PATHWAY**\n\n**👇 CHOOSE AN OPTION:**`,
      {
        inline_keyboard: [
          [{ text: "💳 **PAY ₹500 FOR FULL ANALYSIS**", url: "https://razorpay.me/@movemtechnologiesprivatelimit?amount=50000" }],
          [{ text: "💬 **GET BASIC GUIDANCE (FREE)**", callback_data: "skip_payment" }]
        ]
      }
    );
    
    // Set user state to awaiting payment
    await updateUserState(chatId, { state: 'awaiting_payment', pending_query: query });
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
    console.log(`User stats: ${user.usage_count}/10 free questions, Plan: ${user.plan_type}`);
    
    // Check usage limits for simple queries
    if (user.usage_count >= 10 && user.plan_type === 'free') {
      await sendTelegramMessage(chatId, 
        `🚫 **FREE QUESTIONS EXHAUSTED!**\n\n✅ **You've used all 10 free questions**\n\n💳 **UPGRADE OPTIONS:**\n\n📱 **₹100/month** - Unlimited simple questions\n🤖 **₹200/question** - Complex AI diagnosis\n\n**👇 CHOOSE:**`,
        {
          inline_keyboard: [
            [{ text: "💳 **PAY ₹100/MONTH UNLIMITED**", url: "https://razorpay.me/@movemtechnologiesprivatelimit?amount=10000" }],
            [{ text: "🤖 **PAY ₹200 COMPLEX DIAGNOSIS**", callback_data: "pay_complex" }]
          ]
        }
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
            [{ text: "💳 **PAY ₹200 FOR ANALYSIS**", url: "https://razorpay.me/@movemtechnologiesprivatelimit?amount=20000" }],
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
    const remainingQuestions = Math.max(0, 10 - questionNum);
    
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
    const errorMsg = user.language === 'hi'
      ? '❌ **समस्या हुई!** कृपया दोबारा कोशिश करें।'
      : '❌ **ERROR!** Please try again.';
    
    await sendTelegramMessage(chatId, errorMsg);
  }
}

async function handleVoiceMessage(chatId: string, voice: any, user: User) {
  try {
    console.log(`🎤 Voice message received from ${chatId}`);
    
    // Check if user has microphone access
    await sendTelegramMessage(chatId, '🎤 **PROCESSING YOUR VOICE MESSAGE...**\n\n⚠️ **If you cannot record voice:**\n🔊 **Enable microphone permission**\n📱 **Check phone settings**');
    
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
    const msg = user.language === 'hi'
      ? '❌ **वॉइस प्रोसेसिंग में समस्या!**\n\n🔧 **कृपया सुनिश्चित करें:**\n🎤 **माइक्रोफोन चालू है**\n🔊 **आवाज़ साफ़ है**\n📱 **नेटवर्क कनेक्शन ठीक है**\n\n🔄 **दोबारा कोशिश करें**'
      : '❌ **VOICE PROCESSING ERROR!**\n\n🔧 **PLEASE CHECK:**\n🎤 **MICROPHONE IS ENABLED**\n🔊 **SPEAK CLEARLY**\n📱 **NETWORK CONNECTION IS GOOD**\n\n🔄 **TRY AGAIN**';
    
    await sendTelegramMessage(chatId, msg);
  }
}

async function handleImageMessage(chatId: string, photo: any, user: User) {
  try {
    console.log(`📸 Image message received from ${chatId}`);
    
    // For now, treat as complex medical scan/document
    const imageQuery = "Medical image/scan analysis requested";
    
    await sendTelegramMessage(chatId, '📸 Processing your medical image...');
    
    // Images always trigger complex diagnosis
    console.log(`🚀 Image routing to COMPLEX diagnosis (MAI-DxO)`);
    await handlePaymentRequest(chatId, imageQuery, user, false, true);
    
  } catch (error) {
    console.error('Error handling image message:', error);
    const msg = user.language === 'hi'
      ? 'इमेज प्रोसेस करने में समस्या हुई। कृपया दोबारा कोशिश करें।'
      : 'Error processing image. Please try again.';
    
    await sendTelegramMessage(chatId, msg);
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
          await sendTelegramMessage(chatId, '🩺 **ASK YOUR HEALTH QUESTION:**\n\nType your symptoms or health concern...');
        } else if (messageText === '💊 Find Medicine Store' || messageText.startsWith('/janaushadhi')) {
          const pincode = messageText.replace('/janaushadhi', '').replace('💊 Find Medicine Store', '').trim();
          if (pincode && pincode.length === 6 && /^\d+$/.test(pincode)) {
            await handleJanAushadhiSearch(chatId, pincode);
          } else {
            await sendTelegramMessage(chatId, '💊 **FIND JAN AUSHADHI STORES**\n\n📍 **Enter your 6-digit pincode:**\n\nExample: 110001');
          }
        } else if (messageText === '📸 Scan Report' || messageText.toLowerCase() === '/scan') {
          await sendTelegramMessage(chatId, '📸 **SCAN MEDICAL REPORT**\n\n📷 **Send photo of your:**\n• Lab reports\n• Prescription\n• Medical documents\n\n🔬 **We\'ll analyze it for FREE!**');
        } else if (messageText === '🌐 Language' || messageText.toLowerCase() === 'lang' || messageText === '/lang') {
          await handleLanguageChange(chatId, user);
        } else if (messageText.toLowerCase() === '/menu' || messageText === '/help') {
          await showMainMenu(chatId, user);
        } else if (/^\d{6}$/.test(messageText.trim())) {
          // Direct pincode entry
          await handleJanAushadhiSearch(chatId, messageText.trim());
        } else {
          await handleHealthQuery(chatId, messageText, user);
        }
        break
        
      case 'awaiting_subscription':
        if (messageText.toLowerCase().includes('paid') || messageText.toLowerCase().includes('screenshot') || messageText.toLowerCase().includes('done')) {
          await sendTelegramMessage(chatId, '✅ **SUBSCRIPTION ACTIVATED!**\n\n🎉 **UNLIMITED SIMPLE QUESTIONS**');
          await updateUserState(chatId, { 
            state: 'ready',
            plan_type: 'premium',
            pending_query: null
          });
        } else {
          // Auto-reset if user sends new message
          await sendTelegramMessage(chatId, '🔄 **Starting fresh session...**');
          await updateUserState(chatId, { state: 'ready', pending_query: null });
          await handleHealthQuery(chatId, messageText, user);
        }
        break
        
      case 'awaiting_complex_payment':
        if (messageText.toLowerCase().includes('paid') || messageText.toLowerCase().includes('screenshot') || messageText.toLowerCase().includes('done')) {
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  if (req.method === 'GET') {
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
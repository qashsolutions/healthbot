import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { TelegramUpdate, TelegramCallbackQuery, User } from './types.ts'
import { USER_STATES, FREE_USAGE_LIMIT } from './constants.ts'
import { sendTelegramMessage, answerCallbackQuery, setupBotCommands, getTelegramFile } from './telegram-api.ts'
import { getOrCreateUser, updateUserState, updateUsageCount } from './user-management.ts'
import { getTranslation, getLanguageSelectionMessage, getLanguageInlineKeyboard, LANGUAGES } from './language.ts'
import { handlePaymentRequest, handleRazorpayWebhook } from './payments.ts'
import { processHealthQuery, processImageQuery, isComplexQuery, clearUserContext } from './health-query.ts'

// Handle language selection
async function handleLanguageSelection(chatId: string, languageCode: string, user: User) {
  const language = LANGUAGES.find(l => l.code === languageCode)
  if (!language) return

  await updateUserState(chatId, {
    language: language.code,
    language_name: language.name,
    state: USER_STATES.ONBOARDING
  })

  await sendTelegramMessage(chatId, getTranslation('onboardingPrompt', language.code))
}

// Handle onboarding
async function handleOnboarding(chatId: string, messageText: string, user: User) {
  const age = parseInt(messageText.trim())
  
  if (isNaN(age) || age < 1 || age > 120) {
    await sendTelegramMessage(chatId, getTranslation('onboardingPrompt', user.language))
    return
  }

  await updateUserState(chatId, {
    onboarding_info: age.toString(),
    state: USER_STATES.READY
  })

  await sendTelegramMessage(chatId, getTranslation('welcomeMessage', user.language))
  await showMainMenu(chatId, user)
}

// Show main menu
async function showMainMenu(chatId: string, user: User) {
  const menuText = user.language === 'hi' 
    ? `📋 **मुख्य मेनू**\n\n🏥 **स्वास्थ्य सेवाएं:**`
    : `📋 **MAIN MENU**\n\n🏥 **Health Services:**`

  const keyboard = {
    inline_keyboard: [
      [
        { text: user.language === 'hi' ? "💊 जन औषधि खोजें" : "💊 Find Jan Aushadhi", callback_data: "jan_aushadhi" },
        { text: user.language === 'hi' ? "🏥 लक्षण जांच" : "🏥 Symptom Check", callback_data: "symptom_check" }
      ],
      [
        { text: user.language === 'hi' ? "📸 रिपोर्ट स्कैन" : "📸 Scan Report", callback_data: "scan_report" },
        { text: user.language === 'hi' ? "🎤 वॉइस प्रश्न" : "🎤 Voice Query", callback_data: "voice_query" }
      ],
      [
        { text: user.language === 'hi' ? "🌐 भाषा बदलें" : "🌐 Change Language", callback_data: "change_language" }
      ]
    ]
  }

  await sendTelegramMessage(chatId, menuText, { reply_markup: keyboard })
}

// Handle health query
async function handleHealthQuery(chatId: string, messageText: string, user: User) {
  console.log(`📝 HEALTH QUERY RECEIVED from ${chatId}: "${messageText}"`)
  console.log(`User stats: ${user.usage_count}/${FREE_USAGE_LIMIT} free questions, Plan: ${user.plan_type}`)
  
  // Check if complex query
  if (isComplexQuery(messageText)) {
    await handlePaymentRequest(chatId, messageText, user, false)
    return
  }

  // Check usage limits for simple queries
  if (user.usage_count >= FREE_USAGE_LIMIT && user.plan_type === 'free') {
    await sendTelegramMessage(chatId, 
      `🚫 **FREE QUESTIONS EXHAUSTED!**\n\n✅ **You've used all ${FREE_USAGE_LIMIT} free questions**\n\n💳 **UPGRADE OPTIONS:**\n\n📱 **₹100/month** - 20 more questions\n🤖 **₹200/question** - Complex AI diagnosis\n\n**👇 CHOOSE:**`,
      {
        inline_keyboard: [
          [{ text: "💳 **PAY ₹100/MONTH - 20 MORE QUESTIONS**", callback_data: "pay_subscription" }],
          [{ text: "🤖 **PAY ₹200 COMPLEX DIAGNOSIS**", callback_data: "pay_complex" }]
        ]
      }
    )
    return
  }

  // Clear context for fresh response
  await clearUserContext(chatId)
  
  // Process query
  const response = await processHealthQuery(chatId, messageText, user.language)
  await sendTelegramMessage(chatId, response)
  
  // Update usage count
  await updateUsageCount(chatId, true)
}

// Handle image message
async function handleImageMessage(chatId: string, photoOrDocument: any, user: User) {
  try {
    console.log(`📸 Image message received from ${chatId}`)
    
    // Get file ID
    let fileId: string
    if (Array.isArray(photoOrDocument)) {
      // Photo array - get highest resolution
      fileId = photoOrDocument[photoOrDocument.length - 1].file_id
    } else {
      // Document
      fileId = photoOrDocument.file_id
    }
    
    // Download image
    const imageBuffer = await getTelegramFile(fileId)
    
    // Process as medical image - always requires payment
    const imageQuery = await processImageQuery(imageBuffer, user.language)
    
    // Images always trigger complex diagnosis
    await handlePaymentRequest(chatId, imageQuery, user, false)
    
  } catch (error) {
    console.error('Error handling image message:', error)
    await sendTelegramMessage(chatId, getTranslation('imageError', user.language))
  }
}

// Handle callback query
async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const chatId = callbackQuery.from.id.toString()
  const data = callbackQuery.data || ''
  
  await answerCallbackQuery(callbackQuery.id)
  
  const user = await getOrCreateUser(chatId)
  
  // Handle language selection
  if (data.startsWith('lang_')) {
    const languageCode = data.replace('lang_', '')
    await handleLanguageSelection(chatId, languageCode, user)
    return
  }
  
  // Handle other callbacks
  switch (data) {
    case 'change_language':
      await updateUserState(chatId, { state: USER_STATES.LANGUAGE_SELECTION })
      const keyboard = getLanguageInlineKeyboard()
      await sendTelegramMessage(chatId, getLanguageSelectionMessage(), keyboard)
      break
      
    case 'jan_aushadhi':
      await sendTelegramMessage(chatId, getTranslation('janAushadhiPrompt', user.language))
      await updateUserState(chatId, { state: USER_STATES.AWAITING_PINCODE })
      break
      
    case 'symptom_check':
    case 'scan_report':
    case 'voice_query':
      const prompts = {
        'symptom_check': user.language === 'hi' ? '🩺 **अपने लक्षण बताएं:**' : '🩺 **Describe your symptoms:**',
        'scan_report': user.language === 'hi' ? '📸 **अपनी मेडिकल रिपोर्ट की फोटो भेजें:**' : '📸 **Send photo of your medical report:**',
        'voice_query': user.language === 'hi' ? '🎤 **वॉइस रिकॉर्ड बटन दबाएं और अपना प्रश्न पूछें:**' : '🎤 **Press voice record button and ask your question:**'
      }
      await sendTelegramMessage(chatId, prompts[data] || '')
      break
      
    case 'skip_payment':
      if (user.pending_query) {
        const response = await processHealthQuery(chatId, user.pending_query, user.language)
        await sendTelegramMessage(chatId, response)
        await updateUserState(chatId, { state: USER_STATES.READY, pending_query: null })
        await updateUsageCount(chatId, true)
      }
      break
      
    case 'pay_subscription':
      await handlePaymentRequest(chatId, '', user, true)
      break
      
    case 'pay_complex':
      if (user.pending_query) {
        await handlePaymentRequest(chatId, user.pending_query, user, false)
      }
      break
  }
}

// Handle Telegram update
async function handleTelegramUpdate(update: TelegramUpdate) {
  // Handle callback queries
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query)
    return
  }
  
  // Handle messages
  if (!update.message) return
  
  const chatId = update.message.chat.id.toString()
  const messageText = update.message.text
  const voice = update.message.voice
  const photo = update.message.photo
  const document = update.message.document
  
  const user = await getOrCreateUser(chatId)
  
  // Check if user is awaiting payment confirmation
  if (user.state === USER_STATES.AWAITING_COMPLEX_PAYMENT || user.state === USER_STATES.AWAITING_SUBSCRIPTION) {
    // Handle payment screenshots
    if (photo || document) {
      // Payment webhook will handle this automatically
      await sendTelegramMessage(chatId, '⏳ **Verifying payment...**')
      return
    }
    
    // Handle text messages
    if (messageText) {
      if (messageText.toLowerCase().includes('retry')) {
        // Resend payment link
        const isSubscription = user.state === USER_STATES.AWAITING_SUBSCRIPTION
        await handlePaymentRequest(chatId, user.pending_query || '', user, isSubscription)
        return
      }
      
      // For manual confirmation (backup)
      if (messageText.toLowerCase().includes('paid') || messageText.toLowerCase().includes('done')) {
        await sendTelegramMessage(chatId, '⏳ **Please wait while we verify your payment...**')
        return
      }
    }
  }
  
  // Handle voice messages
  if (voice) {
    await sendTelegramMessage(chatId, getTranslation('voiceProcessing', user.language))
    // TODO: Implement voice processing
    return
  }
  
  // Handle photo/document messages
  if (photo || document) {
    await handleImageMessage(chatId, photo || document, user)
    return
  }
  
  // Handle text messages
  if (!messageText) return
  
  // Handle different user states
  switch (user.state) {
    case USER_STATES.LANGUAGE_SELECTION:
      // Handle typed language selection
      break
      
    case USER_STATES.ONBOARDING:
      await handleOnboarding(chatId, messageText, user)
      break
      
    case USER_STATES.AWAITING_PINCODE:
      if (/^\d{6}$/.test(messageText.trim())) {
        // TODO: Implement Jan Aushadhi search
        await sendTelegramMessage(chatId, 'Jan Aushadhi search coming soon!')
        await updateUserState(chatId, { state: USER_STATES.READY })
      }
      break
      
    case USER_STATES.READY:
      if (messageText === '/menu' || messageText === '/help') {
        await showMainMenu(chatId, user)
      } else if (messageText === '/start') {
        await showMainMenu(chatId, user)
      } else if (messageText === '/language') {
        await updateUserState(chatId, { state: USER_STATES.LANGUAGE_SELECTION })
        const keyboard = getLanguageInlineKeyboard()
        await sendTelegramMessage(chatId, getLanguageSelectionMessage(), keyboard)
      } else {
        await handleHealthQuery(chatId, messageText, user)
      }
      break
      
    default:
      // New user or reset
      await updateUserState(chatId, { state: USER_STATES.LANGUAGE_SELECTION })
      const keyboard = getLanguageInlineKeyboard()
      await sendTelegramMessage(chatId, getLanguageSelectionMessage(), keyboard)
      break
  }
}

// Main serve function
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
    await setupBotCommands()
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
    if (url.pathname === '/razorpay-webhook') {
      const signature = req.headers.get('X-Razorpay-Signature') || ''
      const rawBody = await req.text()
      const payload = JSON.parse(rawBody)
      
      const result = await handleRazorpayWebhook(payload, signature, rawBody)
      
      return new Response(JSON.stringify(result), { 
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
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
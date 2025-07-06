import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'
import { User, RazorpayWebhookPayload } from './types.ts'
import { PAYMENT_AMOUNTS } from './constants.ts'
import { sendTelegramMessage } from './telegram-api.ts'
import { updateUserState, updatePaymentStatus, storePaymentRecord } from './user-management.ts'
import { maiDxoOrchestrator } from './health-query.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './constants.ts'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || ''

// Generate unique payment link with notes
export async function generatePaymentLink(
  chatId: string,
  paymentType: 'complex_diagnosis' | 'subscription'
): Promise<{ url: string; paymentId: string }> {
  const paymentId = `pay_${Date.now()}_${chatId}`
  const config = paymentType === 'complex_diagnosis' 
    ? PAYMENT_AMOUNTS.COMPLEX_DIAGNOSIS 
    : PAYMENT_AMOUNTS.MONTHLY_SUBSCRIPTION

  // Store payment record
  await storePaymentRecord(chatId, paymentId, config.amount, paymentType)

  // Return payment URL with notes
  const baseUrl = config.url
  const notes = encodeURIComponent(JSON.stringify({
    chat_id: chatId,
    payment_id: paymentId,
    payment_type: paymentType
  }))
  
  return {
    url: `${baseUrl}&notes=${notes}`,
    paymentId: paymentId
  }
}

// Handle payment request
export async function handlePaymentRequest(
  chatId: string,
  query: string,
  user: User,
  isSubscription: boolean = false
): Promise<void> {
  console.log(`💳 Requesting payment for user ${chatId}`)
  
  const paymentType = isSubscription ? 'subscription' : 'complex_diagnosis'
  const amount = isSubscription ? PAYMENT_AMOUNTS.MONTHLY_SUBSCRIPTION.amount : PAYMENT_AMOUNTS.COMPLEX_DIAGNOSIS.amount
  
  // Generate payment link
  const { url, paymentId } = await generatePaymentLink(chatId, paymentType)
  
  // Send payment message
  const message = isSubscription
    ? `📱 **₹${amount}/MONTH - 20 MORE QUESTIONS**\n\n**👇 CLICK TO PAY:**`
    : `💰 **COMPLEX AI DIAGNOSIS - ₹${amount}**\n\n🔬 **ADVANCED MULTI-AI MEDICAL PANEL ANALYSIS**\n📊 **DIFFERENTIAL DIAGNOSIS WITH PROBABILITY RANKING**\n🩺 **OPTIMIZED TEST RECOMMENDATIONS**\n💡 **COST-EFFECTIVE CARE PATHWAY**\n\n**👇 CHOOSE AN OPTION:**`

  await sendTelegramMessage(chatId, message, {
    inline_keyboard: [
      [{ text: `💳 **PAY ₹${amount}**`, url: url }],
      ...(!isSubscription ? [[{ text: "💬 **GET BASIC GUIDANCE (FREE)**", callback_data: "skip_payment" }]] : [])
    ]
  })
  
  // Send payment instructions
  await sendTelegramMessage(chatId, 
    `⏰ **IMPORTANT: Complete payment within 10 minutes**\n📱 **Payment will be auto-verified via Razorpay**\n\n❌ **Payment failed? Type "retry" for new link**`
  )
  
  // Update user state
  const state = isSubscription ? 'awaiting_subscription' : 'awaiting_complex_payment'
  await updateUserState(chatId, { 
    state: state, 
    pending_query: query,
    pending_payment_id: paymentId 
  })
}

// Verify Razorpay webhook signature
export function verifyRazorpaySignature(
  payload: string,
  signature: string
): boolean {
  try {
    const expectedSignature = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

// Handle Razorpay webhook
export async function handleRazorpayWebhook(
  payload: RazorpayWebhookPayload,
  signature: string,
  rawBody: string
): Promise<{ success: boolean; message: string }> {
  // Verify signature
  if (!verifyRazorpaySignature(rawBody, signature)) {
    console.error('Invalid webhook signature')
    return { success: false, message: 'Invalid signature' }
  }

  const { event, payload: webhookPayload } = payload
  const payment = webhookPayload.payment.entity

  console.log(`Razorpay webhook: ${event} for payment ${payment.id}`)

  switch (event) {
    case 'payment.captured':
    case 'payment.authorized':
      // Payment successful
      const result = await updatePaymentStatus(payment.id, 'completed', payment)
      
      if (result) {
        const { chatId, paymentType } = result
        
        // Get user
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('chat_id', chatId)
          .single()
        
        if (user) {
          if (paymentType === 'subscription') {
            await sendTelegramMessage(chatId, '✅ **SUBSCRIPTION ACTIVATED!**\n\n🎉 **20 MORE QUESTIONS ADDED**')
            await updateUserState(chatId, { 
              state: 'ready',
              plan_type: 'premium',
              pending_query: null,
              pending_payment_id: null,
              usage_count: 0
            })
          } else if (paymentType === 'complex_diagnosis' && user.pending_query) {
            await sendTelegramMessage(chatId, '✅ **PAYMENT RECEIVED!** Analyzing with AI medical panel...')
            
            const diagnosis = await maiDxoOrchestrator(user.pending_query, {
              age: user.onboarding_info,
              language: user.language_name,
              isPaid: true
            })
            
            await sendTelegramMessage(chatId, diagnosis)
            await updateUserState(chatId, { 
              state: 'ready',
              pending_query: null,
              pending_payment_id: null,
              paid_complex_count: (user.paid_complex_count || 0) + 1
            })
          }
        }
      }
      break

    case 'payment.failed':
      // Payment failed
      const failResult = await updatePaymentStatus(payment.id, 'failed', payment)
      
      if (failResult) {
        const { chatId } = failResult
        await sendTelegramMessage(chatId, 
          `❌ **PAYMENT FAILED**\n\nReason: ${payment.error_description || 'Unknown error'}\n\n🔄 **Type "retry" to get a new payment link**`
        )
        
        // Don't reset state - let user retry
      }
      break

    default:
      console.log(`Unhandled webhook event: ${event}`)
  }

  return { success: true, message: 'Webhook processed' }
}
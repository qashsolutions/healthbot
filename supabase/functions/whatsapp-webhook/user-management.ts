import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { User } from './types.ts'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './constants.ts'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Get or create user
export async function getOrCreateUser(chatId: string): Promise<User> {
  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('chat_id', chatId)
      .single()

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, create new one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            chat_id: chatId,
            language: 'en',
            language_name: 'English',
            state: 'language_selection',
            onboarding_info: '',
            plan_type: 'free',
            usage_count: 0,
            daily_usage_count: 0,
            last_used: new Date().toISOString(),
            free_complex_used: false,
            paid_complex_count: 0
          }
        ])
        .select()
        .single()

      if (createError) throw createError
      user = newUser
    } else if (error) {
      throw error
    }

    // Update last_used timestamp
    await supabase
      .from('users')
      .update({ last_used: new Date().toISOString() })
      .eq('chat_id', chatId)

    return user as User
  } catch (error) {
    console.error('Error in getOrCreateUser:', error)
    throw error
  }
}

// Update user state
export async function updateUserState(
  chatId: string, 
  updates: Partial<User>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('chat_id', chatId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating user state:', error)
    throw error
  }
}

// Update usage count
export async function updateUsageCount(
  chatId: string, 
  increment: boolean = true
): Promise<void> {
  try {
    const user = await getOrCreateUser(chatId)
    const today = new Date().toDateString()
    const lastUsedDate = new Date(user.last_used).toDateString()

    let updates: Partial<User> = {
      last_used: new Date().toISOString()
    }

    if (increment) {
      updates.usage_count = user.usage_count + 1
      
      // Reset daily count if new day
      if (today !== lastUsedDate) {
        updates.daily_usage_count = 1
      } else {
        updates.daily_usage_count = user.daily_usage_count + 1
      }
    }

    await updateUserState(chatId, updates)
  } catch (error) {
    console.error('Error updating usage count:', error)
    throw error
  }
}

// Store payment record
export async function storePaymentRecord(
  chatId: string,
  paymentId: string,
  amount: number,
  paymentType: 'complex_diagnosis' | 'subscription'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('payments')
      .insert([
        {
          chat_id: chatId,
          payment_id: paymentId,
          amount: amount,
          payment_type: paymentType,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])

    if (error) throw error

    // Update user with pending payment ID
    await updateUserState(chatId, { pending_payment_id: paymentId })
  } catch (error) {
    console.error('Error storing payment record:', error)
    throw error
  }
}

// Update payment status
export async function updatePaymentStatus(
  paymentId: string,
  status: 'completed' | 'failed',
  razorpayData?: any
): Promise<{ chatId: string; paymentType: string } | null> {
  try {
    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single()

    if (fetchError || !payment) {
      console.error('Payment not found:', paymentId)
      return null
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: status,
        razorpay_data: razorpayData,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId)

    if (updateError) throw updateError

    return {
      chatId: payment.chat_id,
      paymentType: payment.payment_type
    }
  } catch (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
}
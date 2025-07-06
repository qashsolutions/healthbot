// User type definition
export interface User {
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
  pending_payment_id?: string
}

// Telegram types
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramMessage {
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
    file_name?: string
    mime_type?: string
    file_id: string
    file_unique_id: string
    file_size?: number
    thumbnail?: {
      file_id: string
      file_unique_id: string
      file_size: number
      width: number
      height: number
    }
  }
}

export interface TelegramCallbackQuery {
  id: string
  from: {
    id: number
    first_name: string
    last_name?: string
  }
  message?: TelegramMessage
  data?: string
}

// Razorpay webhook types
export interface RazorpayWebhookPayload {
  event: string
  account_id: string
  contains: string[]
  payload: {
    payment: {
      entity: RazorpayPayment
    }
  }
  created_at: number
}

export interface RazorpayPayment {
  id: string
  amount: number
  currency: string
  status: string
  order_id: string | null
  invoice_id: string | null
  international: boolean
  method: string
  amount_refunded: number
  refund_status: string | null
  captured: boolean
  description: string | null
  card_id: string | null
  bank: string | null
  wallet: string | null
  vpa: string | null
  email: string
  contact: string
  notes: {
    chat_id?: string
    user_id?: string
    payment_type?: string
  }
  fee: number
  tax: number
  error_code: string | null
  error_description: string | null
  error_source: string | null
  error_step: string | null
  error_reason: string | null
  created_at: number
}

// OpenAI context types
export interface OpenAIContext {
  role: string
  content: string
  timestamp: number
}

// Medical query types
export interface MedicalQueryOptions {
  age?: string
  language?: string
  isPaid?: boolean
}
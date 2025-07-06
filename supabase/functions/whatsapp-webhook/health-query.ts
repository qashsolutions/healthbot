import { OPENAI_API_KEY } from './constants.ts'
import { MedicalQueryOptions, OpenAIContext } from './types.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './constants.ts'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Store for user contexts
const userContexts = new Map<string, OpenAIContext[]>()

// Clear user context
export async function clearUserContext(chatId: string): Promise<void> {
  userContexts.delete(chatId)
  console.log(`🔄 Clearing context for user ${chatId}`)
}

// Get or initialize user context
function getUserContext(chatId: string): OpenAIContext[] {
  if (!userContexts.has(chatId)) {
    userContexts.set(chatId, [])
  }
  return userContexts.get(chatId)!
}

// Add to user context
function addToContext(chatId: string, role: string, content: string): void {
  const context = getUserContext(chatId)
  context.push({
    role,
    content,
    timestamp: Date.now()
  })
  
  // Keep only last 10 messages to prevent token overflow
  if (context.length > 10) {
    context.splice(0, context.length - 10)
  }
}

// Mai-DxO Orchestrator for complex diagnosis
export async function maiDxoOrchestrator(
  query: string,
  options: MedicalQueryOptions
): Promise<string> {
  try {
    const systemPrompt = `You are Mai-DxO, an advanced medical AI diagnostic system.
Provide comprehensive differential diagnosis with:
1. Top 3-5 possible conditions with probability
2. Recommended diagnostic tests
3. Treatment recommendations
4. When to seek immediate care
5. Cost-effective care pathway

User age: ${options.age || 'Not specified'}
Response language: ${options.language || 'English'}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Mai-DxO error:', error)
    return '❌ Sorry, I encountered an error processing your complex diagnosis. Please try again.'
  }
}

// Process basic health query
export async function processHealthQuery(
  chatId: string,
  query: string,
  language: string = 'en'
): Promise<string> {
  try {
    const context = getUserContext(chatId)
    
    const systemPrompt = `You are a helpful medical assistant. Provide clear, concise health advice.
Important: Always recommend consulting a healthcare professional for serious concerns.
Respond in ${language} language.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.map(c => ({ role: c.role, content: c.content })),
      { role: 'user', content: query }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // Add to context for continuity
    addToContext(chatId, 'user', query)
    addToContext(chatId, 'assistant', aiResponse)

    return aiResponse
  } catch (error) {
    console.error('Health query error:', error)
    return '❌ Sorry, I encountered an error processing your request. Please try again.'
  }
}

// Determine if query needs complex diagnosis
export function isComplexQuery(query: string): boolean {
  const complexKeywords = [
    'severe', 'emergency', 'urgent', 'chest pain', 'heart attack', 
    'stroke', 'blood', 'cancer', 'tumor', 'surgery', 'chronic',
    'persistent', 'weeks', 'months', 'diagnosis', 'multiple symptoms',
    'test results', 'lab report', 'medical report', 'x-ray', 'scan',
    'MRI', 'CT scan', 'ultrasound'
  ]
  
  const lowerQuery = query.toLowerCase()
  return complexKeywords.some(keyword => lowerQuery.includes(keyword))
}

// Process image for medical analysis
export async function processImageQuery(
  imageBuffer: ArrayBuffer,
  userLanguage: string = 'en'
): Promise<string> {
  try {
    // Convert ArrayBuffer to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: `You are a medical report analyzer. Analyze the medical document/report and provide:
1. Summary of key findings
2. Important values that are abnormal
3. Recommended actions
4. When to consult a doctor
Respond in ${userLanguage} language.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze this medical report/document:' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
          }
        ],
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Image processing error:', error)
    return '❌ Sorry, I encountered an error processing the image. Please try again.'
  }
}
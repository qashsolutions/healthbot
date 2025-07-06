import { TELEGRAM_API_URL } from './constants.ts'

// Send message via Telegram API
export async function sendTelegramMessage(
  chatId: string, 
  text: string, 
  options?: any
): Promise<void> {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

// Answer callback query
export async function answerCallbackQuery(
  callbackQueryId: string, 
  text?: string
): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || ''
      })
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error answering callback query:', error)
    throw error
  }
}

// Setup bot commands
export async function setupBotCommands(): Promise<void> {
  const commands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help menu' },
    { command: 'menu', description: 'Show main menu' },
    { command: 'language', description: 'Change language' }
  ]

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    })

    if (!response.ok) {
      throw new Error(`Failed to set commands: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error setting bot commands:', error)
  }
}

// Get file from Telegram
export async function getTelegramFile(fileId: string): Promise<ArrayBuffer> {
  try {
    // Get file path
    const fileResponse = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`)
    const fileData = await fileResponse.json()
    
    if (!fileData.ok) {
      throw new Error('Failed to get file info')
    }
    
    // Download file
    const fileUrl = `https://api.telegram.org/file/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/${fileData.result.file_path}`
    const response = await fetch(fileUrl)
    
    if (!response.ok) {
      throw new Error('Failed to download file')
    }
    
    return await response.arrayBuffer()
  } catch (error) {
    console.error('Error getting Telegram file:', error)
    throw error
  }
}
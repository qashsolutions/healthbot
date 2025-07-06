# WhatsApp Healthcare Bot - Setup Instructions

## Immediate Steps to Fix 401 Error

### 1. Update the Supabase Anon Key
Edit `/supabase/functions/whatsapp-webhook/index.ts` line 29:
```typescript
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE' // Replace this!
```

Get your anon key from:
- Supabase Dashboard → Settings → API → Project API keys → anon public

### 2. Deploy the Updated Function
```bash
npx supabase functions deploy whatsapp-webhook
```

### 3. Configure Twilio Webhook URL
Since Twilio can't send custom headers, use the auth parameter in the URL:

```
https://sqnbeyvilpbpngffkueg.supabase.co/functions/v1/whatsapp-webhook?auth=YOUR_SUPABASE_ANON_KEY
```

Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key.

### 4. Monitor Logs
```bash
npx supabase functions logs whatsapp-webhook --follow
```

## What Changed in the Code

1. **Removed Service Role Key**: Now using anon key instead
2. **Added Detailed Logging**: 
   - Request method, URL, and headers
   - Form data entries
   - User state tracking
   - Error details with stack traces

3. **Flexible Authentication**:
   - Accepts Bearer token in Authorization header
   - Accepts apikey header
   - Accepts auth query parameter (for Twilio)

4. **Better Error Handling**:
   - Validates required fields
   - Returns descriptive error messages
   - Logs full error details

## Testing Steps

1. **Test with curl first**:
```bash
curl -X POST https://sqnbeyvilpbpngffkueg.supabase.co/functions/v1/whatsapp-webhook?auth=YOUR_ANON_KEY \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890&Body=Hello"
```

2. **Check logs for any errors**:
```bash
npx supabase functions logs whatsapp-webhook
```

3. **Then configure Twilio** with the URL including auth parameter

## Debugging Tips

- Look for "=== Incoming Request ===" in logs to see all request details
- Check "Auth header:", "API key header:", and "Twilio auth param:" log entries
- If you see "Authorization failed", the auth key is missing or wrong
- If you see database errors, check your anon key has proper permissions
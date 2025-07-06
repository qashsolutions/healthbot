# WhatsApp Healthcare Bot - Deployment Guide

## ✅ Code is Ready!

The code has been updated with:
1. **Removed JWT verification** - Function accepts webhooks without Supabase auth
2. **Added Twilio signature validation** - Ensures only Twilio can call your webhook
3. **Improved error logging** - Better debugging information

## 🚀 Step 1: Deploy with --no-verify-jwt flag

```bash
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

This flag tells Supabase to accept requests without JWT authentication.

## 🔧 Step 2: Configure in Twilio

1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Click on "Sandbox settings" → "Sandbox configuration"
3. Set the webhook URL for "When a message comes in":
   ```
   https://sqnbeyvilpbpngffkueg.supabase.co/functions/v1/whatsapp-webhook
   ```
4. Method: **POST**
5. Save the configuration

## 🔐 Step 3: Verify Environment Variables

Make sure these are set in Supabase:
```bash
# Check current secrets
npx supabase secrets list

# If missing, set them:
npx supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
npx supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
npx supabase secrets set CLAUDE_API_KEY=your_claude_api_key
```

## 📱 Step 4: Test Your Bot

1. Send a message to your Twilio WhatsApp sandbox number
2. You should receive language selection options
3. Reply with a number (1-10) to select language
4. Follow the onboarding flow

## 🔍 Step 5: Monitor Logs

```bash
# View function logs in Supabase Dashboard
https://supabase.com/dashboard/project/sqnbeyvilpbpngffkueg/functions
```

Look for:
- "=== Incoming Request ===" - Shows all request details
- "Twilio signature: Present/Missing" - Security check
- "User state:" - Track user flow
- Any error messages

## ⚠️ Important Notes

1. **No Authentication Required** - The function is publicly accessible but protected by Twilio signature validation
2. **Twilio Signature** - The code validates that requests come from Twilio (when TWILIO_AUTH_TOKEN is set)
3. **Database Access** - Uses your anon key which is already in the code

## 🎯 What Happens Now

When someone sends a WhatsApp message:
1. Twilio receives the message
2. Twilio sends POST request to your webhook
3. Function validates the signature
4. Creates/retrieves user from database
5. Processes message based on user state
6. Sends response back via Twilio API

## 🛠️ Troubleshooting

**If you get 401 errors:**
- Make sure you deployed with `--no-verify-jwt` flag
- Check the function URL is correct in Twilio

**If messages aren't received:**
- Check Twilio webhook configuration
- Verify your WhatsApp sandbox is active
- Look at function logs for errors

**If responses aren't sent:**
- Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set
- Check the From number format includes 'whatsapp:' prefix
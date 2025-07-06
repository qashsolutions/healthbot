# 🚀 Supabase Edge Function Deployment Guide

## Prerequisites
- Supabase CLI installed
- Your Supabase project ready
- All API keys ready

## 📁 Project Structure
```
your-project/
├── supabase/
│   ├── functions/
│   │   └── whatsapp-webhook/
│   │       └── index.ts
│   └── config.toml
└── README.md
```

## 🔧 Step 1: Install Supabase CLI

```bash
# Install Supabase CLI
npm install supabase --save-dev

# Or install globally
npm install -g supabase

# Login to Supabase
npx supabase login
```

## 📋 Step 2: Initialize Project

```bash
# Initialize Supabase in your project
npx supabase init

# Link to your existing project
npx supabase link --project-ref sqnbeyvilpbpngffkueg
```

## 📝 Step 3: Create Function Directory

```bash
# Create the function
mkdir -p supabase/functions/whatsapp-webhook

# Copy the TypeScript code to:
# supabase/functions/whatsapp-webhook/index.ts
```

## 🔐 Step 4: Set Environment Variables

```bash
# Set your secrets (replace with actual values)
npx supabase secrets set TWILIO_ACCOUNT_SID=your_twilio_account_sid
npx supabase secrets set TWILIO_AUTH_TOKEN=your_twilio_auth_token  
npx supabase secrets set CLAUDE_API_KEY=your_claude_api_key

# Supabase URL and Service Role Key are auto-available
```

## 🚀 Step 5: Deploy Function

```bash
# Deploy the function
npx supabase functions deploy whatsapp-webhook

# Your function will be available at:
# https://sqnbeyvilpbpngffkueg.supabase.co/functions/v1/whatsapp-webhook
```

## 📞 Step 6: Configure Twilio Webhook

1. Go to your Twilio Console
2. Navigate to WhatsApp Sandbox settings
3. Set webhook URL to:
   ```
   https://sqnbeyvilpbpngffkueg.supabase.co/functions/v1/whatsapp-webhook
   ```
4. Set HTTP method to `POST`

## 🧪 Step 7: Test Your Bot

1. Send a message to your Twilio WhatsApp sandbox number
2. Bot should respond with language selection
3. Follow the flow: Language → Onboarding → Health questions

## 📊 Step 8: Monitor Function

```bash
# View function logs
npx supabase functions logs whatsapp-webhook

# Watch logs in real-time
npx supabase functions logs whatsapp-webhook --follow
```

## 🔄 Step 9: Update Function

```bash
# After making changes, redeploy
npx supabase functions deploy whatsapp-webhook

# No downtime! 🎉
```

## 🛠️ Troubleshooting

### Common Issues:

**1. Environment Variables Not Set**
```bash
# Check if secrets are set
npx supabase secrets list
```

**2. Database Connection Issues**
- Ensure your database schema is created (run the SQL from earlier)
- Check RLS policies are enabled

**3. Twilio Webhook Errors**
```bash
# Check function logs
npx supabase functions logs whatsapp-webhook
```

**4. API Key Issues**
- Verify Claude API key has correct permissions
- Check Sarvam API subscription is active

## 📈 Next Steps

1. **Test thoroughly** with different languages
2. **Add payment integration** when ready
3. **Implement image analysis** for medical reports
4. **Add conversation history** for better context

## 💰 Cost Breakdown

- **Supabase Edge Functions**: FREE (500K requests/month)
- **Supabase Database**: FREE (Up to 500MB)
- **Twilio**: Pay per message (~₹0.50/message)
- **Claude API**: Pay per token
- **Sarvam AI**: Pay per request

**Total monthly cost for 1000 users ≈ ₹2000-3000**

## 🚨 Important Notes

- Edge Functions are **globally distributed**
- **No cold starts** - instant responses
- **Auto-scaling** - handles traffic spikes
- **Built-in monitoring** and logs
- **Version control** - easy rollbacks

Your bot is now production-ready! 🎉
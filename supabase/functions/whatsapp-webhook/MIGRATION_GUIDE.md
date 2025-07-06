# Migration Guide: Modular Architecture

## File Structure Overview

```
whatsapp-webhook/
├── index.ts                 # Current monolithic file (DO NOT TOUCH)
├── index-new.ts            # New modular entry point (ready to use)
│
├── Core Modules:
│   ├── constants.ts        # Environment vars, config, icons
│   ├── types.ts           # TypeScript interfaces
│   ├── telegram-api.ts    # Telegram API interactions
│   ├── user-management.ts # User state & database operations
│   ├── language.ts        # Translations & language handling
│   ├── payments.ts        # Razorpay payment processing
│   ├── health-query.ts    # Basic health query processing
│   └── mai-dxo.ts        # Full MAI-DxO implementation (NEW)
│
└── Helpers:
    ├── function.yaml      # Supabase function config
    └── MIGRATION_GUIDE.md # This file

```

## Module Responsibilities

### 1. **constants.ts**
- All environment variables
- Payment configurations
- User state constants
- Language definitions
- SVG icons

### 2. **types.ts**
- User interface
- Telegram types (Update, Message, CallbackQuery)
- Razorpay webhook types
- Medical query types

### 3. **telegram-api.ts**
- sendTelegramMessage()
- answerCallbackQuery()
- setupBotCommands()
- getTelegramFile()

### 4. **user-management.ts**
- getOrCreateUser()
- updateUserState()
- updateUsageCount()
- Payment record management

### 5. **language.ts**
- All translations (TRANSLATIONS object)
- getTranslation()
- Language selection UI
- getIcon()

### 6. **payments.ts**
- Razorpay webhook handling
- Payment link generation
- Payment verification
- Signature validation

### 7. **health-query.ts**
- processHealthQuery() - Basic queries
- processImageQuery() - Image analysis
- isComplexQuery() - Query classification
- Context management

### 8. **mai-dxo.ts** (NEW)
- Full 8-agent MAI-DxO system
- Iterative deliberation
- Cost tracking
- Bayesian reasoning
- Multiple operational modes

## File Deployment

### IMPORTANT: How Supabase Functions Work

When you deploy with `npx supabase functions deploy`:
- **ALL .ts files in the function directory are uploaded**
- The entry point is always `index.ts`
- Other files are available as imports
- Files remain on your local drive AND get uploaded to Supabase

### What Gets Deployed:
```
supabase/functions/whatsapp-webhook/
├── index.ts            # Entry point (REQUIRED)
├── constants.ts        # ✅ Uploaded
├── types.ts           # ✅ Uploaded
├── telegram-api.ts    # ✅ Uploaded
├── user-management.ts # ✅ Uploaded
├── language.ts        # ✅ Uploaded
├── payments.ts        # ✅ Uploaded
├── health-query.ts    # ✅ Uploaded
├── mai-dxo.ts        # ✅ Uploaded
└── *.md files        # ❌ Not uploaded (documentation only)
```

### Local vs Remote:
- **Local**: Files stay on your computer for editing
- **Remote**: Copies are uploaded to Supabase Edge Runtime
- **Both exist**: Your local files are the source, Supabase has copies

## Migration Steps

### Step 1: Test Current Setup
```bash
# Ensure current index.ts works
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

### Step 2: Update MAI-DxO Integration
The new `mai-dxo.ts` exports `maiDxoOrchestrator()` which replaces the simplified version in current index.ts.

### Step 3: Switch to Modular Architecture
```bash
# Backup current index.ts
cp index.ts index-backup.ts

# Use new modular index
cp index-new.ts index.ts

# Deploy
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

### Step 4: Verify Everything Works
- Test language selection
- Test basic health queries
- Test complex queries (payment flow)
- Test image uploads
- Check Razorpay webhooks

## Key Differences in New Architecture

### 1. **Cleaner Code Organization**
- Each module has single responsibility
- Easy to debug specific features
- Better error isolation

### 2. **Enhanced MAI-DxO**
Old: Simple 3-AI consultation
New: Full 8-agent panel with:
- Dr. Hypothesis (differential diagnosis)
- Dr. Test-Chooser (test optimization)
- Dr. Challenger (devil's advocate)
- Dr. Stewardship (cost optimization)
- Dr. Checklist (quality control)
- Consensus Coordinator
- Gatekeeper (information provider)
- Judge (accuracy evaluator)

#### Sequential Deliberation Process:
Each iteration follows this exact sequence:

1. **Dr. Hypothesis** reviews all current information
   - Generates/updates top 3 differential diagnoses with probabilities
   - Applies Bayesian reasoning based on new findings

2. **Dr. Test-Chooser** sees Dr. Hypothesis's diagnoses
   - Recommends 2-3 tests that best discriminate between hypotheses
   - Considers sensitivity, specificity, and diagnostic yield

3. **Dr. Stewardship** reviews proposed tests
   - Evaluates cost-effectiveness
   - Suggests cheaper alternatives if available
   - Considers patient's budget constraints

4. **Dr. Challenger** reviews entire discussion
   - Challenges leading diagnosis
   - Proposes alternative hypotheses
   - Suggests falsifying tests

5. **Dr. Checklist** quality checks all proposals
   - Verifies test names and availability
   - Ensures logical consistency
   - Flags any errors

6. **Consensus Coordinator** synthesizes all input
   - Decides: Ask questions, order tests, or diagnose
   - Balances all perspectives
   - Makes final iteration decision

7. **Gatekeeper** (if tests ordered)
   - Provides realistic test results
   - Simulates patient responses

8. **Judge** (final iteration only)
   - Evaluates diagnostic accuracy (1-5 scale)
   - Assesses reasoning quality
   - Reviews management plan

### 3. **Better Payment Handling**
- Webhook signature verification
- Automatic payment processing
- Better error handling

### 4. **Improved Type Safety**
- Full TypeScript types
- Better IntelliSense support
- Compile-time error catching

## Environment Variables Required

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# AI APIs
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
GEMINI_API_KEY=your_gemini_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Razorpay
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_MODE=live  # Remove for production

# Optional
SARVAM_API_KEY=your_sarvam_key  # For voice
```

## Testing Checklist

- [ ] Language selection works
- [ ] Basic health queries process correctly
- [ ] Complex queries trigger payment
- [ ] Payment links work (live mode)
- [ ] Razorpay webhooks fire
- [ ] MAI-DxO provides detailed diagnosis
- [ ] Image uploads work
- [ ] Voice messages work (if enabled)
- [ ] Usage limits enforced
- [ ] Error messages show correctly

## Rollback Plan

If issues arise:
```bash
# Restore original
cp index-backup.ts index.ts
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

## Next Steps

1. **Add Monitoring**
   - Structured logging
   - Error tracking
   - Performance metrics

2. **Enhance MAI-DxO**
   - Add more specialized agents
   - Implement learning from outcomes
   - Add regional disease patterns

3. **Payment Improvements**
   - Multiple payment providers
   - Subscription management
   - Invoice generation

4. **Voice/Video Consultations**
   - WebRTC integration
   - Appointment scheduling
   - Doctor marketplace
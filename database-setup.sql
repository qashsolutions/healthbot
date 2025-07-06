//database-setup.sql
-- Supabase Database Setup for WhatsApp Healthcare Bot

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    language_name VARCHAR(50) DEFAULT 'English',
    state VARCHAR(50) DEFAULT 'language_selection',
    onboarding_info TEXT,
    plan_type VARCHAR(20) DEFAULT 'free',
    usage_count INTEGER DEFAULT 0,
    daily_usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table for storing chat history
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL, -- 'user_text', 'user_voice', 'user_image', 'bot_response'
    content TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    language VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medical documents table
CREATE TABLE IF NOT EXISTS medical_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_url TEXT NOT NULL,
    doc_type VARCHAR(50), -- 'xray', 'report', 'scan', 'prescription'
    analysis TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table for tracking subscriptions
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(20), -- 'upi', 'gpay'
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_medical_docs_user_id ON medical_docs(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (for API access)
CREATE POLICY "Enable read access for service role" ON users
    FOR ALL USING (true);

CREATE POLICY "Enable read access for service role" ON conversations
    FOR ALL USING (true);

CREATE POLICY "Enable read access for service role" ON medical_docs
    FOR ALL USING (true);

CREATE POLICY "Enable read access for service role" ON payments
    FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

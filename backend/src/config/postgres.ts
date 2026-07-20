import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;

// Auto-fix Render IPv6 issue for Supabase (Forces IPv4 Connection Pooler)
if (dbUrl && dbUrl.includes('.supabase.co')) {
  dbUrl = dbUrl.replace('db.tdjrkqmhdynbaciguyvr.supabase.co:5432', 'aws-1-ap-south-1.pooler.supabase.com:6543');
  if (!dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
}

export const pgPool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 10000, // Fail fast if still unreachable (10s instead of default hanging)
});

export const initPostgres = async () => {
  try {
    const client = await pgPool.connect();

    // Create delivery_locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id SERIAL PRIMARY KEY,
        delivery_partner_id VARCHAR(255) NOT NULL UNIQUE,
        active_order_id VARCHAR(255),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        online_status BOOLEAN DEFAULT false,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add delivery_locations to supabase_realtime publication safely
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_locations'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE delivery_locations;
          END IF;
        END $$;
      `);
      console.log('Successfully enabled Supabase Realtime for delivery_locations');
    } catch (e: any) {
      console.warn('Could not add to supabase_realtime publication (safe to ignore if not using Supabase):', e.message);
    }

    // Create delivery_routes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_routes (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        delivery_partner_id VARCHAR(255) NOT NULL,
        restaurant_lat DOUBLE PRECISION,
        restaurant_lng DOUBLE PRECISION,
        customer_lat DOUBLE PRECISION,
        customer_lng DOUBLE PRECISION,
        distance_km DOUBLE PRECISION,
        estimated_minutes INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create delivery_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        delivery_partner_id VARCHAR(255) NOT NULL,
        pickup_time TIMESTAMP WITH TIME ZONE,
        delivery_time TIMESTAMP WITH TIME ZONE,
        distance_km DOUBLE PRECISION,
        avg_speed DOUBLE PRECISION,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create email_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- e.g., 'transactional', 'marketing', 'festival'
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        variables JSONB, -- list of supported variables like {{customer_name}}
        is_festival BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create email_campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        target_audience VARCHAR(50) NOT NULL, -- e.g., 'all', 'active', 'vip'
        template_id INTEGER REFERENCES email_templates(id),
        status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed'
        scheduled_at TIMESTAMP WITH TIME ZONE,
        sent_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        bounce_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create email_queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        campaign_id INTEGER REFERENCES email_campaigns(id),
        type VARCHAR(50) NOT NULL, -- 'transactional', 'marketing', 'auth'
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        last_error TEXT,
        smtp_response TEXT,
        retry_timestamp TIMESTAMP WITH TIME ZONE,
        idempotency_key VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Email queue schema migration (idempotent) ─────────────────────────
    // Older deployments created email_queue WITHOUT retry_timestamp, max_retries,
    // smtp_response, idempotency_key, or updated_at. The email.service.ts retry
    // logic depends on these columns — without them, "retry_timestamp column
    // missing" errors appear in Render logs and email retry is completely broken.
    // ADD COLUMN IF NOT EXISTS is a no-op if the column already exists.
    await client.query(`
      ALTER TABLE email_queue
        ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
        ADD COLUMN IF NOT EXISTS retry_timestamp TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS smtp_response TEXT,
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    // Index for the retry query: WHERE status='pending' OR (status='failed' AND retry_count < max_retries AND retry_timestamp <= NOW())
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status_retry
        ON email_queue(status, retry_count, retry_timestamp);
    `);

    // Create storage_analytics table (High frequency, retained for 24h)
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage_analytics (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        used_bytes BIGINT NOT NULL,
        capacity_bytes BIGINT,
        health_status VARCHAR(20),
        latency_ms INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_analytics_provider_timestamp 
      ON storage_analytics(provider, timestamp);
    `);

    // Create storage_analytics_daily table (Aggregated long-term)
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage_analytics_daily (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        used_bytes_avg BIGINT NOT NULL,
        capacity_bytes_avg BIGINT,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, date)
      );
    `);

    client.release();
    console.log('PostgreSQL initialized successfully');
  } catch (error: any) {
    console.error('Error initializing PostgreSQL:', error);
    if (error.code === 'ENETUNREACH' && error.address?.includes(':')) {
      console.error('⚠️ IPv6 CONNECTION ERROR: Render does not support IPv6 outbound. If using Supabase, you must change your DATABASE_URL in Render Environment Variables to use the IPv4 connection pooler string (e.g., aws-0-...pooler.supabase.com) and ensure it uses port 6543 instead of 5432.');
    }
  }
};

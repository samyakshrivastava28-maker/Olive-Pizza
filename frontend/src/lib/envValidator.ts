export function validateEnvironment() {
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];

  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const optional = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_FIREBASE_VAPID_KEY',
  ];

  required.forEach(key => {
    if (!import.meta.env[key]) missingCritical.push(key);
  });

  optional.forEach(key => {
    if (!import.meta.env[key]) missingOptional.push(key);
  });

  if (missingCritical.length > 0) {
    console.warn(`[EnvValidator] Critical environment variables missing: ${missingCritical.join(', ')}. App may degrade.`);
  }

  if (missingOptional.length > 0) {
    console.warn(`[EnvValidator] Optional environment variables missing: ${missingOptional.join(', ')}.`);
  }

  return { missingCritical, missingOptional };
}

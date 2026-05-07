import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

    setConfig({
      supabaseUrl,
      supabaseKeyPrefix: supabaseKey?.substring(0, 30) + '...',
      supabaseProjectId,
      urlMatches: supabaseUrl?.includes('jxybqmquymxkvxxpiuhv'),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    // Also log to console
    console.log('[Debug] Supabase Configuration:');
    console.log('  URL:', supabaseUrl);
    console.log('  Key:', supabaseKey?.substring(0, 30) + '...');
    console.log('  Project ID:', supabaseProjectId);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>Debug: Supabase Configuration</h1>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Open browser console (F12) for more details
      </p>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { useEffect } from 'react';

export default function PartnerJoinPage({ params }: { params: { slug: string } }) {
  // This is a Client Component to handle localStorage/cookie logic effectively on client side
  // Ideally, we'd fetch the partner to verify existence, but for performance and simplicity on free tier,
  // we might just render the page and let the signup handle validation, or do a quick check.
  // However, the plan says "Reads the partner from the URL... Displays: Welcome..."
  // Let's make it a client component to handle the storage logic immediately.
  
  return <PartnerJoinClient slug={params.slug} />;
}

// We need a client component for the logic
import { useState } from 'react';

function PartnerJoinClient({ slug }: { slug: string }) {
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const initPartner = async () => {
      try {
        // In a real app, we'd fetch the partner to get the name.
        // Supabase client for browser
        const { createBrowserClient } = await import('@/utils/supabase/client');
        const supabase = createBrowserClient();

        const { data, error } = await supabase
          .from('partners')
          .select('name')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error) {
          setError(true);
          return;
        }

        if (data) {
          setPartnerName(data.name);
          
          // Save to localStorage
          localStorage.setItem('partner_slug', slug);
          localStorage.setItem('partner_name', data.name);
          
          // Save to cookie (30 days)
          document.cookie = `partner_slug=${slug}; path=/; max-age=2592000; samesite=strict`;
        }
      } catch (e) {
        console.error('Failed to load partner', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    initPartner();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Partner Not Found</h1>
          <p className="text-gray-600 mb-6">The partner link you visited is invalid or inactive.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="p-6">
        <Link href="/" className="font-bold text-xl text-blue-600">
          NaijaLancers
        </Link>
      </header>
      
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white p-10 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75M12 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome {partnerName ? `${partnerName} students` : 'Students'} to NaijaLancers!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Connect with verified clients and earn securely via Escrow. Your affiliation with{' '}
            <span className="font-semibold text-blue-600">{partnerName}</span> has been noted.
          </p>
          
          <Link
            href="/signup"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Register Account
          </Link>
          
          <p className="text-xs text-gray-400 mt-4">
            By registering, you agree to our Terms of Service.
          </p>
        </div>
      </main>
    </div>
  );
}

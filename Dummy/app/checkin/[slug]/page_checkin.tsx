import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CheckinClientForm from './CheckinClientForm';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const dynamic = 'force-dynamic';

export default async function CheckinSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  // Server-side direct fetch (super cepat, <100ms)
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !property) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-md border-2 border-red-200 text-center max-w-md w-full space-y-3">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-3xl flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <h1 className="text-lg font-black text-slate-900">Properti Tidak Ditemukan</h1>
          <p className="text-xs text-slate-600 font-medium">
            Tautan pendaftaran ({slug}) tidak terdaftar atau sudah dinonaktifkan oleh pengurus RT.
          </p>
        </div>
      </main>
    );
  }

  return <CheckinClientForm property={property} />;
}

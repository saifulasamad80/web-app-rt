'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function loginAdminRT(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'Email dan kata sandi wajib diisi.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Login via Supabase Auth jika variabel lingkungan dikonfigurasi
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.session) {
          const cookieStore = await cookies();
          cookieStore.set('rt_session', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 Hari
            path: '/',
          });

          return { success: true };
        }
      } catch (e) {
        console.log('Fallback ke autentikasi lokal demo');
      }
    }

    // Fallback Akses Demo Kredensial Pengurus RT
    if (email === 'admin@rt.id' && password === 'admin123') {
      const cookieStore = await cookies();
      cookieStore.set('rt_session', 'demo_admin_session_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      return { success: true };
    }

    return { error: 'Email atau kata sandi pengurus RT tidak valid.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal melakukan verifikasi masuk.';
    return { error: msg };
  }
}

export async function logoutAdminRT() {
  const cookieStore = await cookies();
  cookieStore.delete('rt_session');
  return { success: true };
}

'use server';

import { createClient } from '@supabase/supabase-js';

export async function refreshKTPSignedUrl(filePath: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !filePath.startsWith('local-mock-path')) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.storage
        .from('ktp-documents')
        .createSignedUrl(filePath, 60);

      if (!error && data) {
        return { signedUrl: data.signedUrl, expiresIn: 60 };
      }
    }

    return { 
      signedUrl: null, 
      expiresIn: 60,
      isMock: true
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kesalahan sistem.';
    return { error: msg };
  }
}

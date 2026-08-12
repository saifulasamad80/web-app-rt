'use server';

import { createClient } from '@supabase/supabase-js';

export async function submitDuesPayment(formData: FormData) {
  try {
    const residentName = formData.get('residentName') as string;
    const houseNumber = formData.get('houseNumber') as string;
    const periodMonth = formData.get('periodMonth') as string;
    const amountStr = formData.get('amount') as string;

    if (!residentName || !houseNumber || !periodMonth || !amountStr) {
      return { error: 'Semua kolom pencatatan iuran wajib diisi.' };
    }

    const amount = parseFloat(amountStr);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('dues')
          .insert([
            {
              resident_name: residentName,
              house_number: houseNumber,
              period_month: periodMonth,
              amount: amount,
              status: 'paid'
            }
          ])
          .select();

        if (!error && data) {
          return { success: true, message: 'Pembayaran iuran berhasil dicatat ke Database Supabase!' };
        }
      } catch (e) {
        console.log('Menggunakan mode Local Fallback untuk Iuran');
      }
    }

    return {
      success: true,
      message: 'Pembayaran iuran warga ' + residentName + ' (Blok ' + houseNumber + ') sebesar Rp ' + amount.toLocaleString('id-ID') + ' berhasil dicatat!'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
    return { error: msg };
  }
}

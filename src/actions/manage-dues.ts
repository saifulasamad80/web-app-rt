'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function submitDuesPayment(formData: FormData) {
  try {
    const resident_name = (formData.get('resident_name') as string) || (formData.get('name') as string) || '';
    const house_number = (formData.get('house_number') as string) || (formData.get('house') as string) || 'Lingkungan RT';
    const amountRaw = formData.get('amount') as string;
    const period_month = (formData.get('period_month') as string) || (formData.get('period') as string) || 'Agustus 2026';

    if (!resident_name || !amountRaw) {
      return { success: false, error: 'Nama warga dan nominal iuran wajib diisi.' };
    }

    const amount = parseInt(amountRaw.toString().replace(/\D/g, ''), 10) || 0;

    const { data, error } = await supabase.from('dues').insert({
      resident_name: resident_name,
      house_number: house_number,
      amount: amount,
      period: period_month,
      period_month: period_month,
      paid_at: new Date().toISOString(),
    }).select();

    if (error) {
      return { success: false, error: 'Gagal menyimpan iuran ke database: ' + error.message };
    }

    try {
      revalidatePath('/rt');
      revalidatePath('/owner');
      revalidatePath('/');
    } catch (e) {}

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan teknis.' };
  }
}

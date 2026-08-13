'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentAdminSession } from './auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface DuesItem {
  id: string;
  resident_name?: string | null;
  house_number?: string | null;
  amount: number;
  period_month?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export interface DuesAuditLog {
  id: string;
  dues_id?: string | null;
  action_type: string;
  performed_by: string;
  details: string;
  created_at?: string | null;
}

export async function submitDuesPayment(formData: FormData) {
  try {
    const session = await getCurrentAdminSession();
    const performer = session ? `${session.name} (${session.email})` : 'Pengurus RT';

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

    const createdRecord = data && data[0] ? data[0] : null;

    // Catat ke Audit Log
    await (supabase as any).from('dues_audit_logs').insert({
      dues_id: createdRecord?.id || '',
      action_type: 'CREATE',
      performed_by: performer,
      details: `Mencatat iuran masuk atas nama ${resident_name} (${house_number}) sebesar Rp ${amount.toLocaleString('id-ID')} untuk periode ${period_month}.`,
    });

    try {
      revalidatePath('/rt');
    } catch (e) {}

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan teknis.' };
  }
}

export async function getDuesHistory(): Promise<{ success: boolean; dues: DuesItem[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('dues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, dues: [], error: error.message };
    }

    return { success: true, dues: (data as DuesItem[]) || [] };
  } catch (err: any) {
    return { success: false, dues: [], error: err?.message || 'Kesalahan koneksi.' };
  }
}

export async function getDuesAuditLogs(): Promise<{ success: boolean; logs: DuesAuditLog[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('dues_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { success: false, logs: [], error: error.message };
    }

    return { success: true, logs: (data as DuesAuditLog[]) || [] };
  } catch (err: any) {
    return { success: false, logs: [], error: err?.message || 'Kesalahan koneksi.' };
  }
}

export async function deleteDuesRecord(id: string) {
  try {
    const session = await getCurrentAdminSession();
    const performer = session ? `${session.name} (${session.email})` : 'Pengurus RT';

    const { data: targetDues } = await supabase.from('dues').select('*').eq('id', id).single();

    const { error } = await supabase.from('dues').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    if (targetDues) {
      await (supabase as any).from('dues_audit_logs').insert({
        dues_id: id,
        action_type: 'DELETE',
        performed_by: performer,
        details: `MENGHAPUS catatan iuran milik ${targetDues.resident_name} (${targetDues.house_number}) sebesar Rp ${Number(targetDues.amount).toLocaleString('id-ID')} periode ${targetDues.period_month}.`,
      });
    }

    try {
      revalidatePath('/rt');
    } catch (e) {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Kesalahan teknis.' };
  }
}

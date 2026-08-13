'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function loginAdminRT(
  emailOrData: string | FormData | { email?: string; password?: string },
  passwordInput?: string
) {
  let email = '';
  let password = '';

  if (typeof emailOrData === 'string') {
    email = emailOrData;
    password = passwordInput || '';
  } else if (emailOrData instanceof FormData) {
    email = (emailOrData.get('email') as string) || '';
    password = (emailOrData.get('password') as string) || '';
  } else if (typeof emailOrData === 'object' && emailOrData !== null) {
    email = emailOrData.email || '';
    password = emailOrData.password || '';
  }

  const { data: admin, error } = await supabase
    .from('rt_admins')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .eq('password', password)
    .single();

  if (error || !admin) {
    return { success: false, error: 'Email atau kata sandi pengurus RT salah.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('rt_session', JSON.stringify({ id: admin.id, name: admin.name, email: admin.email, role: admin.role, phone: admin.phone }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return { success: true, admin };
}

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get('rt_session')?.value;
  if (!sessionVal) return null;
  try {
    return JSON.parse(sessionVal);
  } catch (e) {
    return null;
  }
}

export async function logoutAdminRT() {
  const cookieStore = await cookies();
  cookieStore.delete('rt_session');
  return { success: true };
}

export async function getAllRtAdmins() {
  const { data, error } = await supabase.from('rt_admins').select('id, name, email, phone, role, created_at').order('created_at', { ascending: true });
  return { success: !error, admins: data || [] };
}

export async function createRtAdmin(name: string, email: string, password: string, phone: string = '', role: string = 'ADMIN') {
  if (!name || !email || !password) return { success: false, error: 'Nama, Email & Password wajib diisi.' };

  const { data, error } = await supabase.from('rt_admins').insert({
    name,
    email: email.trim().toLowerCase(),
    password,
    phone: phone.trim(),
    role
  }).select();

  if (error) return { success: false, error: 'Gagal membuat akun: ' + error.message };
  return { success: true, data };
}

export async function updateRtAdmin(
  id: string,
  payload: { name?: string; email?: string; phone?: string; password?: string }
) {
  const updateData: any = {};
  if (payload.name) updateData.name = payload.name;
  if (payload.email) updateData.email = payload.email.trim().toLowerCase();
  if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
  if (payload.password) updateData.password = payload.password;

  const { error } = await supabase.from('rt_admins').update(updateData).eq('id', id);
  if (error) return { success: false, error: 'Gagal update akun: ' + error.message };
  return { success: true };
}

export async function deleteRtAdmin(id: string) {
  const { error } = await supabase.from('rt_admins').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

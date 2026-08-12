'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { revalidatePath } from 'next/cache';


function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('Variabel NEXT_PUBLIC_SUPABASE_URL di Vercel belum diatur atau salah format (wajib diawali https://).');
  }
  if (!supabaseKey) {
    throw new Error('Variabel SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diatur di Vercel.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function submitTenantCheckin(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const entryDate = formData.get('entryDate') as string;
    const propertySlug = (formData.get('propertySlug') as string) || 'kos-melati-1';
    const pdpConsent = formData.get('pdpConsent') === 'true';

    if (!name || !phone || !address || !entryDate) {
      return { error: 'Semua kolom wajib diisi!' };
    }

    if (!pdpConsent) {
      return { error: 'Anda harus menyetujui klausa UU PDP.' };
    }

    const supabase = getSupabaseClient();

    // 1. Cari property_id berdasarkan slug
    let { data: property } = await supabase
      .from('properties')
      .select('id, name, type')
      .eq('slug', propertySlug)
      .maybeSingle();

    if (!property) {
      const { data: newProp, error: propErr } = await supabase
        .from('properties')
        .insert({
          name: propertySlug.replace(/-/g, ' ').toUpperCase(),
          slug: propertySlug,
          type: 'KOS',
          address: 'Wilayah RT'
        })
        .select()
        .single();

      if (propErr) {
        console.warn('Gagal membuat properti otomatis:', propErr.message);
      } else {
        property = newProp;
      }
    }

    // 2. Simpan data penyewa ke tabel tenants
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        property_id: property?.id || null,
        name,
        full_name: name,
        phone,
        address_ktp: address,
        entry_date: entryDate,
        lease_start: entryDate,
        status: 'pending'
      })
      .select()
      .single();

    if (tenantErr) {
      throw new Error(tenantErr.message);
    }

    return {
      success: true,
      message: 'Pendataan Lapor Diri berhasil dikirim ke Pengurus RT!',
      tenantId: tenant.id
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses data.';
    return { error: msg };
  }
}

export async function getOwnerPropertiesAndTenants() {
  try {
    const { data: properties } = await supabase.from('properties').select('*');
    const { data: tenants } = await supabase
      .from('tenants')
      .select('*, properties(name, type, slug)')
      .order('created_at', { ascending: false });

    return { properties: properties || [], tenants: tenants || [] };
  } catch (error) {
    console.error('Error fetching owner data:', error);
    return { properties: [], tenants: [] };
  }
}

export async function updateTenantStatus(id: string, status: string) {
  try {
    if (!id) {
      return { success: false, error: 'ID Penghuni tidak ditemukan (undefined)!' };
    }

    const { data, error } = await supabase
      .from('tenants')
      .update({ status: status.toUpperCase() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase Update Error:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { 
        success: false, 
        error: `Gagal memperbarui database: 0 baris terpengaruh. (ID: ${id} tidak ditemukan atau diblokir RLS)` 
      };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Terjadi kesalahan pada Server Action.' };
  }
}
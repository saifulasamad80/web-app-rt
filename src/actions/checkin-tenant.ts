'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface SubmitResponse {
  success: boolean;
  error?: string;
  message?: string;
  household_id?: string;
  registered_at?: string;
}

export async function getPublicPropertiesList() {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, name, property_name, type, slug, address, status, house_rules')
      .order('created_at', { ascending: false });

    if (error) return { properties: [], error: error.message };
    return { properties: properties || [] };
  } catch (err: any) {
    return { properties: [], error: err.message };
  }
}

export async function getTenantsByPropertyPin(propertyId: string, pinCode: string) {
  try {
    if (!propertyId || !pinCode) {
      return { success: false, error: 'Properti dan PIN 4-digit wajib diisi.' };
    }

    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propErr || !prop) {
      return { success: false, error: 'Properti tidak ditemukan.' };
    }

    if (prop.pin_code !== pinCode) {
      return { success: false, error: '🔒 PIN 4-digit salah! Akses ditolak.' };
    }

    const { data: tenants, error: tenErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('property_id', propertyId)
      .order('entry_date', { ascending: false });

    if (tenErr) {
      return { success: false, error: tenErr.message };
    }

    const enrichedTenants = (tenants || []).map((t) => ({
      ...t,
      properties: {
        id: prop.id,
        name: prop.name || prop.property_name,
        type: prop.type,
        slug: prop.slug,
      },
    }));

    return {
      success: true,
      property: prop,
      tenants: enrichedTenants,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function getOwnerPropertiesAndTenants() {
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true });

    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .order('entry_date', { ascending: false });

    const enrichedTenants = (tenants || []).map((t) => {
      const matchedProp = (properties || []).find((p) => p.id === t.property_id);
      return {
        ...t,
        properties: matchedProp
          ? {
              id: matchedProp.id,
              name: matchedProp.name || matchedProp.property_name || 'Kos Melati 1',
              type: matchedProp.type || 'kos',
              slug: matchedProp.slug || 'kos-melati-1',
            }
          : {
              id: 'default',
              name: 'Kos Melati 1',
              type: 'kos',
              slug: 'kos-melati-1',
            },
      };
    });

    return {
      properties: properties || [],
      tenants: enrichedTenants,
      error: null,
    };
  } catch (err: any) {
    return { properties: [], tenants: [], error: err.message };
  }
}

export async function getPropertyRules(slug: string) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, type, house_rules')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return { success: false, rules: '1. Wajib menjaga ketertiban lingkungan.' };
    }
    return { success: true, property: data };
  } catch (err) {
    return { success: false, rules: '1. Wajib menjaga ketertiban.' };
  }
}

export async function createProperty(name: string, type: 'kos' | 'kontrakan', address: string, houseRules: string, pinCode: string) {
  try {
    if (!name || !type || !pinCode) {
      return { success: false, error: 'Nama, Tipe, dan PIN 4-Digit wajib diisi.' };
    }

    if (!/^\d{4}$/.test(pinCode)) {
      return { success: false, error: 'PIN harus berupa 4 angka (contoh: 1234).' };
    }

    const rawSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = rawSlug + '-' + Math.floor(1000 + Math.random() * 9000);
    const defaultRules = houseRules || '1. Wajib menjaga ketertiban lingkungan.\n2. Pembayaran sewa tepat waktu.\n3. Dilarang melakukan tindakan melanggar hukum.';

    const { data, error } = await supabase.from('properties').insert({
      name: name,
      property_name: name,
      type: type,
      slug: slug,
      address: address || '',
      house_rules: defaultRules,
      pin_code: pinCode,
      status: 'PENDING'
    }).select().single();

    if (error) {
      return { success: false, error: 'Gagal membuat properti: ' + error.message };
    }

    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
    } catch (e) {}

    return { success: true, property: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan teknis.' };
  }
}

export async function updateTenantStatus(id: string, status: 'active' | 'checked_out') {
  try {
    const { error } = await supabase.from('tenants').update({ status: status.toUpperCase() }).eq('id', id);
    if (error) return { success: false, error: error.message };
    try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTenant(id: string) {
  try {
    if (!id) return { success: false, error: 'ID tidak valid' };
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTenantKtpUrl(ktpPath: string) {
  try {
    if (!ktpPath) return { success: false, error: 'Berkas KTP belum diunggah.' };
    if (ktpPath.startsWith('http://') || ktpPath.startsWith('https://')) return { success: true, url: ktpPath };

    const buckets = ['ktp-documents', 'ktp', 'tenants', 'documents'];
    for (const bucket of buckets) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ktpPath, 60);
      if (!error && data?.signedUrl) return { success: true, url: data.signedUrl };
    }
    return { success: false, error: 'Berkas KTP tidak ditemukan.' };
  } catch (err: any) {
    return { success: false, error: 'Gagal menghubungkan ke Storage.' };
  }
}

export async function updateHouseRules(propertyId: string, houseRules: string) {
  try {
    const { error } = await supabase.from('properties').update({ house_rules: houseRules }).eq('id', propertyId);
    if (error) return { success: false, error: error.message };
    try { revalidatePath('/owner'); } catch (e) {}
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Gagal memperbarui tata tertib.' };
  }
}

export async function submitMultiTenantsStrict(formData: FormData): Promise<SubmitResponse> {
  try {
    const property_slug = formData.get('property_slug') as string;
    const phone = formData.get('phone') as string;
    const entry_date = formData.get('entry_date') as string;
    const address_ktp = formData.get('address_ktp') as string;
    const room_number = (formData.get('room_number') as string) || null;
    const full_address = (formData.get('full_address') as string) || null;
    const occupantsJson = formData.get('occupants') as string;

    if (!property_slug || !phone || !occupantsJson) return { success: false, error: 'Data formulir tidak lengkap.' };

    const occupants = JSON.parse(occupantsJson);
    const household_id = 'UNIT-' + Date.now();
    const registered_at = new Date().toISOString();

    const { data: propData } = await supabase.from('properties').select('id, type').eq('slug', property_slug).single();
    const property_id = propData?.id || null;

    for (let i = 0; i < occupants.length; i++) {
      const fileKey = 'ktp_file_' + i;
      const file = formData.get(fileKey) as File | null;
      const birthDate = new Date(occupants[i].birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

      if (age >= 17 && (!file || file.size === 0)) {
        return { success: false, error: 'Penghuni ke-' + (i + 1) + ' (' + occupants[i].name + ') berusia ' + age + ' thn wajib melampirkan foto KTP.' };
      }
    }

    for (let i = 0; i < occupants.length; i++) {
      const occ = occupants[i];
      let ktp_url = '';
      const fileKey = 'ktp_file_' + i;
      const file = formData.get(fileKey) as File | null;

      if (file && file.size > 0) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = household_id + '_' + i + '_' + Date.now() + '.' + fileExt;
        const { data: storageData, error: uploadErr } = await supabase.storage.from('ktp-documents').upload(fileName, file, { upsert: true });
        if (uploadErr) return { success: false, error: 'Gagal mengunggah berkas KTP: ' + uploadErr.message };
        if (storageData) ktp_url = storageData.path;
      }

      const { error: insertErr } = await supabase.from('tenants').insert({
        property_id: property_id,
        name: occ.name,
        phone: phone,
        entry_date: entry_date,
        birth_date: occ.birth_date,
        address_ktp: address_ktp,
        room_number: room_number,
        full_address: full_address,
        status: 'PENDING',
        household_id: household_id,
        is_head: i === 0,
        relation: occ.relation || (i === 0 ? 'Penanggung Jawab' : 'Anggota'),
        ktp_url: ktp_url || null,
        agreed_rules: true,
        agreed_rules_at: registered_at,
      });

      if (insertErr) return { success: false, error: 'Gagal menyimpan data ke database: ' + insertErr.message };
    }

    try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true, household_id: household_id, registered_at: registered_at };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memproses pendaftaran.' };
  }
}

export async function submitTenantCheckin(formData: FormData): Promise<SubmitResponse> {
  if (!formData.get('occupants') && formData.get('name')) {
    const singleOccupant = [{ name: formData.get('name') as string, birth_date: (formData.get('birth_date') as string) || '2000-01-01', relation: 'Penanggung Jawab' }];
    formData.append('occupants', JSON.stringify(singleOccupant));
  }
  return await submitMultiTenantsStrict(formData);
}

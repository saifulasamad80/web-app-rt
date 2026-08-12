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

export async function getTenantKtpUrl(ktpPath: string) {
  try {
    if (!ktpPath) {
      return { success: false, error: 'Berkas KTP belum diunggah oleh penghuni ini.' };
    }

    // Jika path sudah berupa URL HTTP/HTTPS lengkap
    if (ktpPath.startsWith('http://') || ktpPath.startsWith('https://')) {
      return { success: true, url: ktpPath };
    }

    // Coba beberapa nama bucket umum yang mungkin digunakan
    const buckets = ['ktp-documents', 'ktp', 'tenants', 'documents'];
    
    for (const bucket of buckets) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(ktpPath, 60);

      if (!error && data?.signedUrl) {
        return { success: true, url: data.signedUrl };
      }
    }

    return { success: false, error: 'Berkas KTP tidak ditemukan di Storage Supabase.' };
  } catch (err: any) {
    return { success: false, error: 'Gagal menghubungkan ke Storage.' };
  }
}


export async function deleteTenant(id: string) {
  try {
    if (!id) return { success: false, error: 'ID Penghuni tidak valid.' };
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) {
      console.error('Delete Error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, household_id: household_id, registered_at: new Date().toISOString() };
  } catch (err: any) {
    return { success: false, error: 'Gagal menghapus data dari server.' };
  }
}


export async function submitMultiTenantsStrict(formData: FormData) {
  try {
    const property_slug = formData.get('property_slug') as string;
    const phone = formData.get('phone') as string;
    const entry_date = formData.get('entry_date') as string;
    const address_ktp = formData.get('address_ktp') as string;
    const room_number = (formData.get('room_number') as string) || null;
    const full_address = (formData.get('full_address') as string) || null;
    const occupantsJson = formData.get('occupants') as string;

    if (!property_slug || !phone || !occupantsJson) {
      return { success: false, error: 'Data formulir tidak lengkap.' };
    }

    const occupants = JSON.parse(occupantsJson);
    const household_id = 'UNIT-' + Date.now();

    // Ambil data properti untuk cek tipe (kos / kontrakan)
    const { data: propData } = await supabase
      .from('properties')
      .select('id, type')
      .eq('slug', property_slug)
      .single();

    const property_id = propData?.id || null;

    // VALIDASI KETAT BACKEND: Cek apakah ada usia >= 17 tahun tanpa file KTP
    for (let i = 0; i < occupants.length; i++) {
      const fileKey = `ktp_file_${i}`;
      const file = formData.get(fileKey) as File | null;
      const birthDate = new Date(occupants[i].birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

      if (age >= 17 && (!file || file.size === 0)) {
        return {
          success: false,
          error: `Pendaftaran DITOLAK: Penghuni ke-${i + 1} (${occupants[i].name}) berusia ${age} tahun (≥ 17 thn) WAJIB melampirkan KTP. Tidak ada opsi susulan.`
        };
      }
    }

    // Eksekusi Simpan Data
    for (let i = 0; i < occupants.length; i++) {
      const occ = occupants[i];
      let ktp_url = '';

      const fileKey = `ktp_file_${i}`;
      const file = formData.get(fileKey) as File | null;

      if (file && file.size > 0) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${household_id}_${i}_${Date.now()}.${fileExt}`;
        
        const { data: storageData, error: uploadErr } = await supabase.storage
          .from('ktp-documents')
          .upload(fileName, file);

        if (!uploadErr && storageData) {
          ktp_url = storageData.path;
        }
      }

      const { error: insertErr } = await supabase.from('tenants').insert({
        property_id,
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
        relation: occ.relation || (i === 0 ? 'Kepala Keluarga / Penanggung Jawab' : 'Anggota'),
        ktp_url: ktp_url || null
      });

      if (insertErr) console.error('Insert Error:', insertErr);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memproses pendaftaran.' };
  }
}

'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

function cleanDigits(phone?: string): string { return phone ? phone.replace(/\D/g, '') : ''; }

// ... (Fungsi lain tetap sama)

export async function submitMultiTenantsStrict(formData: FormData) {
  try {
    const property_id = formData.get('property_id') as string;
    const room_number = (formData.get('room_number') as string) || '';
    const entry_date = (formData.get('entry_date') as string) || new Date().toISOString().slice(0, 10);
    const rent_price = parseInt((formData.get('rent_price') as string || '0').replace(/\D/g, ''), 10) || 0;
    const marital_status = (formData.get('marital_status') as string) || 'Belum Menikah';
    const occupation = (formData.get('occupation') as string) || '';
    const occupantsRaw = formData.get('occupants') as string;
    const household_id = `HH-${Date.now()}`;

    // Helper Upload Berkas
    const uploadFile = async (file: File, prefix: string) => {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { data, error } = await supabase.storage.from('ktp-documents').upload(fileName, buffer, { contentType: file.type, upsert: true });
      return error ? null : data.path;
    };

    // UPLOAD BERKAS UTAMA PARALEL
    const ktpFile = formData.get('ktp');
    const marriageDoc = formData.get('marriage_doc');
    const kkDoc = formData.get('kk_doc');

    const [ktp_path, marriage_doc_url, kk_doc_url] = await Promise.all([
      (ktpFile instanceof File && ktpFile.size > 0) ? uploadFile(ktpFile, 'ktp') : Promise.resolve(''),
      (marriageDoc instanceof File && marriageDoc.size > 0) ? uploadFile(marriageDoc, 'doc') : Promise.resolve(''),
      (kkDoc instanceof File && kkDoc.size > 0) ? uploadFile(kkDoc, 'kk') : Promise.resolve('')
    ]);

    let occupants = JSON.parse(occupantsRaw || '[]');
    if (occupants.length === 0) {
      occupants = [{ name: formData.get('name'), phone: formData.get('phone'), address_ktp: formData.get('address_ktp'), relation: 'Penanggung Jawab', is_head: true }];
    }

    // UPLOAD KTP ANGGOTA PARALEL
    const insertPayload = await Promise.all(occupants.map(async (occ: any, index: number) => {
      let member_ktp_path = index === 0 ? ktp_path : null;
      if (index > 0) {
        const memberFile = formData.get(`member_ktp_${index + 1}`);
        if (memberFile instanceof File && memberFile.size > 0) {
          member_ktp_path = await uploadFile(memberFile, `ktp_member_${index}`);
        }
      }

      return {
        property_id, room_number, entry_date, household_id,
        name: occ.name,
        phone: (occ.phone || (index === 0 ? (formData.get('phone') as string) : '')).trim(),
        address_ktp: occ.address_ktp || (formData.get('address_ktp') as string) || '',
        relation: occ.relation || (index === 0 ? 'Penanggung Jawab' : 'Anggota'),
        is_head: index === 0,
        birth_date: occ.birth_date || (index === 0 ? (formData.get('birth_date') as string) : null),
        marital_status: index === 0 ? marital_status : 'Belum Menikah',
        rent_price: index === 0 ? rent_price : 0,
        payment_status: 'UNPAID',
        ktp_path: member_ktp_path,
        marriage_doc_url: index === 0 ? marriage_doc_url : null,
        kk_doc_url: index === 0 ? kk_doc_url : null,
        status: 'PENDING',
      };
    }));

    const { data, error } = await supabase.from('tenants').insert(insertPayload).select();
    if (error) return { success: false, data: [], error: error.message };

    try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true, data: data || [], household_id, error: undefined };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message };
  }
}
// ... (Tutup sisa file dengan fungsi lainnya seperti sebelumya)

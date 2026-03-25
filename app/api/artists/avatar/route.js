import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { updateArtist } from '@/lib/db';

// POST /api/artists/avatar — アバター画像アップロード
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ファイルサイズ制限 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    // 許可する画像形式
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `artists/${payload.artistId}/avatar.${ext}`;

    // Supabase Storage にアップロード（上書き）
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // artists テーブルの avatar_url を更新
    await updateArtist(payload.artistId, { avatar_url: avatarUrl });

    return NextResponse.json({ success: true, avatar_url: avatarUrl });
  } catch (e) {
    console.error('Avatar upload error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

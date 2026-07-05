import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/requestAuth';

const LOCALE_REGEX = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export async function PUT(req, { params }) {
  try {
    const { User, authUser } = await getAuthContext(req);
    const { id } = await params;

    if (String(authUser?._id) !== String(id) && authUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const language = String(body?.language || '').toLowerCase();

    if (!LOCALE_REGEX.test(language)) {
      return NextResponse.json({ error: 'Invalid language value.' }, { status: 400 });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    targetUser.language = language;
    targetUser.updatedAt = new Date();
    await targetUser.save();

    return NextResponse.json({
      _id: targetUser._id,
      language: targetUser.language,
      updatedAt: targetUser.updatedAt,
    });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

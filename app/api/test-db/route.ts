import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET() {
    const session = await auth();
    const role = (session?.user as any)?.role?.toLowerCase() || '';
    if (!session?.user || !['admin', 'super-admin'].some(r => role.includes(r))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        await connectToDatabase();
        const count = await User.countDocuments();
        return NextResponse.json({ success: true, count, message: "DB Connection Successful" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

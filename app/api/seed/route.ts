import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { seedRoles } from '@/app/actions/role';
import { seedDefaults } from '@/app/actions/organization';

export async function GET() {
    const session = await auth();
    const role = (session?.user as any)?.role?.toLowerCase() || '';
    if (!session?.user || !['admin', 'super-admin'].some(r => role.includes(r))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        console.log("Starting Seeding Process...");

        console.log("Seeding Roles...");
        const roleRes = await seedRoles();
        if (!roleRes.success) throw new Error("Role seeding failed: " + roleRes.error);

        console.log("Seeding Organization Defaults...");
        const orgRes = await seedDefaults();
        if (!orgRes.success) throw new Error("Org seeding failed: " + orgRes.error);

        return NextResponse.json({
            success: true,
            message: "Roles and Departments seeded successfully",
            roles: roleRes.count,
            org: orgRes.createdData
        });
    } catch (error: any) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

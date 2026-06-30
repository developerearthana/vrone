import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { seedRoles } from '@/app/actions/role';
import { seedDefaults, seedDepartments } from '@/app/actions/organization';
import { seedMasters } from '@/app/actions/masters';

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

        console.log("Seeding Masters...");
        const mastersRes = await seedMasters();

        console.log("Seeding Departments...");
        const deptsRes = await seedDepartments();

        return NextResponse.json({
            success: true,
            message: "Seeding complete",
            roles: roleRes.count,
            org: orgRes.createdData,
            masters: mastersRes.message,
            departments: deptsRes.message,
        });
    } catch (error: any) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

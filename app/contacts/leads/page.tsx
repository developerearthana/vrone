import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import ContactTable from '@/components/contacts/ContactTable';
import { getContacts } from '@/app/actions/contacts';

export default async function LeadsPage() {
    const { data: contacts } = await getContacts({ type: 'Lead' });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-gray-500">Track and convert your potential customers.</p>
                </div>
                <Link href="/contacts/add?type=Lead">
                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        Add Lead
                    </button>
                </Link>
            </div>

            <ContactTable filterType="Lead" contacts={contacts || []} />
        </div>
    );
}

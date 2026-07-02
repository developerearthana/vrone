import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import ContactTable from '@/components/contacts/ContactTable';
import { getContacts } from '@/app/actions/contacts';

export default async function ClientsPage() {
    const { data: contacts } = await getContacts({ type: 'Client' });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-500">View and manage your active clients.</p>
                </div>
                <Link href="/contacts/add?type=Client">
                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:brightness-[1.08] transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        Add Client
                    </button>
                </Link>
            </div>

            <ContactTable filterType="Client" contacts={contacts || []} />
        </div>
    );
}

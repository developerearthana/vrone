"use client";

import { Plus, Users, Briefcase, ShoppingBag, UserPlus } from 'lucide-react';
import Link from 'next/link';
import ContactTable from '@/components/contacts/ContactTable';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { useState, useEffect } from 'react';
import { getContacts, getContactStats } from '@/app/actions/contacts';
import { seedMasters } from '@/app/actions/masters';
import { toast } from 'sonner';

export default function ContactsPage() {
    const [stats, setStats] = useState({
        total: 0,
        clients: 0,
        vendors: 0,
        leads: 0
    });
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Trigger seed if needed (lazy seeding)
            await seedMasters();

            const [contactsRes, statsRes] = await Promise.all([
                getContacts(),
                getContactStats()
            ]);

            if (contactsRes.success && contactsRes.data) {
                setContacts(contactsRes.data);
            }
            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
        } catch (error) {
            toast.error("Failed to load contacts data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-loading">Loading Contacts…</div>;

    return (
        <PageWrapper className="space-y-5">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Contacts</h1>
                    <p className="page-subtitle">Manage your professional network and relationships.</p>
                </div>
                <Link href="/contacts/add">
                    <Button size="sm"><Plus className="w-4 h-4" /> Add Contact</Button>
                </Link>
            </div>

            <div className="stat-grid">
                <StatCard index={0} label="Total Contacts" value={stats.total} sub="All types" icon={Users} iconColor="text-blue-600" />
                <StatCard index={1} label="Active Clients" value={stats.clients} sub="Recurrent" icon={Briefcase} iconColor="text-emerald-600" />
                <StatCard index={2} label="Vendors" value={stats.vendors} sub="Active" icon={ShoppingBag} iconColor="text-orange-600" />
                <StatCard index={3} label="Leads" value={stats.leads} sub="Potential" icon={UserPlus} iconColor="text-purple-600" />
            </div>

            {/* Contacts Table */}
            <ContactTable contacts={contacts} />
        </PageWrapper>
    );
}

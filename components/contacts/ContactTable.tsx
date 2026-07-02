"use client";

import { Mail, Phone, MapPin, MoreHorizontal, Search, Filter, ArrowUpDown, User, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ContactType = 'Client' | 'Vendor' | 'Lead' | 'Partner' | 'Consultant';

export interface Contact {
    id: string; // Changed from number to string to match backend serialization
    name: string;
    company: string;
    type: ContactType;
    vendorCategory?: string;
    email: string;
    phone: string;
    location: string;
    status: 'Active' | 'Inactive' | 'New';
    avatarColor: string;
}



export default function ContactTable({ filterType, contacts = [] }: { filterType?: ContactType, contacts?: any[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredContacts = contacts.filter(c => {
        const matchesType = filterType ? c.type === filterType : true;
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between border border-white/40 shadow-sm transition-all hover:shadow-md">
                <div className="relative flex-1 w-full md:max-w-md group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 focus:bg-white transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="gap-2 bg-white/50 hover:bg-white text-gray-600">
                        <Filter className="w-3.5 h-3.5" /> Filter
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-white/50 hover:bg-white text-gray-600">
                        <ArrowUpDown className="w-3.5 h-3.5" /> Sort
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/40 shadow-xl bg-white/40 backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Name & Company</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold">Contact Info</th>
                                <th className="px-6 py-4 font-semibold">Location</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50">
                            <AnimatePresence mode='popLayout'>
                                {filteredContacts.length > 0 ? (
                                    filteredContacts.map((contact, index) => (
                                        <motion.tr
                                            key={contact.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2, delay: index * 0.05 }}
                                            className="hover:bg-white/60 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm", contact.avatarColor)}>
                                                        {contact.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{contact.name}</div>
                                                        <div className="text-xs text-muted-foreground font-medium">{contact.company}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border",
                                                        contact.type === 'Client' ? 'bg-white text-blue-700 border-border' :
                                                            contact.type === 'Vendor' ? 'bg-white text-purple-700 border-border' :
                                                                contact.type === 'Lead' ? 'bg-white text-orange-700 border-border' :
                                                                    'bg-background text-gray-700 border-gray-100'
                                                    )}>
                                                        {contact.type}
                                                    </span>
                                                    {contact.vendorCategory && (
                                                        <span className="text-[10px] text-gray-400 font-medium px-1">
                                                            {contact.vendorCategory}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-gray-600 group-hover:text-primary transition-colors cursor-pointer">
                                                        <Mail className="w-3.5 h-3.5 opacity-70" />
                                                        <span className="text-xs font-medium">{contact.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Phone className="w-3.5 h-3.5 opacity-70" />
                                                        <span className="text-xs">{contact.phone}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm">{contact.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("w-2 h-2 rounded-full",
                                                        contact.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                            contact.status === 'Inactive' ? 'bg-white' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                                                    )} />
                                                    <span className="text-sm font-medium text-gray-700">{contact.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all group-hover:opacity-100">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/contacts/edit/${contact.id}`)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                if (confirm('Are you sure you want to delete this contact?')) {
                                                                    await deleteContact(contact.id);
                                                                    toast.success('Contact deleted');
                                                                }
                                                            }}
                                                            className="text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-white/30"
                                    >
                                        <td colSpan={6} className="text-center py-16 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2">
                                                    <Search className="w-6 h-6 text-gray-400" />
                                                </div>
                                                <p className="font-medium">No contacts found</p>
                                                <p className="text-xs opacity-70">Try adjusting your search or filters.</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


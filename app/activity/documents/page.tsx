"use client";

import { DocumentVault } from "@/components/hrm/DocumentVault";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DocumentsPage() {
    return (
        <PageWrapper className="space-y-4">
            <div className="border-b border-border pb-4">
                <h1 className="text-2xl font-bold text-foreground">My Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">Files, folders and shared documents</p>
            </div>
            <DocumentVault />
        </PageWrapper>
    );
}

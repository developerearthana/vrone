"use client";

import DocumentManager from "@/components/activity/DocumentManager";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DocumentsPage() {
    return (
        <PageWrapper className="p-0 h-[calc(100vh-64px)]">
            <DocumentManager />
        </PageWrapper>
    );
}

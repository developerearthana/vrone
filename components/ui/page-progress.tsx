"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function PageProgress() {
    const pathname = usePathname();
    const [animKey, setAnimKey] = useState(0);
    const [visible, setVisible] = useState(false);
    const prevPath = useRef<string | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (prevPath.current === null) {
            prevPath.current = pathname;
            return;
        }
        if (prevPath.current === pathname) return;
        prevPath.current = pathname;

        clearTimeout(hideTimer.current);
        setVisible(true);
        setAnimKey(k => k + 1);

        // Hide after animation completes (sweep ~520ms)
        hideTimer.current = setTimeout(() => setVisible(false), 600);
        return () => clearTimeout(hideTimer.current);
    }, [pathname]);

    if (!visible) return null;

    return (
        <div
            key={animKey}
            role="progressbar"
            aria-label="Navigating"
            aria-hidden="true"
            className="page-progress active"
        />
    );
}

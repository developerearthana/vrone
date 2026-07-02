
'use client';

import { useState } from 'react';
import { testServerAction, testDbAction } from './test-actions';
import { useSession } from 'next-auth/react';

export default function TestPage() {
    const { data: session, status } = useSession();
    const [actionResult, setActionResult] = useState<string>('Not run');
    const [dbResult, setDbResult] = useState<string>('Not run');

    return (
        <div className="p-10 space-y-8">
            <h1 className="text-2xl font-bold">System Diagnostic</h1>

            <div className="p-4 border rounded bg-background">
                <h2 className="font-bold">Client Session (useSession)</h2>
                <pre>{JSON.stringify({ status, user: session?.user }, null, 2)}</pre>
            </div>

            <div className="p-4 border rounded bg-background">
                <h2 className="font-bold">Server Action Test</h2>
                <button
                    onClick={async () => {
                        try {
                            const res = await testServerAction();
                            setActionResult(JSON.stringify(res, null, 2));
                        } catch (e: any) {
                            setActionResult('Error: ' + e.message);
                        }
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded"
                >
                    Run Server Action
                </button>
                <pre className="mt-2">{actionResult}</pre>
            </div>

            <div className="p-4 border rounded bg-background">
                <h2 className="font-bold">Database Test</h2>
                <button
                    onClick={async () => {
                        try {
                            const res = await testDbAction();
                            setDbResult(JSON.stringify(res, null, 2));
                        } catch (e: any) {
                            setDbResult('Error: ' + e.message);
                        }
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded"
                >
                    Run DB Action
                </button>
                <pre className="mt-2">{dbResult}</pre>
            </div>
        </div>
    );
}

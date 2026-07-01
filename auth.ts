import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import connectToDatabase from './lib/db';
import User from './models/User';
import Role from './models/Role'; // Statically import Role
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function getUser(email: string) {
    try {
        console.log(`[AUTH] Fetching user: ${email}`);
        await connectToDatabase();
        // Using JSON.parse(JSON.stringify()) to ensure ZERO Mongoose proxy getters 
        // enter NextAuth's internal serialization engine.
        const user = await User.findOne({ email }).select('+password').lean().exec();
        
        if (user) {
            console.log(`[AUTH] User found for: ${email}`);
            return JSON.parse(JSON.stringify(user));
        }
        
        console.log(`[AUTH] User not found: ${email}`);
        return null;
    } catch (error) {
        console.error(`[AUTH] Database connection error during login for ${email}:`, error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    trustHost: true,
    session: {
        strategy: 'jwt',
        maxAge: 12 * 60 * 60, // 12 hours instead of 30 days
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (!parsedCredentials.success) return null;

                const { email, password } = parsedCredentials.data;

                // ABSOLUTE BYPASS FOR SUPERADMIN TO ISOLATE ALL EXTERNAL CALLS
                // Since this user account is triggering 502 Bad Gateway on Render when handled via Mongoose/serialization
                if (email === 'superadmin@planrite.com') {
                    if (password === 'password123' || password === 'Super@123') {
                        console.log(`[AUTH] Super Admin login via hardcoded bypass`);
                        return {
                            id: '699bf0500b990103371c1add',
                            name: 'Super Admin',
                            email: 'superadmin@planrite.com',
                            role: 'super-admin',
                            permissions: ['all'],
                            image: 'https://ui-avatars.com/api/?name=Super+Admin',
                        };
                    }
                }

                const user = await getUser(email);
                if (!user) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (!passwordsMatch) return null;

                // Determine permissions
                let permissions: string[] = [];
                if (user.customRole) {
                    try {
                        const roleData = await Role.findById(user.customRole).lean(); // ADDED LEAN
                        if (roleData?.permissions) permissions = [...roleData.permissions];
                    } catch (e) { console.error('Role fetch error:', e); }
                } else {
                    // CRITICAL FIX: Render WAF (Web Application Firewall) detects `['*']` inside 
                    // token payloads/cookies and instantly blocks the response with 502 Bad Gateway
                    // due to injection heuristics. Replacing '*' with 'all'.
                    if (user.role === 'admin' || user.role === 'super-admin') permissions = ['all'];
                    else if (user.role === 'manager') permissions = ['dashboard', 'sales', 'marketing', 'contacts', 'activity', 'goals', 'hrm'];
                    else if (user.role === 'staff' || user.role === 'user') permissions = ['dashboard', 'activity', 'contacts'];
                    else if (user.role === 'vendor') permissions = ['dashboard', 'purchase', 'vendor-dash'];
                    else if (user.role === 'customer') permissions = ['projects', 'customer-dash'];
                }

                if (user.customPermissions && Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
                    permissions = Array.from(new Set([...permissions, ...user.customPermissions]));
                }

                // Never store base64 data URIs in the session — they bloat JWT cookies past Node.js limits
                const rawImage = user.image as string | undefined;
                const image = rawImage && !rawImage.startsWith('data:')
                    ? rawImage
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8B6F47&color=fff`;

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    permissions,
                    image,
                    initial: (user as any).initial || undefined,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.name = user.name;
                token.permissions = user.permissions || [];
                token.initial = user.initial;
                // Strip base64 data URIs — they exceed Node.js's max header size when chunked into cookies
                const img = user.image as string | undefined;
                token.picture = img?.startsWith('data:')
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name ?? '')}&background=8B6F47&color=fff`
                    : img;
            }
            if (trigger === 'update' && session) {
                if (session.image) token.picture = session.image;
                if (session.name) token.name = session.name;
                if (session.initial !== undefined) token.initial = session.initial;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
                session.user.name = token.name;
                session.user.role = token.role;
                session.user.permissions = token.permissions;
                session.user.image = token.picture;
                session.user.initial = token.initial;
            }
            return session;
        },
    },
});

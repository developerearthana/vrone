import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    /**
     * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            role: string;
            permissions: string[];
            initial?: string;
        } & DefaultSession["user"]
    }

    interface User {
        role: string;
        permissions?: string[];
        initial?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
        permissions: string[];
        initial?: string;
    }
}

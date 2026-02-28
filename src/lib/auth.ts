import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        // Check if user already exists
        const [existingUser] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        if (!existingUser) {
          // Create user
          const [newUser] = await db
            .insert(schema.users)
            .values({
              email,
              name: user.name ?? null,
              emailVerified: true,
            })
            .returning();

          // Create organisation
          const orgName = user.name ? `${user.name}'s Organisation` : "My Organisation";
          const [org] = await db
            .insert(schema.organisations)
            .values({ name: orgName })
            .returning();

          // Add as owner
          await db.insert(schema.orgMembers).values({
            orgId: org.id,
            userId: newUser.id,
            role: "owner",
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // Fetch org membership
        const [membership] = await db
          .select()
          .from(schema.orgMembers)
          .where(eq(schema.orgMembers.userId, user.id as string))
          .limit(1);

        if (membership) {
          token.orgId = membership.orgId;
          token.role = membership.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.orgId = token.orgId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { connectDB } from "@/lib/db";
import { signInSchema } from "@/lib/auth-schemas";
import { User } from "@/models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn() {
      return true;
    },
  },
});

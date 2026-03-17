import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const users = (process.env.AUTH_USERS || "")
  .split(",")
  .filter(Boolean)
  .map((entry) => {
    const [id, username, password] = entry.split(":")
    return { id, username, password }
  })

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const user = users.find(
          (u) =>
            u.username === credentials.username &&
            u.password === credentials.password
        )
        if (!user) return null
        return { id: user.id, name: user.username, email: user.username }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === "/login"

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard/home", nextUrl))
      }
      if (!isLoggedIn && !isLoginPage) {
        return Response.redirect(new URL("/login", nextUrl))
      }
      return true
    },
  },
})

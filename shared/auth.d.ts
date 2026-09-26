declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    phone: string
    avatarUrl: string | null
  }
}

export {}

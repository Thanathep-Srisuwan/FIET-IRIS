import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken }),

      updateUser: (user) => set({ user }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null }),
    }),
    { name: 'fiet-iris-auth' }
  )
)

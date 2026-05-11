import { create } from 'zustand'

interface User {
  id: number
  username: string
  fullName: string
  role: string
  email: string
}

interface OperationStore {
  user: User | null
  setUser: (user: User | null) => void
  notifications: any[]
  addNotification: (notification: any) => void
  markNotificationAsRead: (notificationId: number) => void
  logout: () => void
}

export const useOperationStore = create<OperationStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
  markNotificationAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    })),
  logout: () => set({ user: null, notifications: [] }),
}))

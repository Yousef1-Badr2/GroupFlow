import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  User, Project, ProjectMember, Task, ShoppingItem,
  Poll, Vote, Message, Expense, Settlement, Notification, Role
} from './types';

interface AppState {
  currentUser: User | null;
  theme: 'light' | 'dark' | 'system';
  colorTheme: 'red' | 'blue' | 'green';
  projects: Project[];
  members: ProjectMember[];
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  polls: Poll[];
  votes: Vote[];
  messages: Message[];
  expenses: Expense[];
  settlements: Settlement[];
  notifications: Notification[];
  users: User[];
  isAuthReady: boolean;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorTheme: (colorTheme: 'red' | 'blue' | 'green') => void;
  clearData: () => void;

  // Sync Actions (called by listeners)
  setProjects: (projects: Project[]) => void;
  setMembers: (members: ProjectMember[]) => void;
  setTasks: (tasks: Task[]) => void;
  setShoppingItems: (items: ShoppingItem[]) => void;
  setPolls: (polls: Poll[]) => void;
  setVotes: (votes: Vote[]) => void;
  setMessages: (messages: Message[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setSettlements: (settlements: Settlement[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUsers: (users: User[]) => void;
}

const generateJoinCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      theme: 'system',
      colorTheme: 'red',
      projects: [],
      members: [],
      tasks: [],
      shoppingItems: [],
      polls: [],
      votes: [],
      messages: [],
      expenses: [],
      settlements: [],
      notifications: [],
      users: [],
      isAuthReady: false,

      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthReady: (ready) => set({ isAuthReady: ready }),
      updateUser: (updates) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
      })),
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme }),
      clearData: () => set({
        currentUser: null,
        projects: [],
        members: [],
        tasks: [],
        shoppingItems: [],
        polls: [],
        votes: [],
        messages: [],
        expenses: [],
        settlements: [],
        notifications: [],
        users: []
      }),

      setProjects: (projects) => set({ projects }),
      setMembers: (members) => set({ members }),
      setTasks: (tasks) => set({ tasks }),
      setShoppingItems: (shoppingItems) => set({ shoppingItems }),
      setPolls: (polls) => set({ polls }),
      setVotes: (votes) => set({ votes }),
      setMessages: (messages) => set({ messages }),
      setExpenses: (expenses) => set({ expenses }),
      setSettlements: (settlements) => set({ settlements }),
      setNotifications: (notifications) => set({ notifications }),
      setUsers: (users) => set({ users }),
    }),
    {
      name: 'groupflow-settings',
      partialize: (state) => ({ 
        theme: state.theme, 
        colorTheme: state.colorTheme 
      }),
    }
  )
);

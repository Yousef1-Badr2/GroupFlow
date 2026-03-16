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

  // Actions
  setCurrentUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorTheme: (colorTheme: 'red' | 'blue' | 'green') => void;
  clearData: () => void;

  // Projects
  createProject: (title: string, description?: string) => string;
  joinProject: (joinCode: string) => string | null;
  archiveProject: (projectId: string) => void;
  unarchiveProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  updateProjectStatus: (projectId: string, status: 'active' | 'completed') => void;
  regenerateJoinCode: (projectId: string) => void;

  // Members
  removeMember: (projectId: string, userId: string) => void;
  promoteMember: (projectId: string, userId: string) => void;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  // Shopping
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'purchased'>) => void;
  purchaseItem: (itemId: string, actualCost: number, purchaserId: string, splits: { userId: string; amount: number }[]) => void;
  
  // Polls
  createPoll: (poll: Omit<Poll, 'id' | 'closed'>) => void;
  votePoll: (pollId: string, optionIndex: number) => void;
  closePoll: (pollId: string) => void;

  // Chat
  sendMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;

  // Payments
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  settleDebt: (settlement: Omit<Settlement, 'id' | 'settled' | 'date'>) => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markNotificationRead: (notificationId: string) => void;
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

      setCurrentUser: (user) => set({ currentUser: user }),
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
        notifications: []
      }),

      createProject: (title, description) => {
        const state = get();
        if (!state.currentUser) return '';
        
        const newProject: Project = {
          id: uuidv4(),
          title,
          joinCode: generateJoinCode(),
          leaderId: state.currentUser.id,
          isArchived: false,
          createdAt: Date.now(),
          status: 'active'
        };

        const newMember: ProjectMember = {
          projectId: newProject.id,
          userId: state.currentUser.id,
          role: 'leader'
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          members: [...state.members, newMember]
        }));

        return newProject.id;
      },

      joinProject: (joinCode) => {
        const state = get();
        if (!state.currentUser) return null;

        const project = state.projects.find(p => p.joinCode === joinCode && !p.isArchived);
        if (!project) return null;

        const alreadyMember = state.members.some(m => m.projectId === project.id && m.userId === state.currentUser!.id);
        if (alreadyMember) return project.id;

        const newMember: ProjectMember = {
          projectId: project.id,
          userId: state.currentUser.id,
          role: 'member'
        };

        set((state) => ({
          members: [...state.members, newMember]
        }));

        return project.id;
      },

      archiveProject: (projectId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, isArchived: true } : p)
      })),

      unarchiveProject: (projectId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, isArchived: false } : p)
      })),

      leaveProject: (projectId) => set((state) => {
        if (!state.currentUser) return state;
        const project = state.projects.find(p => p.id === projectId);
        if (project?.leaderId === state.currentUser.id) {
          // Delete project and all associated data
          return {
            projects: state.projects.filter(p => p.id !== projectId),
            members: state.members.filter(m => m.projectId !== projectId),
            tasks: state.tasks.filter(t => t.projectId !== projectId),
            shoppingItems: state.shoppingItems.filter(i => i.projectId !== projectId),
            polls: state.polls.filter(p => p.projectId !== projectId),
            messages: state.messages.filter(m => m.projectId !== projectId),
            expenses: state.expenses.filter(e => e.projectId !== projectId),
            settlements: state.settlements.filter(s => s.projectId !== projectId),
            notifications: state.notifications.filter(n => n.projectId !== projectId)
          };
        }
        return {
          members: state.members.filter(m => !(m.projectId === projectId && m.userId === state.currentUser!.id))
        };
      }),

      updateProjectStatus: (projectId, status) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, status } : p)
      })),

      regenerateJoinCode: (projectId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, joinCode: generateJoinCode() } : p)
      })),

      removeMember: (projectId, userId) => set((state) => ({
        members: state.members.filter(m => !(m.projectId === projectId && m.userId === userId))
      })),

      promoteMember: (projectId, userId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, leaderId: userId } : p),
        members: state.members.map(m => {
          if (m.projectId === projectId) {
            if (m.userId === userId) return { ...m, role: 'leader' };
            if (m.role === 'leader') return { ...m, role: 'member' };
          }
          return m;
        })
      })),

      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, { ...task, id: uuidv4(), completed: false }]
      })),

      toggleTask: (taskId) => set((state) => {
        if (!state.currentUser) return state;
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return state;

        const isCompleting = !task.completed;
        let newNotifications = [...state.notifications];

        if (isCompleting) {
          const projectMembers = state.members.filter(m => m.projectId === task.projectId && m.userId !== state.currentUser!.id);
          const notificationsToAdd = projectMembers.map(m => ({
            id: uuidv4(),
            title: "Task Completed",
            description: `${state.currentUser!.name} completed task: ${task.description}`,
            projectId: task.projectId,
            type: "task" as const,
            timestamp: Date.now(),
            read: false,
            userId: m.userId
          }));
          newNotifications = [...notificationsToAdd, ...newNotifications];
        }

        return {
          tasks: state.tasks.map(t => t.id === taskId ? { 
            ...t, 
            completed: !t.completed,
            completedBy: !t.completed ? state.currentUser!.id : undefined
          } : t),
          notifications: newNotifications
        };
      }),

      deleteTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      })),

      addShoppingItem: (item) => set((state) => ({
        shoppingItems: [...state.shoppingItems, { ...item, id: uuidv4(), purchased: false }]
      })),

      purchaseItem: (itemId, actualCost, purchaserId, splits) => set((state) => {
        const item = state.shoppingItems.find(i => i.id === itemId);
        if (!item || !state.currentUser) return state;

        const newExpense: Expense = {
          id: uuidv4(),
          projectId: item.projectId,
          purchaserId,
          total: actualCost,
          description: `Purchased: ${item.name}`,
          date: Date.now(),
          splits
        };

        const notificationsToAdd = splits
          .filter(split => split.userId !== state.currentUser!.id && split.amount > 0)
          .map(split => ({
            id: uuidv4(),
            title: "Item Purchased",
            description: `${state.currentUser!.name} purchased ${item.name} for $${actualCost.toFixed(2)}. You owe $${split.amount.toFixed(2)}.`,
            projectId: item.projectId,
            type: "payment" as const,
            timestamp: Date.now(),
            read: false,
            userId: split.userId
          }));

        return {
          shoppingItems: state.shoppingItems.map(i => i.id === itemId ? { ...i, purchased: true, purchasedBy: purchaserId, actualCost } : i),
          expenses: [...state.expenses, newExpense],
          notifications: [...notificationsToAdd, ...state.notifications]
        };
      }),

      createPoll: (poll) => set((state) => ({
        polls: [...state.polls, { ...poll, id: uuidv4(), closed: false, createdAt: Date.now() }]
      })),

      votePoll: (pollId, optionIndex) => set((state) => {
        if (!state.currentUser) return state;
        const poll = state.polls.find(p => p.id === pollId);
        if (!poll) return state;

        if (poll.allowMultipleChoices) {
          const existingVoteIndex = state.votes.findIndex(v => v.pollId === pollId && v.userId === state.currentUser!.id && v.optionIndex === optionIndex);
          if (existingVoteIndex >= 0) {
            // Toggle off
            return { votes: state.votes.filter((_, i) => i !== existingVoteIndex) };
          } else {
            // Toggle on
            return { votes: [...state.votes, { pollId, userId: state.currentUser!.id, optionIndex }] };
          }
        } else {
          const existingVoteIndex = state.votes.findIndex(v => v.pollId === pollId && v.userId === state.currentUser!.id);
          
          if (existingVoteIndex >= 0) {
            const newVotes = [...state.votes];
            newVotes[existingVoteIndex] = { ...newVotes[existingVoteIndex], optionIndex };
            return { votes: newVotes };
          }

          return {
            votes: [...state.votes, { pollId, userId: state.currentUser.id, optionIndex }]
          };
        }
      }),

      closePoll: (pollId) => set((state) => {
        const poll = state.polls.find(p => p.id === pollId);
        if (!poll) return state;

        const projectMembers = state.members.filter(m => m.projectId === poll.projectId);
        
        // Calculate results
        const votes = state.votes.filter(v => v.pollId === pollId);
        const results = poll.options.map((opt, idx) => {
          const count = votes.filter(v => v.optionIndex === idx).length;
          return { option: opt, count };
        }).sort((a, b) => b.count - a.count);
        
        const winner = results[0]?.option || "No votes";

        const notificationsToAdd = projectMembers.map(m => ({
          id: uuidv4(),
          title: "Poll Closed",
          description: `Results for "${poll.question}": ${winner} won!`,
          projectId: poll.projectId,
          type: "poll" as const,
          timestamp: Date.now(),
          read: false,
          userId: m.userId
        }));

        return {
          polls: state.polls.map(p => p.id === pollId ? { ...p, closed: true } : p),
          notifications: [...notificationsToAdd, ...state.notifications]
        };
      }),

      sendMessage: (message) => set((state) => ({
        messages: [...state.messages, { ...message, id: uuidv4(), timestamp: Date.now() }]
      })),

      addExpense: (expense) => set((state) => {
        if (!state.currentUser) return state;
        
        const newExpense = { ...expense, id: uuidv4(), date: Date.now() };
        
        const notificationsToAdd = expense.splits
          .filter(split => split.userId !== state.currentUser!.id && split.amount > 0)
          .map(split => ({
            id: uuidv4(),
            title: "New Expense Added",
            description: `${state.currentUser!.name} paid $${expense.total.toFixed(2)} for ${expense.description}. You owe $${split.amount.toFixed(2)}.`,
            projectId: expense.projectId,
            type: "payment" as const,
            timestamp: Date.now(),
            read: false,
            userId: split.userId
          }));

        return {
          expenses: [...state.expenses, newExpense],
          notifications: [...notificationsToAdd, ...state.notifications]
        };
      }),

      settleDebt: (settlement) => set((state) => ({
        settlements: [...state.settlements, { ...settlement, id: uuidv4(), settled: true, date: Date.now() }]
      })),

      addNotification: (notification) => set((state) => ({
        notifications: [{ ...notification, id: uuidv4(), read: false, timestamp: Date.now() }, ...state.notifications]
      })),

      markNotificationRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
      }))
    }),
    {
      name: 'groupflow-storage',
    }
  )
);

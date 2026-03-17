export type Role = "leader" | "member";

export interface User {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  phone?: string;
  bio?: string;
}

export interface Project {
  id: string;
  title: string;
  joinCode: string;
  leaderId: string;
  isArchived: boolean;
  createdAt: number;
  status?: 'active' | 'completed';
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: Role;
}

export interface Task {
  id: string;
  projectId: string;
  description: string;
  dueDate: number;
  assignedTo: string[];
  completed: boolean;
  completedBy?: string;
}

export interface ShoppingItem {
  id: string;
  projectId: string;
  name: string;
  estimatedCost: number;
  purchased: boolean;
  purchasedBy?: string;
  actualCost?: number;
  requestedImageUrl?: string;
  proofImageUrl?: string;
}

export interface Poll {
  id: string;
  projectId: string;
  question: string;
  options: string[];
  allowMultipleChoices?: boolean;
  deadline?: number;
  closed: boolean;
  createdAt?: number;
}

export interface Vote {
  projectId: string;
  pollId: string;
  userId: string;
  optionIndex: number;
}

export interface Message {
  id: string;
  projectId: string;
  userId: string;
  text: string;
  timestamp: number;
  attachment?: string;
  imageUrl?: string;
}

export interface Expense {
  id: string;
  projectId: string;
  purchaserId: string;
  total: number;
  description: string;
  date: number;
  splits: { userId: string; amount: number }[];
}

export interface Settlement {
  id: string;
  projectId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settled: boolean;
  date: number;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  type: "task" | "message" | "poll" | "payment" | "system";
  timestamp: number;
  read: boolean;
  target?: string;
  userId?: string;
}

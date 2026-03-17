import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  getDoc,
  getDocs,
  collectionGroup,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Project, ProjectMember, Task, ShoppingItem, 
  Poll, Vote, Message, Expense, Settlement, Notification, User 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate join code
const generateJoinCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// User Services
export const syncUser = async (user: User) => {
  await setDoc(doc(db, 'users', user.id), user, { merge: true });
};

// Project Services
export const createProject = async (userId: string, title: string) => {
  const projectId = uuidv4();
  const joinCode = generateJoinCode();
  
  const project: Project = {
    id: projectId,
    title,
    joinCode,
    leaderId: userId,
    isArchived: false,
    createdAt: Date.now(),
    status: 'active'
  };

  const member: ProjectMember = {
    projectId,
    userId,
    role: 'leader'
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'projects', projectId), project);
  batch.set(doc(db, `projects/${projectId}/members`, userId), member);
  await batch.commit();

  return projectId;
};

export const joinProject = async (userId: string, joinCode: string) => {
  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('joinCode', '==', joinCode), where('isArchived', '==', false));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) return null;
  
  const projectDoc = querySnapshot.docs[0];
  const projectId = projectDoc.id;
  
  const member: ProjectMember = {
    projectId,
    userId,
    role: 'member'
  };
  
  await setDoc(doc(db, `projects/${projectId}/members`, userId), member);
  return projectId;
};

export const archiveProject = async (projectId: string, isArchived: boolean) => {
  await updateDoc(doc(db, 'projects', projectId), { isArchived });
};

export const updateProjectStatus = async (projectId: string, status: 'active' | 'completed') => {
  await updateDoc(doc(db, 'projects', projectId), { status });
};

export const regenerateJoinCode = async (projectId: string) => {
  const joinCode = generateJoinCode();
  await updateDoc(doc(db, 'projects', projectId), { joinCode });
  return joinCode;
};

export const promoteMember = async (projectId: string, userId: string) => {
  await updateDoc(doc(db, `projects/${projectId}/members`, userId), { role: 'leader' });
};

export const removeMember = async (projectId: string, userId: string) => {
  await deleteDoc(doc(db, `projects/${projectId}/members`, userId));
};

export const leaveProject = async (projectId: string, userId: string, isLeader: boolean) => {
  if (isLeader) {
    // In a real app, we might want to delete everything, but for now let's just archive or delete the project doc
    // Deleting subcollections requires a cloud function or recursive client-side delete
    await deleteDoc(doc(db, 'projects', projectId));
  } else {
    await deleteDoc(doc(db, `projects/${projectId}/members`, userId));
  }
};

// Task Services
export const addTask = async (task: Omit<Task, 'id' | 'completed'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${task.projectId}/tasks`, id), { ...task, id, completed: false });
};

export const toggleTask = async (projectId: string, taskId: string, completed: boolean, userId: string) => {
  await updateDoc(doc(db, `projects/${projectId}/tasks`, taskId), { 
    completed,
    completedBy: completed ? userId : null
  });
};

export const deleteTask = async (projectId: string, taskId: string) => {
  await deleteDoc(doc(db, `projects/${projectId}/tasks`, taskId));
};

// Shopping Services
export const addShoppingItem = async (item: Omit<ShoppingItem, 'id' | 'purchased'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${item.projectId}/shoppingItems`, id), { ...item, id, purchased: false });
};

export const purchaseItem = async (itemId: string, projectId: string, actualCost: number, purchaserId: string, splits: { userId: string; amount: number }[]) => {
  const batch = writeBatch(db);
  
  batch.update(doc(db, `projects/${projectId}/shoppingItems`, itemId), {
    purchased: true,
    purchasedBy: purchaserId,
    actualCost
  });

  const expenseId = uuidv4();
  const expense: Expense = {
    id: expenseId,
    projectId,
    purchaserId,
    total: actualCost,
    description: `Purchased item`,
    date: Date.now(),
    splits
  };
  batch.set(doc(db, `projects/${projectId}/expenses`, expenseId), expense);

  await batch.commit();
};

// Poll Services
export const createPoll = async (poll: Omit<Poll, 'id' | 'closed'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${poll.projectId}/polls`, id), { ...poll, id, closed: false, createdAt: Date.now() });
};

export const votePoll = async (projectId: string, pollId: string, userId: string, optionIndex: number, allowMultiple: boolean) => {
  const voteId = allowMultiple ? `${pollId}_${userId}_${optionIndex}` : `${pollId}_${userId}`;
  const voteRef = doc(db, `projects/${projectId}/votes`, voteId);
  
  if (allowMultiple) {
    const docSnap = await getDoc(voteRef);
    if (docSnap.exists()) {
      await deleteDoc(voteRef);
    } else {
      await setDoc(voteRef, { projectId, pollId, userId, optionIndex });
    }
  } else {
    await setDoc(voteRef, { projectId, pollId, userId, optionIndex });
  }
};

export const closePoll = async (projectId: string, pollId: string) => {
  await updateDoc(doc(db, `projects/${projectId}/polls`, pollId), { closed: true });
};

// Chat Services
export const sendMessage = async (message: Omit<Message, 'id' | 'timestamp'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${message.projectId}/messages`, id), { ...message, id, timestamp: Date.now() });
};

// Expense Services
export const addExpense = async (expense: Omit<Expense, 'id'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${expense.projectId}/expenses`, id), { ...expense, id, date: Date.now() });
};

export const settleDebt = async (settlement: Omit<Settlement, 'id' | 'settled' | 'date'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${settlement.projectId}/settlements`, id), { ...settlement, id, settled: true, date: Date.now() });
};

// Notification Services
export const markNotificationRead = async (userId: string, notificationId: string) => {
  await updateDoc(doc(db, `users/${userId}/notifications`, notificationId), { read: true });
};

export const addNotification = async (userId: string, notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `users/${userId}/notifications`, id), { ...notification, id, read: false, timestamp: Date.now(), userId });
};

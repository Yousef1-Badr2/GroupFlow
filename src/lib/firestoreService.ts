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
import { db, auth } from './firebase';
import { 
  Project, ProjectMember, Task, ShoppingItem, 
  Poll, Vote, Message, Expense, Settlement, Notification, User 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate join code
const generateJoinCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Storage Services (Using Base64 for reliability in this environment)
export const uploadImage = async (file: File, path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

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

  // Notify existing members
  const membersRef = collection(db, `projects/${projectId}/members`);
  const membersSnap = await getDocs(membersRef);
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userName = userDoc.exists() ? (userDoc.data() as User).name : 'A new member';
  const projectTitle = projectDoc.data().title;

  const notificationPromises = membersSnap.docs
    .filter(doc => doc.id !== userId)
    .map(memberDoc => addNotification(memberDoc.id, {
      title: 'New Member Joined',
      description: `${userName} has joined the project "${projectTitle}"`,
      type: 'system',
      projectId
    }));
  
  await Promise.all(notificationPromises);

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

  const membersSnap = await getDocs(collection(db, `projects/${task.projectId}/members`));
  const projectDoc = await getDoc(doc(db, 'projects', task.projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';
  
  const notificationPromises = membersSnap.docs
    .filter(doc => doc.id !== auth.currentUser?.uid)
    .map(memberDoc => addNotification(memberDoc.id, {
      title: 'New Task',
      description: `A new task "${task.title}" was added in "${projectTitle}"`,
      type: 'task',
      projectId: task.projectId
    }));
  await Promise.all(notificationPromises);
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

export const purchaseItem = async (itemId: string, projectId: string, actualCost: number, purchaserId: string, splits: { userId: string; amount: number }[], proofImageUrl?: string) => {
  const batch = writeBatch(db);
  
  const updateData: any = {
    purchased: true,
    purchasedBy: purchaserId,
    actualCost
  };
  if (proofImageUrl) {
    updateData.proofImageUrl = proofImageUrl;
  }
  
  batch.update(doc(db, `projects/${projectId}/shoppingItems`, itemId), updateData);

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

  const userDoc = await getDoc(doc(db, 'users', purchaserId));
  const purchaserName = userDoc.exists() ? (userDoc.data() as User).name : 'Someone';
  const projectDoc = await getDoc(doc(db, 'projects', projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';

  const notificationPromises = splits
    .filter(split => split.userId !== purchaserId)
    .map(split => addNotification(split.userId, {
      title: 'New Expense',
      description: `${purchaserName} purchased an item in "${projectTitle}". You owe $${split.amount.toFixed(2)}.`,
      type: 'payment',
      projectId
    }));

  await Promise.all(notificationPromises);
};

// Poll Services
export const createPoll = async (poll: Omit<Poll, 'id' | 'closed'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${poll.projectId}/polls`, id), { ...poll, id, closed: false, createdAt: Date.now() });

  const membersSnap = await getDocs(collection(db, `projects/${poll.projectId}/members`));
  const projectDoc = await getDoc(doc(db, 'projects', poll.projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';
  
  const notificationPromises = membersSnap.docs
    .filter(doc => doc.id !== auth.currentUser?.uid)
    .map(memberDoc => addNotification(memberDoc.id, {
      title: 'New Poll',
      description: `A new poll "${poll.question}" was created in "${projectTitle}"`,
      type: 'poll',
      projectId: poll.projectId
    }));
  await Promise.all(notificationPromises);
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

  const membersSnap = await getDocs(collection(db, `projects/${message.projectId}/members`));
  const projectDoc = await getDoc(doc(db, 'projects', message.projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';
  const userDoc = await getDoc(doc(db, 'users', message.userId));
  const userName = userDoc.exists() ? (userDoc.data() as User).name : 'Someone';

  const notificationPromises = membersSnap.docs
    .filter(doc => doc.id !== message.userId)
    .map(memberDoc => addNotification(memberDoc.id, {
      title: 'New Message',
      description: `${userName} sent a message in "${projectTitle}"`,
      type: 'message',
      projectId: message.projectId
    }));
  await Promise.all(notificationPromises);
};

// Expense Services
export const addExpense = async (expense: Omit<Expense, 'id'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${expense.projectId}/expenses`, id), { ...expense, id, date: Date.now() });

  const userDoc = await getDoc(doc(db, 'users', expense.purchaserId));
  const purchaserName = userDoc.exists() ? (userDoc.data() as User).name : 'Someone';
  const projectDoc = await getDoc(doc(db, 'projects', expense.projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';

  const notificationPromises = expense.splits
    .filter(split => split.userId !== expense.purchaserId)
    .map(split => addNotification(split.userId, {
      title: 'New Expense',
      description: `${purchaserName} added an expense "${expense.description}" in "${projectTitle}". You owe $${split.amount.toFixed(2)}.`,
      type: 'payment',
      projectId: expense.projectId
    }));
  
  await Promise.all(notificationPromises);
};

export const settleDebt = async (settlement: Omit<Settlement, 'id' | 'settled' | 'date'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${settlement.projectId}/settlements`, id), { ...settlement, id, settled: true, date: Date.now() });

  const userDoc = await getDoc(doc(db, 'users', settlement.fromUserId));
  const payerName = userDoc.exists() ? (userDoc.data() as User).name : 'Someone';
  const projectDoc = await getDoc(doc(db, 'projects', settlement.projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';

  await addNotification(settlement.toUserId, {
    title: 'Debt Settled',
    description: `${payerName} settled $${settlement.amount.toFixed(2)} with you in "${projectTitle}".`,
    type: 'payment',
    projectId: settlement.projectId
  });
};

// Notification Services
export const markNotificationRead = async (userId: string, notificationId: string) => {
  await updateDoc(doc(db, `users/${userId}/notifications`, notificationId), { read: true });
};

export const addNotification = async (userId: string, notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `users/${userId}/notifications`, id), { ...notification, id, read: false, timestamp: Date.now(), userId });
};

// Error Handling for Firestore Permissions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

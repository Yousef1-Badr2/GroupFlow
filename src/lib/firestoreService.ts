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
  Poll, Vote, Message, Expense, Settlement, Notification, User, Role
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate join code
const generateJoinCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

import imageCompression from 'browser-image-compression';

// Storage Services (Using Base64 for reliability in this environment)
export const uploadImage = async (file: File, path: string): Promise<string> => {
  try {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };
    
    const compressedFile = await imageCompression(file, options);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error('Image compression error:', error);
    // Fallback to original file if compression fails
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => reject(error);
    });
  }
};

// User Services
export const syncUser = async (user: User) => {
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
};

export const generateInviteCode = async (adminId: string, type: 'permanent' | 'temporary' = 'permanent') => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const id = uuidv4();
  // The code itself expires in 1 week if not used
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; 
  await setDoc(doc(db, 'inviteCodes', id), {
    id,
    code,
    used: false,
    createdBy: adminId,
    createdAt: Date.now(),
    expiresAt,
    type
  });
  return code;
};

export const validateAndUseInviteCode = async (userId: string, code: string) => {
  const q = query(collection(db, 'inviteCodes'), where('code', '==', code.toUpperCase()), where('used', '==', false));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('Invalid or already used invite code.');
  }
  
  const codeDoc = snapshot.docs[0];
  const data = codeDoc.data();
  
  if (data.expiresAt && Date.now() > data.expiresAt) {
    throw new Error('This invite code has expired.');
  }
  
  const batch = writeBatch(db);
  
  batch.update(doc(db, 'inviteCodes', codeDoc.id), { used: true, usedBy: userId });
  
  const userUpdate: any = { isApproved: true };
  if (data.type === 'temporary') {
    // Trial lasts 1 week from the moment they use the code
    userUpdate.trialExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  }
  
  batch.update(doc(db, 'users', userId), userUpdate);
  
  await batch.commit();
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

export const updateMemberRole = async (projectId: string, userId: string, role: Role) => {
  await updateDoc(doc(db, `projects/${projectId}/members`, userId), { role });
};

export const leaveProject = async (projectId: string, userId: string, isLeader: boolean) => {
  if (isLeader) {
    const membersSnap = await getDocs(collection(db, `projects/${projectId}/members`));
    const otherMembers = membersSnap.docs.filter(doc => doc.id !== userId);
    
    if (otherMembers.length === 0) {
      // No one else left, delete the project
      await deleteDoc(doc(db, 'projects', projectId));
      await deleteDoc(doc(db, `projects/${projectId}/members`, userId));
    } else {
      // Find co-leaders
      const coLeaders = otherMembers.filter(doc => doc.data().role === 'co-leader');
      let newLeaderId = '';
      
      if (coLeaders.length > 0) {
        // Pick a random co-leader
        const randomIndex = Math.floor(Math.random() * coLeaders.length);
        newLeaderId = coLeaders[randomIndex].id;
      } else {
        // Pick a random member
        const randomIndex = Math.floor(Math.random() * otherMembers.length);
        newLeaderId = otherMembers[randomIndex].id;
      }
      
      const batch = writeBatch(db);
      // Update the new leader's role
      batch.update(doc(db, `projects/${projectId}/members`, newLeaderId), { role: 'leader' });
      // Update the project's leaderId
      batch.update(doc(db, 'projects', projectId), { leaderId: newLeaderId });
      // Remove the old leader
      batch.delete(doc(db, `projects/${projectId}/members`, userId));
      
      await batch.commit();
    }
  } else {
    await deleteDoc(doc(db, `projects/${projectId}/members`, userId));
  }
};

// Task Services
export const addTask = async (task: Omit<Task, 'id' | 'completed'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `projects/${task.projectId}/tasks`, id), { ...task, id, completed: false });

  const projectDoc = await getDoc(doc(db, 'projects', task.projectId));
  const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';
  
  const creatorId = auth.currentUser?.uid;
  let creatorName = 'Someone';
  if (creatorId) {
    const userDoc = await getDoc(doc(db, 'users', creatorId));
    if (userDoc.exists()) {
      creatorName = (userDoc.data() as User).name;
    }
  }
  
  const notificationPromises = task.assignedTo.map(userId => {
    return addNotification(userId, {
      title: 'Task Assigned',
      description: `${creatorName} assigned you a task: "${task.description}" in "${projectTitle}"`,
      type: 'task',
      projectId: task.projectId
    });
  });
  
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

export const deleteShoppingItem = async (projectId: string, itemId: string) => {
  await deleteDoc(doc(db, `projects/${projectId}/shoppingItems`, itemId));
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
  try {
    await updateDoc(doc(db, `projects/${projectId}/polls`, pollId), { closed: true });

    // Get poll data and votes to announce results
    const pollDoc = await getDoc(doc(db, `projects/${projectId}/polls`, pollId));
    if (!pollDoc.exists()) return;
    
    const poll = pollDoc.data() as Poll;
    const votesSnap = await getDocs(query(collection(db, `projects/${projectId}/votes`), where('pollId', '==', pollId)));
    const pollVotes = votesSnap.docs.map(d => d.data() as Vote);
    
    // Calculate results
    const counts: Record<number, number> = {};
    const options = poll.options || [];
    options.forEach((_, i) => counts[i] = 0);
    pollVotes.forEach(v => {
      counts[v.optionIndex] = (counts[v.optionIndex] || 0) + 1;
    });

    let maxVotes = -1;
    let winners: string[] = [];
    
    Object.entries(counts).forEach(([index, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winners = [options[parseInt(index)]];
      } else if (count === maxVotes && maxVotes > 0) {
        winners.push(options[parseInt(index)]);
      }
    });

    const resultText = maxVotes <= 0 
      ? "No votes were cast." 
      : `Winner: ${winners.join(", ")} (${maxVotes} votes)`;

    const membersSnap = await getDocs(collection(db, `projects/${projectId}/members`));
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    const projectTitle = projectDoc.exists() ? (projectDoc.data() as Project).title : 'a project';

    const notificationPromises = membersSnap.docs.map(memberDoc => 
      addNotification(memberDoc.id, {
        title: 'Poll Results',
        description: `The poll "${poll.question || 'Untitled'}" in "${projectTitle}" has ended. ${resultText}`,
        type: 'poll',
        projectId
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error in closePoll:", error);
    throw error;
  }
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

export const deleteExpense = async (projectId: string, expenseId: string) => {
  await deleteDoc(doc(db, `projects/${projectId}/expenses`, expenseId));
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

export const deleteSettlement = async (projectId: string, settlementId: string) => {
  await deleteDoc(doc(db, `projects/${projectId}/settlements`, settlementId));
};

// Notification Services
export const markNotificationRead = async (userId: string, notificationId: string) => {
  await updateDoc(doc(db, `users/${userId}/notifications`, notificationId), { read: true });
};

export const addNotification = async (userId: string, notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
  const id = uuidv4();
  await setDoc(doc(db, `users/${userId}/notifications`, id), { ...notification, id, read: false, timestamp: Date.now(), userId });
};

// Admin Dashboard Services
export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as User);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return []; // Should not reach here as handleFirestoreError throws
  }
};

export const updateUserApproval = async (userId: string, isApproved: boolean) => {
  try {
    await updateDoc(doc(db, 'users', userId), { isApproved });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
  try {
    await updateDoc(doc(db, 'users', userId), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
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

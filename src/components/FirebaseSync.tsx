import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, collectionGroup, documentId, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useStore } from '../store';
import * as firestoreService from '../lib/firestoreService';
import { 
  Project, ProjectMember, Task, ShoppingItem, 
  Poll, Vote, Message, Expense, Settlement, Notification, User 
} from '../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function FirebaseSync() {
  const navigate = useNavigate();
  const { 
    currentUser, setCurrentUser, setAuthReady,
    setProjects, setMembers, setTasks, setShoppingItems, 
    setPolls, setVotes, setMessages, setExpenses, 
    setSettlements, setNotifications, setUsers 
  } = useStore();

  const lastNotificationId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          let userData: User;
          const isAdmin = user.email === 'yousef1mahmoud2@gmail.com';
          
          if (userSnap.exists()) {
            userData = userSnap.data() as User;
            userData.name = userData.name || user.displayName || 'User';
            userData.email = user.email || userData.email || '';
            userData.photoURL = user.photoURL || userData.photoURL || '';
            
            if (isAdmin) {
              userData.isApproved = true;
              userData.role = 'admin';
            } else if (userData.trialExpiresAt && Date.now() > userData.trialExpiresAt && userData.isApproved) {
              // Trial expired
              userData.isApproved = false;
              // Only sync if we actually changed something
              await firestoreService.syncUser(userData);
            }
            
            // For existing users, we don't need to sync every time they log in
            // unless they are new or we changed something (like expiration)
            setCurrentUser(userData);
          } else {
            userData = {
              id: user.uid,
              name: user.displayName || 'User',
              phone: user.phoneNumber || '',
              bio: '',
              email: user.email || '',
              photoURL: user.photoURL || '',
              isApproved: isAdmin,
              role: isAdmin ? 'admin' : 'user'
            };
            setCurrentUser(userData);
            await firestoreService.syncUser(userData);
          }
          
          // Set up real-time listener for the user document
          if (unsubscribeUser) unsubscribeUser();
          unsubscribeUser = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as User;
              // Check for trial expiration in the real-time listener too
              if (data.trialExpiresAt && Date.now() > data.trialExpiresAt && data.isApproved) {
                const expiredData = { ...data, isApproved: false };
                setCurrentUser(expiredData);
                firestoreService.syncUser(expiredData);
              } else {
                setCurrentUser(data);
              }
            }
          });
        } else {
          setCurrentUser(null);
          if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = null;
          }
        }
      } catch (error) {
        console.error("Auth sync error:", error);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [setCurrentUser, setAuthReady]);

  useEffect(() => {
    if (!currentUser || !currentUser.isApproved || !currentUser.trialExpiresAt) return;

    const checkExpiration = () => {
      if (currentUser.trialExpiresAt && Date.now() > currentUser.trialExpiresAt) {
        const expiredUser = { ...currentUser, isApproved: false };
        setCurrentUser(expiredUser);
        firestoreService.syncUser(expiredUser);
        toast.error("Your trial has expired. Please enter a new invite code.");
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    if (!currentUser || !currentUser.isApproved) {
      setProjects([]);
      setMembers([]);
      setTasks([]);
      setShoppingItems([]);
      setPolls([]);
      setVotes([]);
      setMessages([]);
      setExpenses([]);
      setSettlements([]);
      setNotifications([]);
      setUsers([]);
      return;
    }

    // Listen to projects where user is a member
    const membersQuery = query(collectionGroup(db, 'members'), where('userId', '==', currentUser.id));
    
    let unsubscribeAllMembers: (() => void) | null = null;
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeProjects: (() => void) | null = null;
    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeShopping: (() => void) | null = null;
    let unsubscribePolls: (() => void) | null = null;
    let unsubscribeVotes: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeExpenses: (() => void) | null = null;
    let unsubscribeSettlements: (() => void) | null = null;

    const cleanupProjectListeners = () => {
      if (unsubscribeAllMembers) unsubscribeAllMembers();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeProjects) unsubscribeProjects();
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeShopping) unsubscribeShopping();
      if (unsubscribePolls) unsubscribePolls();
      if (unsubscribeVotes) unsubscribeVotes();
      if (unsubscribeExpenses) unsubscribeExpenses();
      if (unsubscribeSettlements) unsubscribeSettlements();
    };

    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const myMemberships = snapshot.docs.map(doc => doc.data() as ProjectMember);
      const projectIds = myMemberships.map(m => m.projectId);
      
      cleanupProjectListeners();

      if (projectIds.length === 0) {
        setMembers([]);
        setProjects([]);
        setUsers([]);
        return;
      }

      // Helper function to chunk arrays
      const chunkArray = <T,>(arr: T[], size: number): T[][] => {
        const chunked: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunked.push(arr.slice(i, i + size));
        }
        return chunked;
      };

      const projectChunks = chunkArray(projectIds, 30);
      
      const allMembersUnsubscribes: (() => void)[] = [];
      const projectsUnsubscribes: (() => void)[] = [];
      const tasksUnsubscribes: (() => void)[] = [];
      const shoppingUnsubscribes: (() => void)[] = [];
      const pollsUnsubscribes: (() => void)[] = [];
      const votesUnsubscribes: (() => void)[] = [];
      const expensesUnsubscribes: (() => void)[] = [];
      const settlementsUnsubscribes: (() => void)[] = [];
      
      let allMembersData: Record<string, ProjectMember[]> = {};
      let projectsData: Record<string, Project[]> = {};
      let tasksData: Record<string, Task[]> = {};
      let shoppingData: Record<string, ShoppingItem[]> = {};
      let pollsData: Record<string, Poll[]> = {};
      let votesData: Record<string, Vote[]> = {};
      let expensesData: Record<string, Expense[]> = {};
      let settlementsData: Record<string, Settlement[]> = {};

      unsubscribeAllMembers = () => allMembersUnsubscribes.forEach(u => u());
      unsubscribeProjects = () => projectsUnsubscribes.forEach(u => u());
      unsubscribeTasks = () => tasksUnsubscribes.forEach(u => u());
      unsubscribeShopping = () => shoppingUnsubscribes.forEach(u => u());
      unsubscribePolls = () => pollsUnsubscribes.forEach(u => u());
      unsubscribeVotes = () => votesUnsubscribes.forEach(u => u());
      unsubscribeExpenses = () => expensesUnsubscribes.forEach(u => u());
      unsubscribeSettlements = () => settlementsUnsubscribes.forEach(u => u());

      projectChunks.forEach((chunk, index) => {
        // Listen to ALL members of these projects
        const allMembersQuery = query(collectionGroup(db, 'members'), where('projectId', 'in', chunk));
        allMembersUnsubscribes.push(onSnapshot(allMembersQuery, (allSnapshot) => {
          allMembersData[index] = allSnapshot.docs.map(doc => doc.data() as ProjectMember);
          const allMembersList = Object.values(allMembersData).flat();
          setMembers(allMembersList);

          // Fetch user details for all members
          const userIds = Array.from(new Set(allMembersList.map(m => m.userId)));
          if (userIds.length > 0) {
            if (unsubscribeUsers) unsubscribeUsers();
            const userChunks = chunkArray(userIds, 30);
            const usersUnsubscribes: (() => void)[] = [];
            let usersData: Record<string, User[]> = {};
            
            userChunks.forEach((uChunk, uIndex) => {
              const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', uChunk));
              usersUnsubscribes.push(onSnapshot(usersQuery, (userSnapshot) => {
                usersData[uIndex] = userSnapshot.docs.map(d => d.data() as User);
                setUsers(Object.values(usersData).flat());
              }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'users')));
            });
            
            unsubscribeUsers = () => usersUnsubscribes.forEach(u => u());
          }
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'members_group')));

        // Listen to projects
        const projectsQuery = query(collection(db, 'projects'), where('id', 'in', chunk));
        projectsUnsubscribes.push(onSnapshot(projectsQuery, (projSnapshot) => {
          projectsData[index] = projSnapshot.docs.map(doc => doc.data() as Project);
          setProjects(Object.values(projectsData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'projects')));

        // Listen to subcollections for each project
        const tasksQuery = query(collectionGroup(db, 'tasks'), where('projectId', 'in', chunk));
        tasksUnsubscribes.push(onSnapshot(tasksQuery, (s) => {
          tasksData[index] = s.docs.map(d => d.data() as Task);
          setTasks(Object.values(tasksData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'tasks_group')));

        const shoppingQuery = query(collectionGroup(db, 'shoppingItems'), where('projectId', 'in', chunk));
        shoppingUnsubscribes.push(onSnapshot(shoppingQuery, (s) => {
          shoppingData[index] = s.docs.map(d => d.data() as ShoppingItem);
          setShoppingItems(Object.values(shoppingData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'shopping_group')));

        const pollsQuery = query(collectionGroup(db, 'polls'), where('projectId', 'in', chunk));
        pollsUnsubscribes.push(onSnapshot(pollsQuery, (s) => {
          pollsData[index] = s.docs.map(d => d.data() as Poll);
          setPolls(Object.values(pollsData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'polls_group')));

        const votesQuery = query(collectionGroup(db, 'votes'), where('projectId', 'in', chunk));
        votesUnsubscribes.push(onSnapshot(votesQuery, (s) => {
          votesData[index] = s.docs.map(d => d.data() as Vote);
          setVotes(Object.values(votesData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'votes_group')));

        const expensesQuery = query(collectionGroup(db, 'expenses'), where('projectId', 'in', chunk));
        expensesUnsubscribes.push(onSnapshot(expensesQuery, (s) => {
          expensesData[index] = s.docs.map(d => d.data() as Expense);
          setExpenses(Object.values(expensesData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'expenses_group')));

        const settlementsQuery = query(collectionGroup(db, 'settlements'), where('projectId', 'in', chunk));
        settlementsUnsubscribes.push(onSnapshot(settlementsQuery, (s) => {
          settlementsData[index] = s.docs.map(d => d.data() as Settlement);
          setSettlements(Object.values(settlementsData).flat());
        }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'settlements_group')));
      });

    }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'my_memberships'));

    // Listen to user notifications
    const notificationsQuery = query(
      collection(db, `users/${currentUser.id}/notifications`),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (s) => {
      const notifications = s.docs.map(d => d.data() as Notification);
      setNotifications(notifications);

      // Trigger toasts for new notifications
      if (notifications.length > 0) {
        const latest = notifications[0];
        if (!isFirstLoad.current && latest.id !== lastNotificationId.current && !latest.read) {
          toast(latest.title, {
            description: latest.description,
            action: {
              label: 'View',
              onClick: () => {
                if (latest.projectId) {
                  const subtab = latest.type === 'message' ? 'chat' : 
                                latest.type === 'task' ? 'tasks' :
                                latest.type === 'poll' ? 'polls' :
                                latest.type === 'payment' ? 'payments' : 'tasks';
                  navigate(`/project/${latest.projectId}/${subtab}`);
                } else {
                  navigate('/notifications');
                }
                firestoreService.markNotificationRead(currentUser.id, latest.id);
              }
            }
          });
        }
        lastNotificationId.current = latest.id;
        isFirstLoad.current = false;
      }
    }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, `users/${currentUser.id}/notifications`));

    return () => {
      unsubscribeMembers();
      cleanupProjectListeners();
      unsubscribeNotifications();
    };
  }, [currentUser, setProjects, setMembers, setTasks, setShoppingItems, setPolls, setVotes, setMessages, setExpenses, setSettlements, setNotifications]);

  return null;
}

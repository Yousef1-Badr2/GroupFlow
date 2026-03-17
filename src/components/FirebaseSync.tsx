import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, collectionGroup, documentId } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useStore } from '../store';
import * as firestoreService from '../lib/firestoreService';
import { 
  Project, ProjectMember, Task, ShoppingItem, 
  Poll, Vote, Message, Expense, Settlement, Notification, User 
} from '../types';

export default function FirebaseSync() {
  const { 
    currentUser, setCurrentUser, setAuthReady,
    setProjects, setMembers, setTasks, setShoppingItems, 
    setPolls, setVotes, setMessages, setExpenses, 
    setSettlements, setNotifications, setUsers 
  } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData: User = {
          id: user.uid,
          name: user.displayName || 'User',
          phone: user.phoneNumber || '',
          bio: '',
          email: user.email || '',
          photoURL: user.photoURL || ''
        };
        setCurrentUser(userData);
        // Sync to Firestore
        await firestoreService.syncUser(userData);
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setCurrentUser, setAuthReady]);

  useEffect(() => {
    if (!currentUser) {
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
    
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const myMemberships = snapshot.docs.map(doc => doc.data() as ProjectMember);
      const projectIds = myMemberships.map(m => m.projectId);
      
      if (projectIds.length === 0) {
        setMembers([]);
        setProjects([]);
        setUsers([]);
        return;
      }

      // Listen to ALL members of these projects
      let unsubscribeUsers: (() => void) | null = null;
      const allMembersQuery = query(collectionGroup(db, 'members'), where('projectId', 'in', projectIds));
      const unsubscribeAllMembers = onSnapshot(allMembersQuery, (allSnapshot) => {
        const allMembersList = allSnapshot.docs.map(doc => doc.data() as ProjectMember);
        setMembers(allMembersList);

        // Fetch user details for all members
        const userIds = Array.from(new Set(allMembersList.map(m => m.userId)));
        if (userIds.length > 0) {
          if (unsubscribeUsers) unsubscribeUsers();
          // Use documentId() for more reliable fetching
          const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', userIds));
          unsubscribeUsers = onSnapshot(usersQuery, (userSnapshot) => {
            setUsers(userSnapshot.docs.map(d => d.data() as User));
          }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'users'));
        }
      }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'members_group'));

      // Listen to projects
      const projectsQuery = query(collection(db, 'projects'), where('id', 'in', projectIds));
      const unsubscribeProjects = onSnapshot(projectsQuery, (projSnapshot) => {
        setProjects(projSnapshot.docs.map(doc => doc.data() as Project));
      }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'projects'));

      // Listen to subcollections for each project
      const tasksQuery = query(collectionGroup(db, 'tasks'), where('projectId', 'in', projectIds));
      const unsubscribeTasks = onSnapshot(tasksQuery, (s) => setTasks(s.docs.map(d => d.data() as Task)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'tasks_group'));

      const shoppingQuery = query(collectionGroup(db, 'shoppingItems'), where('projectId', 'in', projectIds));
      const unsubscribeShopping = onSnapshot(shoppingQuery, (s) => setShoppingItems(s.docs.map(d => d.data() as ShoppingItem)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'shopping_group'));

      const pollsQuery = query(collectionGroup(db, 'polls'), where('projectId', 'in', projectIds));
      const unsubscribePolls = onSnapshot(pollsQuery, (s) => setPolls(s.docs.map(d => d.data() as Poll)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'polls_group'));

      const votesQuery = query(collectionGroup(db, 'votes'), where('projectId', 'in', projectIds));
      const unsubscribeVotes = onSnapshot(votesQuery, (s) => setVotes(s.docs.map(d => d.data() as Vote)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'votes_group'));

      const messagesQuery = query(collectionGroup(db, 'messages'), where('projectId', 'in', projectIds));
      const unsubscribeMessages = onSnapshot(messagesQuery, (s) => setMessages(s.docs.map(d => d.data() as Message)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'messages_group'));

      const expensesQuery = query(collectionGroup(db, 'expenses'), where('projectId', 'in', projectIds));
      const unsubscribeExpenses = onSnapshot(expensesQuery, (s) => setExpenses(s.docs.map(d => d.data() as Expense)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'expenses_group'));

      const settlementsQuery = query(collectionGroup(db, 'settlements'), where('projectId', 'in', projectIds));
      const unsubscribeSettlements = onSnapshot(settlementsQuery, (s) => setSettlements(s.docs.map(d => d.data() as Settlement)), (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'settlements_group'));

      return () => {
        unsubscribeAllMembers();
        if (unsubscribeUsers) unsubscribeUsers();
        unsubscribeProjects();
        unsubscribeTasks();
        unsubscribeShopping();
        unsubscribePolls();
        unsubscribeVotes();
        unsubscribeMessages();
        unsubscribeExpenses();
        unsubscribeSettlements();
      };
    }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, 'my_memberships'));

    // Listen to user notifications
    const notificationsQuery = query(collection(db, `users/${currentUser.id}/notifications`));
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (s) => {
      setNotifications(s.docs.map(d => d.data() as Notification));
    }, (error) => firestoreService.handleFirestoreError(error, firestoreService.OperationType.LIST, `users/${currentUser.id}/notifications`));

    return () => {
      unsubscribeMembers();
      unsubscribeNotifications();
    };
  }, [currentUser, setProjects, setMembers, setTasks, setShoppingItems, setPolls, setVotes, setMessages, setExpenses, setSettlements, setNotifications]);

  return null;
}

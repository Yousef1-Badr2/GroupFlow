import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, collectionGroup } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useStore } from '../store';
import { 
  Project, ProjectMember, Task, ShoppingItem, 
  Poll, Vote, Message, Expense, Settlement, Notification 
} from '../types';

export default function FirebaseSync() {
  const { 
    currentUser, setCurrentUser, setAuthReady,
    setProjects, setMembers, setTasks, setShoppingItems, 
    setPolls, setVotes, setMessages, setExpenses, 
    setSettlements, setNotifications 
  } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          name: user.displayName || 'User',
          phone: user.phoneNumber || '',
          bio: '',
          email: user.email || '',
          photoURL: user.photoURL || ''
        });
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
      return;
    }

    // Listen to projects where user is a member
    // We'll use collectionGroup for members to find all projects the user is in
    const membersQuery = query(collectionGroup(db, 'members'), where('userId', '==', currentUser.id));
    
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const membersList = snapshot.docs.map(doc => doc.data() as ProjectMember);
      setMembers(membersList);

      const projectIds = membersList.map(m => m.projectId);
      
      if (projectIds.length === 0) {
        setProjects([]);
        return;
      }

      // Listen to projects
      const projectsQuery = query(collection(db, 'projects'), where('id', 'in', projectIds));
      const unsubscribeProjects = onSnapshot(projectsQuery, (projSnapshot) => {
        setProjects(projSnapshot.docs.map(doc => doc.data() as Project));
      });

      // Listen to subcollections for each project
      // For simplicity in this prototype, we'll use collectionGroup for these too, 
      // but filtered by the projectIds we know the user is in.
      // Note: Collection group queries might need indexes. 
      // If indexes are missing, we'll see errors in console.
      
      const tasksQuery = query(collectionGroup(db, 'tasks'), where('projectId', 'in', projectIds));
      const unsubscribeTasks = onSnapshot(tasksQuery, (s) => setTasks(s.docs.map(d => d.data() as Task)));

      const shoppingQuery = query(collectionGroup(db, 'shoppingItems'), where('projectId', 'in', projectIds));
      const unsubscribeShopping = onSnapshot(shoppingQuery, (s) => setShoppingItems(s.docs.map(d => d.data() as ShoppingItem)));

      const pollsQuery = query(collectionGroup(db, 'polls'), where('projectId', 'in', projectIds));
      const unsubscribePolls = onSnapshot(pollsQuery, (s) => setPolls(s.docs.map(d => d.data() as Poll)));

      const votesQuery = query(collectionGroup(db, 'votes'), where('projectId', 'in', projectIds));
      const unsubscribeVotes = onSnapshot(votesQuery, (s) => setVotes(s.docs.map(d => d.data() as Vote)));

      const messagesQuery = query(collectionGroup(db, 'messages'), where('projectId', 'in', projectIds));
      const unsubscribeMessages = onSnapshot(messagesQuery, (s) => setMessages(s.docs.map(d => d.data() as Message)));

      const expensesQuery = query(collectionGroup(db, 'expenses'), where('projectId', 'in', projectIds));
      const unsubscribeExpenses = onSnapshot(expensesQuery, (s) => setExpenses(s.docs.map(d => d.data() as Expense)));

      const settlementsQuery = query(collectionGroup(db, 'settlements'), where('projectId', 'in', projectIds));
      const unsubscribeSettlements = onSnapshot(settlementsQuery, (s) => setSettlements(s.docs.map(d => d.data() as Settlement)));

      return () => {
        unsubscribeProjects();
        unsubscribeTasks();
        unsubscribeShopping();
        unsubscribePolls();
        unsubscribeVotes();
        unsubscribeMessages();
        unsubscribeExpenses();
        unsubscribeSettlements();
      };
    });

    // Listen to user notifications
    const notificationsQuery = query(collection(db, `users/${currentUser.id}/notifications`));
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (s) => {
      setNotifications(s.docs.map(d => d.data() as Notification));
    });

    return () => {
      unsubscribeMembers();
      unsubscribeNotifications();
    };
  }, [currentUser, setProjects, setMembers, setTasks, setShoppingItems, setPolls, setVotes, setMessages, setExpenses, setSettlements, setNotifications]);

  return null;
}

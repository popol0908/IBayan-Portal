import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Real-time notification listener.
 * Returns { notifications, unreadCount, markAsRead, markAllAsRead }
 */
const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Only filter by userId — no orderBy to avoid needing a composite index.
    // We sort client-side instead.
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Convert Firestore Timestamp to JS Date for display
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }));
      // Sort newest-first client-side
      items.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    }, (err) => {
      console.error('useNotifications error:', err);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  /** Mark a single notification as read */
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (err) {
      console.error('markAsRead error:', err);
    }
  };

  /** Mark ALL unread notifications as read (batch) */
  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('markAllAsRead error:', err);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
};

export default useNotifications;

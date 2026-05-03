import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Writes an activity log entry to the `activityLogs` collection.
 *
 * @param {'created'|'updated'|'deleted'|'approved'|'declined'} action
 * @param {'announcements'|'events'|'residents'|'households'|'adminAccounts'} module
 * @param {string} description - Human-readable summary, e.g. "Created announcement 'Clean-Up Drive'"
 * @param {{ uid: string, displayName: string }} user - The admin who performed the action
 */
export const addActivityLog = async (action, module, description, user) => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      action,
      module,
      description,
      performedBy: user?.uid || null,
      performedByName: user?.displayName || 'Admin',
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Activity logging should never block the main operation
    console.warn('Activity log write skipped:', error.message);
  }
};

/**
 * Subscribes to the most recent activity log entries in real time.
 *
 * @param {function} callback - Receives an array of log entries
 * @param {number} [count=20] - Max entries to return
 * @returns {function} Unsubscribe function
 */
export const subscribeToRecentActivity = (callback, count = 20) => {
  try {
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(count),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(logs);
      },
      (error) => {
        console.error('Error subscribing to activity logs:', error);
        callback([]);
      },
    );
  } catch (error) {
    console.error('Error setting up activity log subscription:', error);
    return () => {};
  }
};

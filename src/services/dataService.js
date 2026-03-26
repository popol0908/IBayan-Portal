import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { archiveRecord, archiveRecords } from './archiveService';

// Cache for real-time listeners
const listeners = {};
const dataCache = {};

/**
 * Get all documents from a collection
 */
export const getSharedData = async (section) => {
  try {
    const collectionRef = collection(db, section);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching ${section}:`, error);
    return [];
  }
};

/**
 * Add a new item to a collection
 */
export const addItem = async (section, item) => {
  try {
    const collectionRef = collection(db, section);
    const docRef = await addDoc(collectionRef, {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      id: docRef.id,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error adding item to ${section}:`, error);
    throw error;
  }
};

/**
 * Update an existing item in a collection
 */
export const updateItem = async (section, id, updates) => {
  try {
    const docRef = doc(db, section, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error updating item in ${section}:`, error);
    throw error;
  }
};

/**
 * Delete an item from a collection (archives it first)
 * @param {string} section - Collection name
 * @param {string} id - Document ID
 * @param {string} archivedBy - Optional: User ID who performed the deletion
 * @param {string} archivedByEmail - Optional: Email of the user who performed the deletion
 */
export const deleteItem = async (section, id, archivedBy = null, archivedByEmail = null) => {
  try {
    // Archive the record before deleting
    await archiveRecord(section, id, archivedBy, archivedByEmail);
    
    // Delete the original document
    const docRef = doc(db, section, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting item from ${section}:`, error);
    throw error;
  }
};

/**
 * Subscribe to real-time changes in a collection
 * Returns unsubscribe function
 */
export const subscribeToChanges = (section, callback) => {
  try {
    const collectionRef = collection(db, section);
    
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      dataCache[section] = data;
      callback(data);
    }, (error) => {
      console.error(`Error subscribing to ${section}:`, error);
    });

    listeners[section] = unsubscribe;
    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up subscription for ${section}:`, error);
    return () => {};
  }
};

/**
 * Query documents with a where clause
 */
export const queryData = async (section, whereClause) => {
  try {
    const collectionRef = collection(db, section);
    const q = query(collectionRef, where(...whereClause));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error querying ${section}:`, error);
    return [];
  }
};

/**
 * Subscribe to filtered documents with real-time updates
 */
export const subscribeToFilteredData = (section, whereClause, callback) => {
  try {
    const collectionRef = collection(db, section);
    const q = query(collectionRef, where(...whereClause));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    }, (error) => {
      console.error(`Error subscribing to filtered ${section}:`, error);
    });

    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up filtered subscription for ${section}:`, error);
    return () => {};
  }
};

/**
 * Batch update multiple documents
 */
export const batchUpdateItems = async (section, updates) => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const docRef = doc(db, section, id);
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error batch updating ${section}:`, error);
    throw error;
  }
};

/**
 * Clear all listeners
 */
export const clearAllListeners = () => {
  Object.values(listeners).forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  Object.keys(listeners).forEach(key => delete listeners[key]);
};

/**
 * Legacy function for compatibility - returns cached data
 */
export const getAllData = async () => {
  const sections = ['announcements', 'emergencyAlerts', 'feedback', 'voting', 'userVotes'];
  const allData = {};
  
  for (const section of sections) {
    allData[section] = await getSharedData(section);
  }
  
  return allData;
};

/**
 * Initialize storage (no-op for Firestore)
 */
export const initializeStorage = () => {
  // Firestore initialization is handled in firebase.js
};

/**
 * Export data to JSON
 */
export const exportData = async () => {
  try {
    const data = await getAllData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barangay_data_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
  }
};

/**
 * Clear a section (archives all documents before deleting)
 * @param {string} section - Collection name
 * @param {string} archivedBy - Optional: User ID who performed the deletion
 * @param {string} archivedByEmail - Optional: Email of the user who performed the deletion
 */
export const clearSection = async (section, archivedBy = null, archivedByEmail = null) => {
  try {
    const collectionRef = collection(db, section);
    const snapshot = await getDocs(collectionRef);
    
    // Archive all documents first
    const recordIds = snapshot.docs.map(doc => doc.id);
    if (recordIds.length > 0) {
      await archiveRecords(section, recordIds, archivedBy, archivedByEmail);
    }
    
    // Delete all documents
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error clearing ${section}:`, error);
    throw error;
  }
};

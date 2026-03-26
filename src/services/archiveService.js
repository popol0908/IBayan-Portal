import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Archive a record before deletion
 * @param {string} originalCollection - The original collection name
 * @param {string} recordId - The ID of the record to archive
 * @param {string} archivedBy - The user ID who performed the deletion
 * @param {string} archivedByEmail - The email of the user who performed the deletion
 * @returns {Promise<boolean>} - Success status
 */
export const archiveRecord = async (originalCollection, recordId, archivedBy = null, archivedByEmail = null) => {
  try {
    // Get the original document
    const docRef = doc(db, originalCollection, recordId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn(`Document ${recordId} does not exist in ${originalCollection}`);
      return false;
    }

    const originalData = docSnap.data();
    
    // Create archive document with metadata
    const archiveData = {
      ...originalData,
      originalId: recordId,
      originalCollection: originalCollection,
      archivedAt: serverTimestamp(),
      archivedBy: archivedBy,
      archivedByEmail: archivedByEmail,
      archivedDate: new Date().toISOString()
    };

    // Store in archive collection (archived_{collectionName})
    const archiveCollectionName = `archived_${originalCollection}`;
    const archiveCollectionRef = collection(db, archiveCollectionName);
    
    await addDoc(archiveCollectionRef, archiveData);
    
    return true;
  } catch (error) {
    console.error(`Error archiving record from ${originalCollection}:`, error);
    throw error;
  }
};

/**
 * Archive multiple records in batch
 * @param {string} originalCollection - The original collection name
 * @param {Array<string>} recordIds - Array of record IDs to archive
 * @param {string} archivedBy - The user ID who performed the deletion
 * @param {string} archivedByEmail - The email of the user who performed the deletion
 * @returns {Promise<boolean>} - Success status
 */
export const archiveRecords = async (originalCollection, recordIds, archivedBy = null, archivedByEmail = null) => {
  try {
    const archivePromises = recordIds.map(recordId => 
      archiveRecord(originalCollection, recordId, archivedBy, archivedByEmail)
    );
    
    await Promise.all(archivePromises);
    return true;
  } catch (error) {
    console.error(`Error archiving records from ${originalCollection}:`, error);
    throw error;
  }
};




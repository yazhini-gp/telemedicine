import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db, pharmacyDb } from './firebase';

// Users Collection
export const usersCollection = collection(db, 'users');

export const createUser = async (userData) => {
  try {
    console.log('API: Creating user with data:', userData);
    
    // Use setDoc with the user's UID as the document ID
    const userRef = doc(db, 'users', userData.id || userData.uid);
    console.log('API: User document reference:', userRef.path);
    
    const userDocData = {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('API: Setting document with data:', userDocData);
    await setDoc(userRef, userDocData);
    console.log('API: User document created successfully');
    
    return userRef.id;
  } catch (error) {
    console.error('API: Error creating user:', error);
    console.error('API: Error code:', error.code);
    console.error('API: Error message:', error.message);
    throw error;
  }
};

export const getUser = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const getUsersByRole = async (role) => {
  try {
    const q = query(usersCollection, where('role', '==', role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw error;
  }
};


// Consultations Collection
export const consultationsCollection = collection(db, 'consultations');

export const createConsultation = async (consultationData) => {
  try {
    const docRef = await addDoc(consultationsCollection, {
      ...consultationData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating consultation:', error);
    throw error;
  }
};

export const getPatientConsultations = async (patientId) => {
  try {
    const q = query(
      consultationsCollection, 
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting patient consultations:', error);
    throw error;
  }
};

export const getDoctorConsultations = async (doctorId) => {
  try {
    const q = query(
      consultationsCollection, 
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting doctor consultations:', error);
    throw error;
  }
};

export const updateConsultationStatus = async (consultationId, status) => {
  try {
    const docRef = doc(db, 'consultations', consultationId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating consultation status:', error);
    throw error;
  }
};

// Prescriptions Collection
export const prescriptionsCollection = collection(db, 'prescriptions');

export const createPrescription = async (prescriptionData) => {
  try {
    const docRef = await addDoc(prescriptionsCollection, {
      ...prescriptionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating prescription:', error);
    throw error;
  }
};

export const getPatientPrescriptions = async (patientId) => {
  try {
    const q = query(
      prescriptionsCollection, 
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting patient prescriptions:', error);
    // Fallback without orderBy (e.g., when composite index is missing)
    try {
      const q = query(
        prescriptionsCollection,
        where('patientId', '==', patientId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      throw error;
    }
  }
};

export const getDoctorPrescriptions = async (doctorId) => {
  try {
    const q = query(
      prescriptionsCollection,
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting doctor prescriptions:', error);
    // Fallback without orderBy
    try {
      const q = query(
        prescriptionsCollection,
        where('doctorId', '==', doctorId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      throw error;
    }
  }
};

// Medical Centers Collection
export const medicalCentersCollection = collection(db, 'medical_centers');

export const getMedicalCenters = async () => {
  try {
    // Try multiple common collection names and merge results
    const collectionNames = ['medical_centers', 'medicalCenters', 'centers'];
    const snapshots = await Promise.all(
      collectionNames.map((name) => getDocs(collection(db, name)).catch(() => null))
    );

    const allDocs = snapshots
      .filter(Boolean)
      .flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));

    // Dedupe by id (first occurrence wins)
    const dedupedMap = new Map();
    for (const item of allDocs) {
      if (!dedupedMap.has(item.id)) dedupedMap.set(item.id, item);
    }
    return Array.from(dedupedMap.values());
  } catch (error) {
    console.error('Error getting medical centers:', error);
    throw error;
  }
};

// Chatbot Sessions Collection
export const chatbotSessionsCollection = collection(db, 'chatbot_sessions');

export const createChatbotSession = async (sessionData) => {
  try {
    const docRef = await addDoc(chatbotSessionsCollection, {
      ...sessionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating chatbot session:', error);
    throw error;
  }
};

export const getPatientChatbotSessions = async (patientId) => {
  try {
    const q = query(
      chatbotSessionsCollection, 
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting patient chatbot sessions:', error);
    throw error;
  }
};

// Reports Collection
export const reportsCollection = collection(db, 'reports');

export const createReport = async (reportData) => {
  try {
    const docRef = await addDoc(reportsCollection, {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
};

export const getPatientReports = async (patientId) => {
  try {
    const q = query(
      reportsCollection, 
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting patient reports:', error);
    // Fallback without orderBy (e.g., when composite index is missing)
    try {
      console.log('Trying fallback query without orderBy...');
      const q = query(
        reportsCollection,
        where('patientId', '==', patientId)
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by createdAt
      return reports.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      throw error;
    }
  }
};

export const getDoctorReports = async (doctorId) => {
  try {
    const q = query(
      reportsCollection, 
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting doctor reports:', error);
    // Fallback without orderBy
    try {
      console.log('Trying fallback query without orderBy...');
      const q = query(
        reportsCollection,
        where('doctorId', '==', doctorId)
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by createdAt
      return reports.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      throw error;
    }
  }
};

export const updateReport = async (reportId, reportData) => {
  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      ...reportData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating report:', error);
    throw error;
  }
};

export const deleteReport = async (reportId) => {
  try {
    const docRef = doc(db, 'reports', reportId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};

export const getReportById = async (reportId) => {
  try {
    const docRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting report by ID:', error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToConsultations = (doctorId, callback) => {
  const q = query(
    consultationsCollection, 
    where('doctorId', '==', doctorId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const consultations = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    callback(consultations);
  });
};

export const subscribeToPatientReports = (patientId, callback) => {
  const q = query(
    reportsCollection, 
    where('patientId', '==', patientId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const reports = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    callback(reports);
  });
};

// Real-time patient prescriptions listener
export const subscribeToPatientPrescriptions = (patientId, callback) => {
  const orderedQuery = query(
    prescriptionsCollection,
    where('patientId', '==', patientId),
    orderBy('createdAt', 'desc')
  );

  // First try ordered listener; on error (e.g., missing index), fall back
  const unsubscribe = onSnapshot(orderedQuery, {
    next: (querySnapshot) => {
      const prescriptions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(prescriptions);
    },
    error: () => {
      const fallbackQuery = query(
        prescriptionsCollection,
        where('patientId', '==', patientId)
      );
      // Start fallback listener
      const unsubFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
        const prescriptions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(prescriptions);
      });
      // Return fallback unsubscriber from wrapper
      unsubscribe();
      return unsubFallback;
    }
  });

  return unsubscribe;
};

// Real-time doctor prescriptions listener
export const subscribeToDoctorPrescriptions = (doctorId, callback) => {
  const orderedQuery = query(
    prescriptionsCollection,
    where('doctorId', '==', doctorId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(orderedQuery, {
    next: (querySnapshot) => {
      const prescriptions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(prescriptions);
    },
    error: () => {
      const fallbackQuery = query(
        prescriptionsCollection,
        where('doctorId', '==', doctorId)
      );
      const unsubFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
        const prescriptions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(prescriptions);
      });
      unsubscribe();
      return unsubFallback;
    }
  });

  return unsubscribe;
};

// Real-time doctor reports listener (reports created by doctor)
export const subscribeToDoctorReports = (doctorId, callback) => {
  const orderedQuery = query(
    reportsCollection,
    where('doctorId', '==', doctorId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(orderedQuery, {
    next: (querySnapshot) => {
      const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(reports);
    },
    error: () => {
      const fallbackQuery = query(
        reportsCollection,
        where('doctorId', '==', doctorId)
      );
      const unsubFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
        const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reports);
      });
      unsubscribe();
      return unsubFallback;
    }
  });

  return unsubscribe;
};

// Real-time shared reports listener (reports visible to both doctor and patient)
export const subscribeToSharedReports = (userId, userRole, callback) => {
  let unsubscribe;
  
  if (userRole === 'doctor' || userRole === 'admin') {
    // For doctors, listen to all reports they created
    const orderedQuery = query(
      reportsCollection,
      where('doctorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(orderedQuery, {
      next: (querySnapshot) => {
        const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reports);
      },
      error: () => {
        const fallbackQuery = query(
          reportsCollection,
          where('doctorId', '==', userId)
        );
        const unsubFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
          const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(reports);
        });
        unsubscribe();
        return unsubFallback;
      }
    });
  } else if (userRole === 'patient') {
    // For patients, listen to all reports for them
    const orderedQuery = query(
      reportsCollection,
      where('patientId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(orderedQuery, {
      next: (querySnapshot) => {
        const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reports);
      },
      error: () => {
        const fallbackQuery = query(
          reportsCollection,
          where('patientId', '==', userId)
        );
        const unsubFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
          const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(reports);
        });
        unsubscribe();
        return unsubFallback;
      }
    });
  }

  return unsubscribe;
};

// Pharmacy Collections - Access to pharmacy stock data
export const pharmaciesCollection = collection(db, 'pharmacies');
export const medicinesCollection = collection(db, 'medicines');

// Get pharmacy details by ID
export const getPharmacyById = async (pharmacyId) => {
  try {
    // Try primary DB first
    let docSnap = await getDoc(doc(db, 'pharmacies', pharmacyId)).catch(() => null);
    if (docSnap && docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    // Fallback to secondary NabhaPharmacies DB
    if (pharmacyDb) {
      docSnap = await getDoc(doc(pharmacyDb, 'pharmacies', pharmacyId)).catch(() => null);
      if (docSnap && docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting pharmacy by ID:', error);
    throw error;
  }
};

// Get all pharmacies
export const getAllPharmacies = async () => {
  try {
    // Try primary DB first
    const primarySnap = await getDocs(collection(db, 'pharmacies')).catch(() => null);
    let list = primarySnap ? primarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    // If none, try secondary NabhaPharmacies DB
    if ((!list || list.length === 0) && pharmacyDb) {
      const secondarySnap = await getDocs(collection(pharmacyDb, 'pharmacies')).catch(() => null);
      if (secondarySnap) list = secondarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return list;
  } catch (error) {
    console.error('Error getting all pharmacies:', error);
    throw error;
  }
};

// Get pharmacy stock details (from pharmacy-1)
export const getPharmacyStock = async (pharmacyId = 'pharmacy-1') => {
  try {
    // Try primary DB first
    let pharmacySnap = await getDoc(doc(db, 'pharmacies', pharmacyId)).catch(() => null);
    if (pharmacySnap && pharmacySnap.exists()) {
      const pharmacyData = pharmacySnap.data();
      // If stock exists on the pharmacy document, use it
      if (pharmacyData.stock && Object.keys(pharmacyData.stock).length > 0) {
        return {
          pharmacy: { id: pharmacySnap.id, ...pharmacyData },
          stock: pharmacyData.stock
        };
      }
    }

    // Fallback: Secondary NabhaPharmacies DB
    if (pharmacyDb) {
      pharmacySnap = await getDoc(doc(pharmacyDb, 'pharmacies', pharmacyId)).catch(() => null);
      if (pharmacySnap && pharmacySnap.exists()) {
        const pharmacyData = pharmacySnap.data();
        if (pharmacyData.stock && Object.keys(pharmacyData.stock).length > 0) {
          return {
            pharmacy: { id: pharmacySnap.id, ...pharmacyData },
            stock: pharmacyData.stock
          };
        }

        // Also try subcollection 'pharmacies/{id}/stock' with per-medicine documents
        const stockCol = collection(pharmacyDb, 'pharmacies', pharmacyId, 'stock');
        let stockSnap = await getDocs(stockCol).catch(() => null);
        if (stockSnap && !stockSnap.empty) {
          const stock = stockSnap.docs.reduce((acc, d) => {
            const data = d.data();
            const quantityFromFields = typeof data.quantity === 'number' ? data.quantity : (typeof data.stock === 'number' ? data.stock : undefined);
            const quantity = data.out_of_stock === true ? 0 : quantityFromFields;
            acc[d.id] = {
              name: data.medicine_name || data.name || d.id,
              quantity,
              unit: data.unit,
              category: data.category,
              price: data.price,
              out_of_stock: data.out_of_stock === true
            };
            return acc;
          }, {});
          return {
            pharmacy: { id: pharmacySnap.id, ...pharmacyData },
            stock
          };
        }

        // Try alternative subcollection name 'medicines'
        const medicinesSubCol = collection(pharmacyDb, 'pharmacies', pharmacyId, 'medicines');
        stockSnap = await getDocs(medicinesSubCol).catch(() => null);
        if (stockSnap && !stockSnap.empty) {
          const stock = stockSnap.docs.reduce((acc, d) => {
            const data = d.data();
            const quantityFromFields = typeof data.quantity === 'number' ? data.quantity : (typeof data.stock === 'number' ? data.stock : undefined);
            const quantity = data.out_of_stock === true ? 0 : quantityFromFields;
            acc[d.id] = {
              name: data.medicine_name || data.name || d.id,
              quantity,
              unit: data.unit,
              category: data.category,
              price: data.price,
              out_of_stock: data.out_of_stock === true
            };
            return acc;
          }, {});
          return {
            pharmacy: { id: pharmacySnap.id, ...pharmacyData },
            stock
          };
        }
      }
    }

    // Final fallback: build stock object from flat medicines collection
    // Primary DB first
    let medsSnap = await getDocs(medicinesCollection).catch(() => null);
    let meds = medsSnap ? medsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    if ((!meds || meds.length === 0) && pharmacyDb) {
      medsSnap = await getDocs(collection(pharmacyDb, 'medicines')).catch(() => null);
      meds = medsSnap ? medsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    }

    if (meds && meds.length > 0) {
      const stock = meds.reduce((acc, m) => {
        acc[m.id] = {
          name: m.name || m.id,
          quantity: typeof m.stock === 'number' ? m.stock : undefined,
          category: m.category,
          price: m.price
        };
        return acc;
      }, {});
      return {
        pharmacy: { id: pharmacyId },
        stock
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting pharmacy stock:', error);
    throw error;
  }
};

// Get all medicines from the flat medicines collection
export const getAllMedicines = async () => {
  try {
    // Primary DB
    let querySnapshot = await getDocs(medicinesCollection).catch(() => null);
    let list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    // Fallback to secondary DB if empty
    if ((!list || list.length === 0) && pharmacyDb) {
      querySnapshot = await getDocs(collection(pharmacyDb, 'medicines')).catch(() => null);
      list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    }

    return list;
  } catch (error) {
    console.error('Error getting all medicines:', error);
    throw error;
  }
};

// Search medicines by name
export const searchMedicines = async (searchTerm) => {
  try {
    // Primary DB
    const primaryQuery = query(
      medicinesCollection,
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\\uf8ff')
    );
    let querySnapshot = await getDocs(primaryQuery).catch(() => null);
    let list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    if ((!list || list.length === 0) && pharmacyDb) {
      const secondaryQuery = query(
        collection(pharmacyDb, 'medicines'),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\\uf8ff')
      );
      querySnapshot = await getDocs(secondaryQuery).catch(() => null);
      list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    }

    return list;
  } catch (error) {
    console.error('Error searching medicines:', error);
    throw error;
  }
};

// Get medicine by ID
export const getMedicineById = async (medicineId) => {
  try {
    let docSnap = await getDoc(doc(db, 'medicines', medicineId)).catch(() => null);
    if (docSnap && docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    if (pharmacyDb) {
      docSnap = await getDoc(doc(pharmacyDb, 'medicines', medicineId)).catch(() => null);
      if (docSnap && docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting medicine by ID:', error);
    throw error;
  }
};

// Get medicines by category
export const getMedicinesByCategory = async (category) => {
  try {
    let qPrimary = query(medicinesCollection, where('category', '==', category));
    let querySnapshot = await getDocs(qPrimary).catch(() => null);
    let list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    if ((!list || list.length === 0) && pharmacyDb) {
      const qSecondary = query(collection(pharmacyDb, 'medicines'), where('category', '==', category));
      querySnapshot = await getDocs(qSecondary).catch(() => null);
      list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    }

    return list;
  } catch (error) {
    console.error('Error getting medicines by category:', error);
    throw error;
  }
};

// Get medicines with low stock
export const getLowStockMedicines = async (threshold = 10) => {
  try {
    let qPrimary = query(medicinesCollection, where('stock', '<=', threshold));
    let querySnapshot = await getDocs(qPrimary).catch(() => null);
    let list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    if ((!list || list.length === 0) && pharmacyDb) {
      const qSecondary = query(collection(pharmacyDb, 'medicines'), where('stock', '<=', threshold));
      querySnapshot = await getDocs(qSecondary).catch(() => null);
      list = querySnapshot ? querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    }

    return list;
  } catch (error) {
    console.error('Error getting low stock medicines:', error);
    throw error;
  }
};

// Real-time pharmacy stock listener
export const subscribeToPharmacyStock = (pharmacyId, callback) => {
  const docRef = doc(db, 'pharmacies', pharmacyId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const pharmacyData = docSnap.data();
      callback({
        pharmacy: { id: docSnap.id, ...pharmacyData },
        stock: pharmacyData.stock || null
      });
    } else {
      callback(null);
    }
  });
};

// Real-time medicines listener
export const subscribeToMedicines = (callback) => {
  try {
    return onSnapshot(medicinesCollection, (querySnapshot) => {
      const medicines = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(medicines);
    });
  } catch (e) {
    if (pharmacyDb) {
      return onSnapshot(collection(pharmacyDb, 'medicines'), (querySnapshot) => {
        const medicines = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(medicines);
      });
    }
    throw e;
  }
};
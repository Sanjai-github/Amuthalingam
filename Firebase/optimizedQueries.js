import firebase from './config';

/**
 * Fetch data with pagination for any collection
 * 
 * @param {String} collectionPath - The path to the collection
 * @param {Number} limit - Number of documents to fetch per page
 * @param {Object} startAfter - Last document from previous batch (for pagination)
 * @param {Array} orderBy - Array of objects with field and direction for sorting
 * @param {Object} filters - Object containing filter conditions
 * @returns {Object} Object containing documents and lastVisible document
 */
export const fetchPaginatedData = async (
  collectionPath, 
  limit = 10, 
  startAfter = null, 
  orderBy = [{ field: 'createdAt', direction: 'desc' }],
  filters = {}
) => {
  try {
    // Start building the query
    let query = firebase.firestore().collection(collectionPath);
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle advanced filters like >, <, >=, <=
        const { operator, value: filterValue } = value;
        query = query.where(field, operator, filterValue);
      } else if (value !== undefined && value !== null) {
        // Simple equality filter
        query = query.where(field, '==', value);
      }
    });
    
    // Apply ordering
    orderBy.forEach(({ field, direction }) => {
      query = query.orderBy(field, direction);
    });
    
    // Apply pagination
    query = query.limit(limit);
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    // Execute query
    const snapshot = await query.get();
    
    // Get the last visible document for next pagination
    const lastVisible = snapshot.docs.length > 0 
      ? snapshot.docs[snapshot.docs.length - 1] 
      : null;
    
    // Convert documents to data objects
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { 
      documents, 
      lastVisible,
      hasMore: documents.length === limit
    };
  } catch (error) {
    console.error("Error fetching paginated data:", error);
    throw error;
  }
};

/**
 * Fetch transactions with pagination
 * 
 * @param {String} entityType - 'vendors' or 'customers'
 * @param {String} entityId - ID of the vendor or customer
 * @param {Number} limit - Number of transactions to fetch
 * @param {Object} startAfter - Last document from previous batch
 * @returns {Object} Object containing transactions and pagination info
 */
export const fetchPaginatedTransactions = async (
  entityType, 
  entityId, 
  limit = 10, 
  startAfter = null
) => {
  const collectionPath = `${entityType}/${entityId}/transactions`;
  return fetchPaginatedData(
    collectionPath, 
    limit, 
    startAfter,
    [{ field: 'date', direction: 'desc' }]
  );
};

/**
 * Fetch vendors or customers with pagination
 * 
 * @param {String} entityType - 'vendors' or 'customers'
 * @param {Number} limit - Number of entities to fetch
 * @param {Object} startAfter - Last document from previous batch
 * @param {Object} filters - Filtering criteria
 * @returns {Object} Object containing entities and pagination info
 */
export const fetchPaginatedEntities = async (
  entityType, 
  limit = 20, 
  startAfter = null,
  filters = {}
) => {
  return fetchPaginatedData(
    entityType, 
    limit, 
    startAfter,
    [{ field: 'name', direction: 'asc' }],
    filters
  );
};

/**
 * Search entities by name with pagination
 * 
 * @param {String} entityType - 'vendors' or 'customers'
 * @param {String} searchTerm - Name to search for
 * @param {Number} limit - Number of results to return
 * @param {Object} startAfter - Last document from previous batch
 * @returns {Object} Object containing search results and pagination info
 */
export const searchEntitiesByName = async (
  entityType, 
  searchTerm, 
  limit = 10, 
  startAfter = null
) => {
  try {
    // Convert search term to lowercase for case-insensitive search
    const searchTermLower = searchTerm.toLowerCase();
    
    // Get the end range for the search term
    const searchTermEnd = searchTermLower + '\uf8ff';
    
    return fetchPaginatedData(
      entityType,
      limit,
      startAfter,
      [{ field: 'nameLower', direction: 'asc' }],
      {
        nameLower: { operator: '>=', value: searchTermLower },
        nameLowerEnd: { operator: '<=', value: searchTermEnd }
      }
    );
  } catch (error) {
    console.error("Error searching entities:", error);
    throw error;
  }
};

/**
 * Get aggregated summary with efficient querying
 * 
 * @param {String} userId - User ID
 * @param {Date} startDate - Start date for the summary
 * @param {Date} endDate - End date for the summary
 * @returns {Object} Summary object with totals and counts
 */
export const getOptimizedSummary = async (userId, startDate, endDate) => {
  try {
    // Reference to the summaries collection
    const summariesRef = firebase.firestore()
      .collection('summaries')
      .where('userId', '==', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate);
      
    const snapshot = await summariesRef.get();
    
    // Aggregate the summary data
    let totalIncome = 0;
    let totalExpenses = 0;
    let vendorCount = 0;
    let customerCount = 0;
    let transactionCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalIncome += data.income || 0;
      totalExpenses += data.expenses || 0;
      vendorCount = Math.max(vendorCount, data.vendorCount || 0);
      customerCount = Math.max(customerCount, data.customerCount || 0);
      transactionCount += data.transactionCount || 0;
    });
    
    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      vendorCount,
      customerCount,
      transactionCount
    };
  } catch (error) {
    console.error("Error getting optimized summary:", error);
    throw error;
  }
};

// Export indexing configuration for documentation
export const firestoreIndexes = {
  vendors: [
    { fieldPath: 'name', order: 'ASCENDING' },
    { fieldPath: 'nameLower', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ],
  customers: [
    { fieldPath: 'name', order: 'ASCENDING' },
    { fieldPath: 'nameLower', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ],
  transactions: [
    { fieldPath: 'date', order: 'DESCENDING' },
    { fieldPath: 'amount', order: 'DESCENDING' }
  ],
  summaries: [
    { fieldPath: 'userId', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'ASCENDING' }
  ]
};

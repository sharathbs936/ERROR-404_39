// Firebase Configuration (Mocked with localStorage adapter for demo)
// Ready for real Firebase integration - just replace these functions with actual Firebase SDK calls

const firebaseConfig = {
  apiKey: "AIzaSyDemoKeyForMediFind123",
  authDomain: "medifind-demo.firebaseapp.com",
  projectId: "medifind-demo",
  storageBucket: "medifind-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

// Mocked Firebase operations using localStorage
const firebaseDB = {
  // User collections
  users: {
    set: (uid, data) => storageJSON(`firebase_user_${uid}`, data),
    get: (uid) => storageJSON(`firebase_user_${uid}`),
  },

  // AI Consultations collection
  aiConsultations: {
    add: (uid, data) => {
      const consulId = `ai_consult_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
      data.consultationId = consulId;
      data.createdAt = new Date().toISOString();
      data.status = 'confirmed';
      const list = storageJSON(`medifind_ai_consultations_${uid}`) || [];
      list.push(data);
      storageJSON(`medifind_ai_consultations_${uid}`, list);
      return { id: consulId, ...data };
    },
    getAll: (uid) => storageJSON(`medifind_ai_consultations_${uid}`) || [],
    update: (uid, consulId, data) => {
      const list = storageJSON(`medifind_ai_consultations_${uid}`) || [];
      const idx = list.findIndex(c => c.consultationId === consulId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
        storageJSON(`medifind_ai_consultations_${uid}`, list);
      }
    },
    delete: (uid, consulId) => {
      const list = storageJSON(`medifind_ai_consultations_${uid}`) || [];
      const filtered = list.filter(c => c.consultationId !== consulId);
      storageJSON(`medifind_ai_consultations_${uid}`, filtered);
    }
  },

  // Medicine Orders collection
  orders: {
    add: (uid, data) => {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
      data.orderId = orderId;
      data.createdAt = new Date().toISOString();
      data.status = 'placed';
      const list = storageJSON(`medifind_orders_${uid}`) || [];
      list.push(data);
      storageJSON(`medifind_orders_${uid}`, list);
      storageJSON(`medifind_order_${orderId}`, data);
      return { id: orderId, ...data };
    },
    getAll: (uid) => storageJSON(`medifind_orders_${uid}`) || [],
    get: (orderId) => storageJSON(`medifind_order_${orderId}`),
    update: (orderId, data) => {
      storageJSON(`medifind_order_${orderId}`, { ...storageJSON(`medifind_order_${orderId}`), ...data, updatedAt: new Date().toISOString() });
      const uid = getCurrentUser();
      if (uid) {
        const list = storageJSON(`medifind_orders_${uid}`) || [];
        const idx = list.findIndex(o => o.orderId === orderId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
          storageJSON(`medifind_orders_${uid}`, list);
        }
      }
    },
    delete: (uid, orderId) => {
      const list = storageJSON(`medifind_orders_${uid}`) || [];
      const filtered = list.filter(o => o.orderId !== orderId);
      storageJSON(`medifind_orders_${uid}`, filtered);
      storageJSON(`medifind_order_${orderId}`, null);
    }
  },

  // Ambulance Requests collection
  ambulanceRequests: {
    add: (uid, data) => {
      const requestId = `amb_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
      data.ambulanceRequestId = requestId;
      data.createdAt = new Date().toISOString();
      data.status = 'requested';
      const list = storageJSON(`medifind_ambulance_requests_${uid}`) || [];
      list.push(data);
      storageJSON(`medifind_ambulance_requests_${uid}`, list);
      storageJSON(`medifind_ambulance_${requestId}`, data);
      return { id: requestId, ...data };
    },
    getAll: (uid) => storageJSON(`medifind_ambulance_requests_${uid}`) || [],
    get: (requestId) => storageJSON(`medifind_ambulance_${requestId}`),
    update: (requestId, data) => {
      storageJSON(`medifind_ambulance_${requestId}`, { ...storageJSON(`medifind_ambulance_${requestId}`), ...data, updatedAt: new Date().toISOString() });
      const uid = getCurrentUser();
      if (uid) {
        const list = storageJSON(`medifind_ambulance_requests_${uid}`) || [];
        const idx = list.findIndex(a => a.ambulanceRequestId === requestId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
          storageJSON(`medifind_ambulance_requests_${uid}`, list);
        }
      }
    },
    delete: (uid, requestId) => {
      const list = storageJSON(`medifind_ambulance_requests_${uid}`) || [];
      const filtered = list.filter(a => a.ambulanceRequestId !== requestId);
      storageJSON(`medifind_ambulance_requests_${uid}`, filtered);
      storageJSON(`medifind_ambulance_${requestId}`, null);
    }
  },

  // Active Tracks collection
  activeTracks: {
    set: (uid, tracks) => storageJSON(`medifind_active_tracks_${uid}`, tracks),
    get: (uid) => storageJSON(`medifind_active_tracks_${uid}`) || [],
    addTrack: (uid, track) => {
      const tracks = storageJSON(`medifind_active_tracks_${uid}`) || [];
      tracks.push(track);
      storageJSON(`medifind_active_tracks_${uid}`, tracks);
    },
    updateTrack: (uid, trackId, data) => {
      const tracks = storageJSON(`medifind_active_tracks_${uid}`) || [];
      const idx = tracks.findIndex(t => t.trackId === trackId);
      if (idx >= 0) {
        tracks[idx] = { ...tracks[idx], ...data };
        storageJSON(`medifind_active_tracks_${uid}`, tracks);
      }
    },
    removeTrack: (uid, trackId) => {
      const tracks = storageJSON(`medifind_active_tracks_${uid}`) || [];
      const filtered = tracks.filter(t => t.trackId !== trackId);
      storageJSON(`medifind_active_tracks_${uid}`, filtered);
    }
  }
};

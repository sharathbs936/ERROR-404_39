// Live Tracking System - GPS Simulator for Real-time Location Updates

class GPSSimulator {
  constructor() {
    this.activeTracks = new Map();
    this.updateIntervals = new Map();
    this.trackingMap = null;
    this.trackingMarkers = new Map();
  }

  // Start simulated GPS tracking for an order/ambulance
  startTracking(trackId, startLat, startLon, destLat, destLon, type = 'delivery') {
    if (this.activeTracks.has(trackId)) {
      this.stopTracking(trackId);
    }

    const track = {
      trackId,
      type, // 'delivery' or 'ambulance'
      currentLat: startLat,
      currentLon: startLon,
      destLat,
      destLon,
      startLat,
      startLon,
      speed: type === 'ambulance' ? 80 : 40, // km/h
      status: 'in-transit',
      progress: 0,
      eta: this.calculateETA(startLat, startLon, destLat, destLon, type === 'ambulance' ? 80 : 40),
      createdAt: Date.now()
    };

    this.activeTracks.set(trackId, track);

    // Update every 3-5 seconds with random interval
    const interval = 3000 + Math.random() * 2000;
    const intervalId = setInterval(() => {
      this.updatePosition(trackId);
    }, interval);

    this.updateIntervals.set(trackId, intervalId);
    return track;
  }

  // Calculate estimated time to arrival in minutes
  calculateETA(startLat, startLon, destLat, destLon, speedKmh) {
    const distance = km([startLat, startLon], [destLat, destLon]);
    return Math.ceil((distance / speedKmh) * 60); // Return minutes
  }

  // Update simulated position
  updatePosition(trackId) {
    const track = this.activeTracks.get(trackId);
    if (!track) return;

    const distance = km([track.currentLat, track.currentLon], [track.destLat, track.destLon]);

    // Stop if destination reached
    if (distance < 0.05) {
      track.currentLat = track.destLat;
      track.currentLon = track.destLon;
      track.status = 'arrived';
      track.progress = 100;
      this.stopTracking(trackId);
      toast(`${track.type === 'ambulance' ? '🚑 Ambulance' : '📦 Order'} arrived!`);
      return;
    }

    // Move towards destination with small random deviation
    const bearing = this.calculateBearing(track.currentLat, track.currentLon, track.destLat, track.destLon);
    const moveDistance = (track.speed / 3600) / 111; // Distance to move in degrees

    // Add small random deviation (±5%)
    const deviation = (Math.random() - 0.5) * 0.1;
    const actualBearing = bearing + deviation;

    track.currentLat += moveDistance * Math.cos(actualBearing * Math.PI / 180);
    track.currentLon += moveDistance * Math.sin(actualBearing * Math.PI / 180);

    // Calculate new ETA
    const newDistance = km([track.currentLat, track.currentLon], [track.destLat, track.destLon]);
    track.eta = Math.ceil((newDistance / track.speed) * 60);

    // Calculate progress percentage
    const totalDistance = km([track.startLat, track.startLon], [track.destLat, track.destLon]);
    const remainingDistance = newDistance;
    track.progress = Math.round(((totalDistance - remainingDistance) / totalDistance) * 100);

    // Update tracking data in database
    this.updateTrackingDatabase(trackId, track);
  }

  // Calculate bearing between two coordinates
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    return Math.atan2(y, x) * 180 / Math.PI;
  }

  // Update tracking data in localStorage
  updateTrackingDatabase(trackId, track) {
    const user = getCurrentUser();
    if (!user) return;

    // Update in active tracks
    firebaseDB.activeTracks.updateTrack(user, trackId, {
      currentLat: track.currentLat,
      currentLon: track.currentLon,
      eta: track.eta,
      progress: track.progress,
      status: track.status,
      updatedAt: new Date().toISOString()
    });

    // Also update in the order/ambulance record
    if (track.type === 'delivery') {
      firebaseDB.orders.update(trackId, {
        trackingData: {
          lat: track.currentLat,
          lon: track.currentLon,
          eta: track.eta,
          progress: track.progress,
          status: track.status
        }
      });
    } else {
      firebaseDB.ambulanceRequests.update(trackId, {
        trackingData: {
          lat: track.currentLat,
          lon: track.currentLon,
          eta: track.eta,
          progress: track.progress,
          status: track.status
        }
      });
    }
  }

  // Stop tracking
  stopTracking(trackId) {
    const intervalId = this.updateIntervals.get(trackId);
    if (intervalId) {
      clearInterval(intervalId);
      this.updateIntervals.delete(trackId);
    }
    this.activeTracks.delete(trackId);
  }

  // Get all active tracks
  getAllTracks() {
    return Array.from(this.activeTracks.values());
  }

  // Get specific track
  getTrack(trackId) {
    return this.activeTracks.get(trackId);
  }

  // Initialize tracking map with markers
  initTrackingMap(mapElementId) {
    if (this.trackingMap) return;

    this.trackingMap = L.map(mapElementId);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.trackingMap);

    const defaultView = [12.9065, 77.4845];
    this.trackingMap.setView(defaultView, 14);
  }

  // Update tracking map markers
  updateMapMarkers() {
    if (!this.trackingMap) return;

    // Clear old markers
    this.trackingMarkers.forEach(marker => this.trackingMap.removeLayer(marker));
    this.trackingMarkers.clear();

    const tracks = this.getAllTracks();

    if (tracks.length === 0) {
      const bounds = this.trackingMap.getBounds();
      if (bounds) this.trackingMap.setView([12.9065, 77.4845], 14);
      return;
    }

    const bounds = [];

    tracks.forEach(track => {
      let iconUrl, color;

      if (track.type === 'ambulance') {
        color = '#ef4444'; // Red
        iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
            <path fill="${color}" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
            <text x="16" y="20" text-anchor="middle" font-size="10" fill="${color}">🚑</text>
          </svg>`
        )}`;
      } else {
        color = '#3b82f6'; // Blue
        iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
            <path fill="${color}" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>`
        )}`;
      }

      const icon = L.icon({
        iconUrl,
        iconSize: [32, 48],
        iconAnchor: [16, 48],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([track.currentLat, track.currentLon], { icon })
        .addTo(this.trackingMap)
        .bindPopup(`
          <b>${track.type === 'ambulance' ? '🚑 Ambulance' : '📦 Delivery'}</b><br/>
          Status: ${track.status}<br/>
          ETA: ${track.eta} min<br/>
          Progress: ${track.progress}%
        `);

      this.trackingMarkers.set(track.trackId, marker);
      bounds.push([track.currentLat, track.currentLon]);
    });

    // Fit map to all markers
    if (bounds.length > 0) {
      const latLngs = bounds.map(b => L.latLng(b[0], b[1]));
      const group = new L.featureGroup(latLngs);
      this.trackingMap.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }

  // Clean up all tracking
  cleanup() {
    this.updateIntervals.forEach(intervalId => clearInterval(intervalId));
    this.updateIntervals.clear();
    this.activeTracks.clear();
    this.trackingMarkers.clear();
  }
}

// Global GPS simulator instance
const gpsSimulator = new GPSSimulator();

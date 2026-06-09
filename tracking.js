// AI Health Assistant - Medical Diagnosis & Hospital/Pharmacy Finder

// Medical Knowledge Base
const medicalDatabase = {
  symptoms: {
    'fever': ['paracetamol', 'ibuprofen', 'aspirin'],
    'headache': ['paracetamol', 'ibuprofen', 'aspirin'],
    'cough': ['cough syrup', 'lozenges', 'honey'],
    'cold': ['antihistamine', 'decongestant', 'vitamin c'],
    'sore throat': ['throat lozenges', 'antibiotic throat spray', 'pain relief'],
    'body pain': ['ibuprofen', 'paracetamol', 'muscle relaxant'],
    'diarrhea': ['loperamide', 'antidiarrheal', 'oral rehydration salt'],
    'acidity': ['antacid', 'omeprazole', 'ranitidine'],
    'allergy': ['antihistamine', 'cetirizine', 'loratadine'],
    'nausea': ['ondansetron', 'metoclopramide', 'ginger'],
    'skin rash': ['topical cream', 'antihistamine', 'hydrocortisone'],
    'migraine': ['sumatriptan', 'propranolol', 'amitriptyline']
  },

  // Hospital data near SJBIT College, Bangalore (12.8387, 77.5493)
  hospitals: [
    {
      id: 1,
      name: 'BGS Gleneagles Global Hospital',
      lat: 12.8391,
      lon: 77.5512,
      address: 'Kengeri, Bangalore',
      phone: '080-6799-8899',
      specialties: ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'],
      beds: 350,
      rating: 4.8,
      distance: 0.3
    },
    {
      id: 2,
      name: 'Rajarajeswari Medical College Hospital',
      lat: 12.8350,
      lon: 77.5480,
      address: 'Kengeri, Bangalore',
      phone: '080-6806-5100',
      specialties: ['General Medicine', 'Surgery', 'Pediatrics', 'Obstetrics'],
      beds: 400,
      rating: 4.6,
      distance: 0.5
    },
    {
      id: 3,
      name: 'Fortis Hospital Bannerghatta',
      lat: 12.8200,
      lon: 77.5400,
      address: 'Bannerghatta Road, Bangalore',
      phone: '080-6611-6611',
      specialties: ['Emergency', 'Trauma', 'ICU', 'Cardiology'],
      beds: 280,
      rating: 4.7,
      distance: 1.2
    },
    {
      id: 4,
      name: 'Apollo Hospital Bangalore',
      lat: 12.8280,
      lon: 77.5600,
      address: 'Koramangala, Bangalore',
      phone: '080-4024-2424',
      specialties: ['Multi-specialty', 'Oncology', 'Cardiology', 'Neurosurgery'],
      beds: 500,
      rating: 4.9,
      distance: 1.8
    }
  ],

  // Medical shops near SJBIT College
  pharmacies: [
    {
      id: 1,
      name: 'Apollo Pharmacy',
      lat: 12.8390,
      lon: 77.5510,
      address: 'Kengeri Main Road',
      phone: '080-6799-7777',
      timings: '8:00 AM - 10:00 PM',
      distance: 0.3,
      services: ['Online ordering', '24hr delivery']
    },
    {
      id: 2,
      name: 'MedPlus Pharmacy',
      lat: 12.8370,
      lon: 77.5490,
      address: 'Kengeri, Bangalore',
      phone: '080-6722-2222',
      timings: '9:00 AM - 9:00 PM',
      distance: 0.4,
      services: ['Home delivery', 'Medicine consultation']
    },
    {
      id: 3,
      name: 'CVS Pharmacy',
      lat: 12.8350,
      lon: 77.5520,
      address: 'Rajarajeshwari Hospital Lane',
      phone: '080-6688-8888',
      timings: '24 Hours',
      distance: 0.5,
      services: ['24hr service', 'Prescription check']
    },
    {
      id: 4,
      name: 'Boots Pharmacy',
      lat: 12.8300,
      lon: 77.5450,
      address: 'Bannerghatta Road',
      phone: '080-6700-0000',
      timings: '8:30 AM - 10:30 PM',
      distance: 1.0,
      services: ['Expert consultation', 'Home delivery']
    }
  ]
};

class AIMedicalAssistant {
  constructor() {
    this.chatHistory = [];
    this.userLocation = { lat: 12.8387, lon: 77.5493 }; // SJBIT College default
    this.map = null;
    this.markers = new Map();
  }

  // Initialize AI Chatbox
  initChatbox(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="ai-chatbox-container">
        <div class="chatbox-header">
          <h3>🏥 Medical Assistant</h3>
          <button class="close-btn" onclick="medicalAssistant.closeChatbox()">×</button>
        </div>
        <div class="chatbox-messages" id="chatMessages"></div>
        <div class="chatbox-input">
          <input type="text" id="userInput" placeholder="Describe your symptoms..." />
          <button onclick="medicalAssistant.sendMessage()">Send</button>
        </div>
      </div>
    `;

    // Add CSS styles
    this.addChatboxStyles();

    // Initial greeting
    this.addMessage('bot', 'Hello! 👋 I\'m your AI Medical Assistant. Please describe your symptoms, and I\'ll help you find the right medicine and nearby healthcare facilities.');
  }

  // Send message to chatbot
  sendMessage() {
    const input = document.getElementById('userInput');
    const userMessage = input.value.trim();

    if (!userMessage) return;

    this.addMessage('user', userMessage);
    input.value = '';

    // Simulate AI processing
    setTimeout(() => {
      const response = this.processSymptoms(userMessage);
      this.addMessage('bot', response);
    }, 500);
  }

  // Process symptoms and provide recommendations
  processSymptoms(userMessage) {
    const symptoms = userMessage.toLowerCase().split(' ');
    let foundMedicines = new Set();
    let matchedSymptoms = [];

    // Match symptoms
    for (const symptom in medicalDatabase.symptoms) {
      for (const word of symptoms) {
        if (symptom.includes(word) || word.includes(symptom)) {
          matchedSymptoms.push(symptom);
          medicalDatabase.symptoms[symptom].forEach(med => foundMedicines.add(med));
        }
      }
    }

    if (matchedSymptoms.length === 0) {
      return 'I didn\'t quite understand your symptoms. Please describe what you\'re experiencing (e.g., fever, headache, cough, etc.)';
    }

    // Get nearby hospitals and pharmacies
    const nearbyHospitals = this.getNearbyFacilities('hospitals', 3);
    const nearbyPharmacies = this.getNearbyFacilities('pharmacies', 3);

    let response = `✅ <strong>Based on your symptoms: ${matchedSymptoms.join(', ')}</strong>\n\n`;
    
    response += `💊 <strong>Recommended Medicines:</strong>\n`;
    foundMedicines.forEach((med, idx) => {
      response += `${idx + 1}. ${med}\n`;
    });

    response += `\n🏥 <strong>Nearby Hospitals (${nearbyHospitals.length}):</strong>\n`;
    nearbyHospitals.forEach((hospital, idx) => {
      response += `${idx + 1}. ${hospital.name} (${hospital.distance.toFixed(1)} km) ⭐${hospital.rating}\n`;
      response += `   📞 ${hospital.phone}\n`;
      response += `   <button onclick="medicalAssistant.navigateToHospital(${hospital.lat}, ${hospital.lon}, '${hospital.name}')">🗺️ Navigate</button>\n`;
    });

    response += `\n💊 <strong>Nearby Pharmacies (${nearbyPharmacies.length}):</strong>\n`;
    nearbyPharmacies.forEach((pharmacy, idx) => {
      response += `${idx + 1}. ${pharmacy.name} (${pharmacy.distance.toFixed(1)} km)\n`;
      response += `   📞 ${pharmacy.phone} | ${pharmacy.timings}\n`;
    });

    response += `\n⚠️ <strong>Disclaimer:</strong> This is for informational purposes only. Please consult a qualified doctor for proper diagnosis and treatment.`;

    return response;
  }

  // Get nearby hospitals or pharmacies
  getNearbyFacilities(type, limit = 3) {
    const facilities = medicalDatabase[type];
    
    return facilities
      .map(facility => ({
        ...facility,
        distance: this.calculateDistance(
          this.userLocation.lat,
          this.userLocation.lon,
          facility.lat,
          facility.lon
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Add message to chat
  addMessage(sender, message) {
    this.chatHistory.push({ sender, message, timestamp: new Date() });

    const messagesDiv = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}-message`;
    messageElement.innerHTML = `<div class="message-content">${message}</div>`;

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Navigate to hospital using Google Maps
  navigateToHospital(lat, lon, hospitalName) {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${hospitalName}`;
    
    // Open Google Maps
    if (navigator.userAgent.match(/mobile/i)) {
      window.location.href = `https://maps.google.com/?q=${hospitalName}@${lat},${lon}`;
    } else {
      window.open(googleMapsUrl, '_blank');
    }

    this.addMessage('bot', `🗺️ Opening Google Maps to navigate to ${hospitalName}...`);
  }

  // Initialize hospital map view
  initHospitalMap(mapContainerId) {
    if (this.map) return;

    this.map = L.map(mapContainerId).setView([this.userLocation.lat, this.userLocation.lon], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Add user location
    L.circleMarker([this.userLocation.lat, this.userLocation.lon], {
      radius: 8,
      fillColor: '#4285F4',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this.map).bindPopup('📍 Your Location');

    // Add hospital markers
    medicalDatabase.hospitals.forEach((hospital, idx) => {
      const icon = L.icon({
        iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
            <path fill="#ef4444" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
            <text x="16" y="20" text-anchor="middle" font-size="12" fill="red" font-weight="bold">🏥</text>
          </svg>`
        )}`,
        iconSize: [32, 48],
        iconAnchor: [16, 48],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([hospital.lat, hospital.lon], { icon })
        .addTo(this.map)
        .bindPopup(`
          <b>🏥 ${hospital.name}</b><br/>
          Address: ${hospital.address}<br/>
          Phone: ${hospital.phone}<br/>
          Beds: ${hospital.beds}<br/>
          Rating: ⭐${hospital.rating}<br/>
          <button onclick="medicalAssistant.navigateToHospital(${hospital.lat}, ${hospital.lon}, '${hospital.name}')">🗺️ Navigate</button>
        `);

      this.markers.set(`hospital-${idx}`, marker);
    });

    // Add pharmacy markers
    medicalDatabase.pharmacies.forEach((pharmacy, idx) => {
      const icon = L.icon({
        iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
            <path fill="#10b981" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
            <text x="16" y="20" text-anchor="middle" font-size="12" fill="green" font-weight="bold">💊</text>
          </svg>`
        )}`,
        iconSize: [32, 48],
        iconAnchor: [16, 48],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([pharmacy.lat, pharmacy.lon], { icon })
        .addTo(this.map)
        .bindPopup(`
          <b>💊 ${pharmacy.name}</b><br/>
          Address: ${pharmacy.address}<br/>
          Phone: ${pharmacy.phone}<br/>
          Timings: ${pharmacy.timings}<br/>
          ${pharmacy.services.join(', ')}
        `);

      this.markers.set(`pharmacy-${idx}`, marker);
    });
  }

  // Set user location
  setUserLocation(lat, lon) {
    this.userLocation = { lat, lon };
    if (this.map) {
      this.map.setView([lat, lon], 14);
    }
  }

  // Get user's current location
  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.setUserLocation(position.coords.latitude, position.coords.longitude);
          this.addMessage('bot', `📍 Location updated! Found ${medicalDatabase.hospitals.length} hospitals and ${medicalDatabase.pharmacies.length} pharmacies nearby.`);
        },
        () => {
          this.addMessage('bot', 'Could not access your location. Using default location (SJBIT, Bangalore).');
        }
      );
    }
  }

  // Add chatbox CSS styles
  addChatboxStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      .ai-chatbox-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .chatbox-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chatbox-header h3 {
        margin: 0;
        font-size: 18px;
      }

      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
      }

      .chatbox-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8f9fa;
      }

      .chat-message {
        margin-bottom: 12px;
        display: flex;
      }

      .user-message {
        justify-content: flex-end;
      }

      .bot-message {
        justify-content: flex-start;
      }

      .message-content {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 8px;
        word-wrap: break-word;
        line-height: 1.4;
        font-size: 14px;
      }

      .user-message .message-content {
        background: #667eea;
        color: white;
      }

      .bot-message .message-content {
        background: white;
        color: #333;
        border: 1px solid #ddd;
      }

      .chatbox-input {
        display: flex;
        padding: 12px;
        border-top: 1px solid #ddd;
        background: white;
        border-radius: 0 0 12px 12px;
      }

      .chatbox-input input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 10px;
        margin-right: 8px;
        font-size: 14px;
      }

      .chatbox-input button {
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 20px;
        cursor: pointer;
        font-weight: 500;
      }

      .chatbox-input button:hover {
        background: #5568d3;
      }

      @media (max-width: 600px) {
        .ai-chatbox-container {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Close chatbox
  closeChatbox() {
    const container = document.querySelector('.ai-chatbox-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  // Export chat history
  exportChatHistory() {
    return JSON.stringify(this.chatHistory, null, 2);
  }
}

// Global medical assistant instance
const medicalAssistant = new AIMedicalAssistant();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  medicalAssistant.initChatbox('ai-chatbox');
  medicalAssistant.getCurrentLocation();
});

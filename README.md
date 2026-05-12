# MediFind — Smart Medicine Locator

A web-based platform connecting patients with nearby pharmacies, enabling medicine search, price comparison, and AI-powered recommendations.

## Overview

MediFind is a two-sided marketplace for medicine discovery and availability. Consumers can search for medicines by name, voice, or image scanning, while pharmacies manage their inventory and reach customers through the locator.

---

## Key Features

### 🔍 **Consumer Features**
- **Search Methods**: Text, voice (Web Speech API), or image scanning (Tesseract OCR)
- **Location-Based Discovery**: GPS-powered pharmacy finder with real-time accuracy tracking
- **Price Comparison**: Side-by-side pricing across multiple pharmacies
- **AI Recommendations**: Smart ranking by price, distance, and stock availability
- **Distance & ETA**: Calculate driving time and route to pharmacies
- **Search History**: Automatic tracking of past searches
- **Theme Support**: Dark, light, and auto theme switching
- **Store Hours**: Real-time open/closed status with operating hours

### 🏪 **Pharmacy Portal**
- **Inventory Management**: Add, update, and delete medicines with quantity & price
- **Location Publishing**: Map-based store location with drag-and-drop placement
- **Operating Hours**: Set store hours or 24/7 availability
- **Data Export**: Export inventory as JSON for backup
- **Store Visibility**: Publish/unpublish store to consumer app

### 👤 **User Management**
- Consumer registration & login
- Profile management with avatar upload
- Password change functionality
- Search history with full view and deletion
- Issue reporting system

---

## Use Cases & Scenarios

### **Scenario 1: Patient with Acute Illness**
**User Profile**: Ram, 35, experiencing fever and headache

**Journey**:
1. Opens MediFind and logs in
2. Searches for "Paracetamol 650mg" using voice input ("Find paracetamol")
3. System detects 8 nearby pharmacies within 2 km
4. AI ranks them by: cheapest (₹3.50 - ₹4.00), closest (0.8 km - 2.0 km), stock availability
5. Sees #1 recommendation: GreenLeaf Pharmacy (₹3.80, 0.9 km, 150 tablets in stock)
6. Clicks "Route" → Opens Google Maps with navigation
7. Within 5 minutes, reaches pharmacy and purchases medicine

**Key Feature Used**: Voice search, AI ranking, real-time routing

---

### **Scenario 2: Chronic Disease Patient on Medication Routine**
**User Profile**: Priya, 58, managing diabetes

**Journey**:
1. Regular need: Metformin 500mg, Telmisartan 40mg tablets
2. Uses search history chip to quickly find "Metformin"
3. Compares prices across 3 stores (₹2.90 - ₹3.20 per tablet)
4. Selects cheapest option with adequate stock (120 tablets)
5. Also queries "Telmisartan" from history
6. Creates shopping route visiting 1-2 pharmacies for all medications
7. App shows combined ETA: 12 minutes

**Key Feature Used**: Search history, multi-medicine comparison, batch routing

---

### **Scenario 3: Elderly User Struggling with App**
**User Profile**: Mr. Sharma, 72, low tech literacy

**Journey**:
1. Wants "Dolo" but doesn't know exact dosage
2. Takes photo of medicine bottle/packaging
3. App's OCR scanning (Tesseract.js) reads: "Dolo 650"
4. Instantly shows 4 pharmacies with stock
5. Large, high-contrast UI makes selection easy
6. Maps view shows clear color-coded markers
7. Gets directions with one tap

**Key Feature Used**: OCR image scanning, large UI elements, visual map

---

### **Scenario 4: Pharmacist Managing Store Inventory**
**User Profile**: Vikram, pharmacy owner at "SJ Health Mart"

**Journey**:
1. Logs into Pharmacy Portal
2. Sets store location by clicking on map or using GPS ("Use My Current Location")
3. Adds medicines: 
   - Paracetamol 650mg → Qty: 120, Price: ₹3.50
   - Cetirizine 10mg → Qty: 90, Price: ₹2.00
   - Vitamin D3 60k IU → Qty: 30, Price: ₹32.00
4. Sets operating hours: 9 AM - 9 PM daily
5. Publishes store to consumer platform
6. Receives customer queries within 30 minutes
7. Can update inventory in real-time as stock changes

**Key Feature Used**: Inventory CRUD, location mapping, hours setup, publishing

---

### **Scenario 5: Multiple Pharmacies in Competition**
**User Profile**: Two competing pharmacies: Apollo (₹4.00) vs GreenLeaf (₹3.80) for Paracetamol

**Scenario**:
1. Consumer searches "Paracetamol 650mg"
2. AI recommends GreenLeaf first (lower price + closer distance)
3. But Apollo has 24/7 availability (GreenLeaf closes at 9 PM)
4. If it's 10 PM, Apollo ranks #1 despite higher price (availability factor)
5. If it's 3 PM, GreenLeaf ranks higher (price-optimized)

**Key Feature Used**: Dynamic AI ranking, availability weighting, time-based recommendations

---

### **Scenario 6: Medicine Not Available Locally**
**User Profile**: Neha, searching for rare antibiotic "Azithromycin 500mg"

**Journey**:
1. Searches "Azithromycin" 
2. Only 2 pharmacies have stock (Prime Med, Hill View Pharmacy)
3. Both are 1.8 km - 2.2 km away
4. Shows: Only 30 tablets available at Premium Med (₹22.00 each)
5. ETA: 15 minutes by car
6. Can pre-check availability before traveling

**Key Feature Used**: Comprehensive inventory search, availability filtering

---

### **Scenario 7: Post-Purchase Follow-up**
**User Profile**: Patient who bought medicine yesterday

**Journey**:
1. User returns to app after 2 days
2. "Continue where you left off" resume card shows:
   - Last search: "Dextromethorphan + CPM (cough syrup)"
   - Pharmacy visited: GreenLeaf Pharmacy
3. Can quickly re-purchase same medicine or similar alternatives
4. Sidebar tracks search history with 50 most recent queries

**Key Feature Used**: Session persistence, search history, resume functionality

---

### **Scenario 8: Large Medicine Order for Clinic**
**User Profile**: Clinic manager ordering bulk medicines

**Journey**:
1. Searches "Paracetamol 650mg" 
2. Finds GreenLeaf Pharmacy with 150 tablets in stock
3. Needs 100 tablets for clinic stock
4. Pharmacy has 150 tablets available
5. Can proceed with bulk order (noting: app is demo, no actual transaction)

**Key Feature Used**: Quantity transparency, stock availability, store contact info

---

### **Scenario 9: Theme Accessibility Needs**
**User Profile**: Patient with light sensitivity (photophobia)

**Journey**:
1. Opens MediFind during evening
2. Switches theme from default dark to "Light" theme (high contrast for clarity)
3. Or selects "Auto" to match device preference
4. Setting persists across sessions (saved to localStorage)
5. Reduces eye strain during medicine search

**Key Feature Used**: Theme switching (dark/light/auto), persistent settings

---

### **Scenario 10: Data-Driven Inventory Export**
**User Profile**: Pharmacy owner for reporting/backup

**Journey**:
1. Logs into Pharmacy Portal as store manager
2. Clicks "Export JSON" button
3. Downloads inventory file: `medifind_store_sj_health_mart.json`
4. Contains: All medicines, quantities, prices
5. Can import to accounting software or backup system

**Key Example Export**:
```json
[
  {"name": "Paracetamol 650mg (tab)", "qty": 120, "price": 3.50},
  {"name": "Cetirizine 10mg (tab)", "qty": 90, "price": 2.00}
]
```

**Key Feature Used**: Data export, inventory backup, JSON format

---

## Demo Data

The app comes with **12 pre-seeded pharmacies** in the Kengeri/SJBIT area (Bangalore):
- SJ Health Mart, GreenLeaf Pharmacy, Kengeri Wellness, Cross Road Care, Lakeside Medicals, Unity Care Pharma, Prime Med Store, Hill View Pharmacy, Neighborhood Care Plus, Care & Cure Meds, Metro Health Pharma, GoodLife Generic Pharmacy

**Demo Credentials**:
- All pharmacies use password: `pass1234`
- Username: pharmacy username (e.g., `sj_health_mart`, `greenleaf_pharmacy`)

---

## Technical Stack

- **Frontend**: Vanilla JavaScript (no frameworks)
- **Mapping**: Leaflet.js + OpenStreetMap
- **Voice**: Web Speech API (en-IN)
- **OCR**: Tesseract.js
- **Storage**: LocalStorage (browser-based, demo only)
- **Styling**: Custom CSS with dark/light theme support

---

## How to Use

1. **As a Consumer**: Click "I'm looking for a medicine" → Register/Login → Search medicines → Compare & route
2. **As a Pharmacy**: Click "I'm a pharmacy" → Register store → Set location & hours → Add inventory → Publish

---

## Key Innovation: AI Ranking Algorithm

**Scoring Formula** (weighted):
- Price normalization: 60% weight
- Distance normalization: 30% weight  
- Stock availability: 10% weight

**Result**: ⭐⭐⭐⭐ (5-star display) for highly recommended pharmacies

---

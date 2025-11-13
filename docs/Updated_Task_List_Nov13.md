# Updated Task List - Demo Ready by Wednesday, Nov 20

**Product Direction:** Prospective recommendation tool (NOT transaction tracking)  
**Core Value:** "Get instant card recommendations before every purchase"  
**Target:** Working demo with card library, merchant lookup, geolocation, and project report submitted

---

## **WHAT'S ALREADY IMPLEMENTED ✅**

- PostgreSQL database with full schema
- AI recommendation system (Groq integration)
- Card CRUD endpoints (add, update, delete cards)
- Basic transaction recommendation flow
- Frontend screens (Cards, Transaction, Results, History)
- API integration between frontend/backend

## **WHAT WE'RE REMOVING ❌**

- Transaction history tracking (too complex, bad UX)
- Analytics dashboard (no data to analyze without tracking)
- "Savings over time" features (requires transaction tracking)
- Gamification (requires historical data)
- Amount input requirement (users don't know exact amount beforehand)

## **NEW FEATURES TO BUILD 🚀**

1. **Card Library** - Predefined cards users can select from (no manual entry)
2. **Merchant Lookup** - Smart merchant search with autocomplete
3. **Geolocation** - Auto-detect nearby merchants/location
4. **Simplified Recommendation Flow** - Just merchant → card recommendation

---

## **EUGENE (Backend Core & AI Agent)**

### **Priority 1: Card Library System (Days 1-2)**
- [ ] **Create Card Library Seed Data**
  - Manually create JSON file with 15-20 popular cards
  - File: `backend/seed_data/card_library.json`
  - Include: Chase Sapphire, Amex Gold, Citi Double Cash, Discover It, Capital One Venture, etc.
  - Structure:
    ```json
    {
      "card_name": "Chase Sapphire Preferred",
      "issuer": "Chase",
      "cash_back_rate": {"dining": 0, "travel": 0, "other": 0},
      "points_multiplier": {"dining": 2, "travel": 3, "other": 1},
      "annual_fee": 95.0,
      "benefits": ["3x points on travel", "2x points on dining", "Travel insurance"],
      "best_for": ["travel", "dining"]
    }
    ```

- [ ] **Create Seed Script**
  - Script: `backend/scripts/seed_card_library.py`
  - Reads JSON and populates database
  - Marks cards as `is_library_card = True`
  - Run once to populate database

- [ ] **Update AI Recommendation Logic**
  - Simplify prompt: no transaction history needed
  - Input: merchant name, optional category, user's cards
  - Output: best card + simple explanation
  - Focus on: category match, rewards rate comparison
  - Example prompt:
    ```
    User has these cards: [Chase Sapphire (3x travel), Citi Double Cash (2% everything)]
    They're shopping at: Starbucks (dining category)
    Which card should they use and why?
    ```

### **Priority 2: Merchant Intelligence (Day 3)**
- [ ] **Merchant Category Detection**
  - Enhance AI prompt to auto-detect category from merchant name
  - Examples: "Starbucks" → dining, "Shell" → gas, "Target" → shopping
  - Store common merchants in database for faster lookup
  - Fallback: ask user to select category if uncertain

- [ ] **Seed Common Merchants**
  - Create `backend/seed_data/merchants.json`
  - Include 50-100 common merchants: Starbucks, Target, Walmart, Shell, etc.
  - Each with: name, primary category, optional logo URL
  - Used for autocomplete in frontend

### **Priority 3: Simplify Recommendation Endpoint (Day 4)**
- [ ] **Update `/api/v1/recommend` Endpoint**
  - Make `amount` optional (not required)
  - Remove or minimize transaction storage
  - Focus response on: recommended card, reason, comparison
  - Response format:
    ```json
    {
      "recommended_card": {
        "card_name": "Chase Sapphire Preferred",
        "reason": "Earns 3x points on dining (best for restaurants)",
        "estimated_value": "3 points per $1 spent"
      },
      "alternatives": [
        {
          "card_name": "Amex Gold",
          "reason": "Earns 4x points on dining",
          "estimated_value": "4 points per $1"
        }
      ]
    }
    ```

- [ ] **Remove/Simplify Analytics**
  - Keep basic stats: total recommendations given (optional)
  - Remove: transaction history, missed opportunities, savings calculations

### **Priority 4: Project Report (Days 5-6)**
- [ ] **Technical Documentation**
  - Architecture diagram (simplified)
  - AI prompt engineering for merchant categorization
  - Card library design
  - API documentation
- [ ] **Product Positioning**
  - Emphasize: prospective recommendations (not tracking)
  - Value prop: "Never wonder which card to use"
  - Use cases: quick lookup before purchase

---

## **IRWIN (Backend API & Database)**

### **Priority 1: Card Library Endpoints (Days 1-2)**
- [ ] **Add `is_library_card` Flag to CreditCard Model**
  - Migration: add boolean column `is_library_card` (default: False)
  - Library cards: `is_library_card = True`, no `user_id` (or user_id = NULL)
  - User cards: `is_library_card = False`, has `user_id`

- [ ] **Create Card Library Endpoint**
  - `GET /api/v1/cards/library`
  - Returns all cards where `is_library_card = True`
  - Include filters: `issuer`, `best_for` category, `annual_fee` range
  - Response: list of all available cards
  - Example: `/api/v1/cards/library?best_for=travel&annual_fee_max=100`

- [ ] **Add Card from Library Endpoint**
  - `POST /api/v1/users/{user_id}/cards/add-from-library`
  - Request body: `{"library_card_id": "chase-sapphire-123"}`
  - Creates a COPY of library card for user
  - Sets `is_library_card = False`, assigns `user_id`
  - Returns user's new card instance

- [ ] **Update Existing Card Endpoints**
  - `GET /api/v1/users/{user_id}/cards` - only return user's cards (not library)
  - `DELETE /api/v1/cards/{card_id}` - prevent deletion of library cards
  - Keep existing add/update/delete for user cards

### **Priority 2: Merchant Lookup Endpoints (Day 3)**
- [ ] **Merchant Search Endpoint**
  - `GET /api/v1/merchants/search?q={query}`
  - Returns merchants matching query (autocomplete)
  - Example: `/api/v1/merchants/search?q=star` → ["Starbucks", "Star Market"]
  - Limit: 10 results
  - Case-insensitive search

- [ ] **Merchant by Location Endpoint (Optional)**
  - `GET /api/v1/merchants/nearby?lat={lat}&lon={lon}&radius={meters}`
  - Returns merchants within radius (if location data available)
  - For MVP: return empty array (implement later if time)
  - Frontend can fallback to search

- [ ] **Get/Create Merchant Endpoint**
  - `POST /api/v1/merchants`
  - Request: `{"merchant_name": "Starbucks", "category": "dining"}`
  - Creates merchant if doesn't exist
  - Returns merchant with auto-detected category

### **Priority 3: Database Cleanup (Day 4)**
- [ ] **Simplify Transaction Storage**
  - Recommendation endpoint can work WITHOUT storing transaction
  - Add query param: `?save_transaction=false` (default: true for now)
  - For demo: save minimal data (merchant, recommended card, timestamp)
  - Remove analytics calculations

- [ ] **Optional: Remove Unused Tables**
  - Consider removing if not used: TransactionFeedback, UserBehavior, AutomationRules
  - Keep: Users, CreditCards, Merchants, Transactions (minimal)
  - Only if time permits - not critical for demo

### **Priority 4: Project Report (Days 5-6)**
- [ ] **Database Design Section**
  - Simplified ER diagram (fewer tables)
  - Card library vs user cards design
  - Merchant database design
- [ ] **API Documentation**
  - All endpoint reference
  - Request/response examples
  - Postman collection (optional)

---

## **MATT (Frontend Core Screens)**

### **Priority 1: Redesign Add Card Screen (Days 1-2)**
- [ ] **Create CardLibraryScreen**
  - New file: `src/screens/CardLibraryScreen.js`
  - Show grid/list of all available cards from library
  - Each card shows: name, issuer, annual fee, top 2-3 benefits
  - Layout:
    ```
    - Search bar at top
    - Filter chips: [All] [Travel] [Dining] [Cash Back] [No Fee]
    - Card grid (2 columns) or list
    - Each card: 
      - Card name + issuer
      - "$95/year" or "No annual fee"
      - "Best for: Travel, Dining"
      - Tap to add
    ```

- [ ] **Update CardsScreen Navigation**
  - Change "Add Card" button to navigate to CardLibraryScreen
  - Remove current modal with manual input
  - Keep existing card list display
  - Keep delete functionality (long-press)

- [ ] **Add Card Flow**
  ```
  1. User taps "+ Add Card" button
  2. Navigate to CardLibraryScreen
  3. User browses/searches cards
  4. User taps card → confirmation dialog
  5. Card added to wallet → navigate back to CardsScreen
  ```

### **Priority 2: Simplify Transaction Screen (Day 3)**
- [ ] **Remove Amount Requirement**
  - Make amount field optional
  - Change placeholder: "Amount (optional - for reward estimate)"
  - Update validation: only require merchant name
  - If amount provided, show estimated rewards in result

- [ ] **Add Merchant Autocomplete**
  - Replace plain TextInput with autocomplete component
  - Call `/api/v1/merchants/search?q={query}` as user types
  - Show dropdown with suggestions
  - User can select from list OR type custom merchant
  - Debounce API calls (500ms)

- [ ] **Simplify Category Selection**
  - Keep category buttons
  - Make it optional (AI will detect if not selected)
  - Add "Auto-detect" option (default selected)

- [ ] **Update Results Screen**
  - Simplify to show: recommended card + reason
  - Remove: analytics, savings calculations, history
  - Show comparison: "vs. other cards" (simple list)
  - Add "Got it!" button (closes screen)

### **Priority 3: Add Geolocation (Day 4)**
- [ ] **Install & Setup**
  - Install: `expo install expo-location`
  - Request permissions on first use
  - Handle permission denied gracefully

- [ ] **Add Location Button to Transaction Screen**
  - Button: "📍 Use Current Location"
  - On press: get GPS coordinates
  - Call Nominatim API for reverse geocoding
  - Show current address/area
  - Optional: suggest nearby merchants (if backend supports)
  - Fallback: just show address, user types merchant manually

- [ ] **Location Service**
  ```javascript
  // src/services/location.js
  import * as Location from 'expo-location';
  
  export const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permission denied');
    const location = await Location.getCurrentPositionAsync({});
    return { 
      lat: location.coords.latitude, 
      lon: location.coords.longitude 
    };
  };
  
  export const reverseGeocode = async (lat, lon) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    return response.json();
  };
  ```

### **Priority 4: Clean Up Unused Screens (Day 4)**
- [ ] **Remove or Simplify HistoryScreen**
  - Option 1: Delete completely (recommended)
  - Option 2: Show simple list of past recommendations (no analytics)
  - Keep it minimal if you keep it

- [ ] **Update Navigation**
  - Remove analytics tab if exists
  - Keep: Home, Cards, Transaction screens
  - Optional: Profile/Settings

### **Priority 5: Project Report (Days 5-6)**
- [ ] **UI/UX Design Section**
  - User flow diagram (simplified)
  - Screenshots of key screens
  - Design decisions (why card library, why no tracking)
- [ ] **Demo Preparation**
  - Capture screen recordings
  - Test full flow multiple times

---

## **ATHARVA (Frontend Integration & DevOps)**

### **Priority 1: Card Library API Integration (Days 1-2)**
- [ ] **Update API Service**
  ```javascript
  // src/services/api.js
  
  // Get all library cards
  export const getCardLibrary = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API_BASE}/api/v1/cards/library?${params}`);
    return response.data;
  };
  
  // Add card from library to user's wallet
  export const addCardFromLibrary = async (userId, libraryCardId) => {
    const response = await axios.post(
      `${API_BASE}/api/v1/users/${userId}/cards/add-from-library`,
      { library_card_id: libraryCardId }
    );
    return response.data;
  };
  
  // Search merchants (autocomplete)
  export const searchMerchants = async (query) => {
    const response = await axios.get(
      `${API_BASE}/api/v1/merchants/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  };
  ```

- [ ] **Connect CardLibraryScreen**
  - Fetch library cards on mount
  - Implement search/filter on client side
  - Call `addCardFromLibrary()` when user selects card
  - Show loading/error states
  - Navigate back to CardsScreen after success

- [ ] **Update CardsScreen Integration**
  - Refresh card list after adding from library
  - Handle empty state: "Add your first card"
  - Keep existing delete functionality

### **Priority 2: Merchant Autocomplete Integration (Day 3)**
- [ ] **Build Autocomplete Component**
  ```javascript
  // src/components/MerchantAutocomplete.js
  // Debounced search as user types
  // Shows dropdown with suggestions
  // User can select OR type custom merchant
  ```

- [ ] **Integrate into TransactionScreen**
  - Replace merchant TextInput with autocomplete
  - Debounce API calls (500ms)
  - Handle loading state
  - Allow custom merchant if not in list

- [ ] **Update Recommendation API Call**
  - Make amount optional in request
  - Remove transaction history logic
  - Focus on getting recommendation only

### **Priority 3: Geolocation Integration (Day 4)**
- [ ] **Setup Location Service**
  - Install `expo-location`
  - Create `src/services/location.js`
  - Implement permission handling
  - Implement reverse geocoding (Nominatim)

- [ ] **Add to TransactionScreen**
  - Add location button
  - Get coordinates on press
  - Show loading indicator
  - Handle errors (permission denied, no GPS, etc.)
  - Display current area/address

- [ ] **Test on Physical Device**
  - Location doesn't work in simulator
  - Test permission flow
  - Test with location services off
  - Test reverse geocoding accuracy

### **Priority 4: Testing & Deployment (Day 5)**
- [ ] **End-to-End Testing**
  - Test: Add card from library → appears in wallet
  - Test: Enter merchant → get recommendation
  - Test: Use location → auto-detect area
  - Test: Search merchants → autocomplete works
  - Test on both iOS and Android

- [ ] **Backend Deployment**
  - Deploy to Render/Railway/Heroku (free tier)
  - OR use ngrok/localtunnel for demo
  - Update `API_BASE_URL` in frontend
  - Test from physical device

- [ ] **Performance & Polish**
  - Add loading states everywhere
  - Add error handling everywhere
  - Test with slow network
  - Cache card library in AsyncStorage

### **Priority 5: Project Report & Demo (Day 6)**
- [ ] **Integration Documentation**
  - API integration architecture
  - Frontend-backend flow diagram
  - Deployment setup
  - Environment variables

- [ ] **Demo Preparation**
  - Create demo script with specific merchants
  - Pre-populate backend with card library
  - Test demo flow 3-5 times
  - Record backup demo video
  - Prepare 5-minute presentation

---

## **SHARED TASKS (All Team Members)**

### **Project Report (Due: Tuesday, Nov 19)**
- [ ] **Introduction & Problem Statement** (Eugene)
  - Problem: Users don't know which credit card to use for maximum rewards
  - Current solutions: manual research, spreadsheets, guessing
  - Our solution: instant AI-powered recommendations

- [ ] **Related Work & Literature Review** (Irwin)
  - Existing apps: Credit Karma, WalletFlo, MaxRewards
  - Limitations: manual input, no AI, complex UX
  - Our differentiation: AI-powered, simple, prospective

- [ ] **System Architecture** (Atharva)
  - Frontend: React Native (Expo)
  - Backend: FastAPI + PostgreSQL
  - AI: Groq LLM for recommendations
  - Simplified architecture diagram

- [ ] **Implementation Details** (All - respective sections)
  - Eugene: AI recommendation logic, card library design
  - Irwin: Database schema, API endpoints
  - Matt: UI/UX design, screen flows
  - Atharva: Integration, deployment

- [ ] **Testing & Validation** (Matt)
  - User testing approach
  - Test scenarios
  - Results

- [ ] **Results & Analysis** (Eugene)
  - Recommendation accuracy
  - Response times
  - User feedback

- [ ] **Conclusion & Future Work** (All)
  - What we built
  - Limitations (no bank integration, manual merchant entry)
  - Future: bank integration (Plaid), transaction tracking, more cards

- [ ] **References & Appendices** (All)

### **Demo Preparation (Due: Wednesday, Nov 20)**
- [ ] **Demo Script** (All review)
  ```
  1. Show problem: "Which card should I use at Starbucks?"
  2. Open app, show card library (15+ cards)
  3. Add 2-3 cards to wallet (quick tap)
  4. Go to transaction screen
  5. Type "Starbucks" (autocomplete appears)
  6. Get recommendation: "Use Chase Sapphire - 3x points on dining"
  7. Show comparison with other cards
  8. Try with location: detect current area
  9. Try different merchant: "Target" → different recommendation
  10. Highlight: simple, fast, AI-powered
  ```

- [ ] **Test Data Setup** (Irwin)
  - Pre-populate card library (15-20 cards)
  - Pre-populate common merchants (50-100)
  - Create demo user account
  - Test all flows work

- [ ] **Presentation Slides** (All contribute)
  - Slide 1: Problem statement
  - Slide 2: Solution overview
  - Slide 3: Technical architecture
  - Slide 4: Live demo
  - Slide 5: Results & impact
  - Slide 6: Future work
  - Slide 7: Q&A

---

## **DAILY SYNC SCHEDULE**

**Daily Standup (15 min @ 9 AM)**
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

**Integration Check-ins**
- **Monday EOD:** Card library backend ready → Frontend can start integration
- **Tuesday EOD:** Merchant search backend ready → Frontend can integrate
- **Wednesday EOD:** All features integrated → Start testing
- **Thursday:** Bug fixes only, no new features
- **Friday-Monday:** Project report writing
- **Tuesday:** Final report review & submission
- **Wednesday AM:** Demo rehearsal
- **Wednesday PM:** DEMO

---

## **CRITICAL DEPENDENCIES**

### **Monday**
- Irwin must complete card library endpoints → Atharva can integrate
- Eugene must create card library seed data → Irwin can populate database

### **Tuesday**
- Irwin must complete merchant search endpoint → Atharva can integrate
- Matt must complete CardLibraryScreen → Atharva can connect to backend

### **Wednesday**
- All features must be integrated → Team can start testing
- Backend must be deployed/accessible → Frontend can test on devices

### **Thursday**
- All bugs must be fixed → Demo can be rehearsed
- Test data must be ready → Demo will be smooth

---

## **RISK MITIGATION**

### **If Card Library Takes Too Long:**
- **Fallback:** Manually enter 10 cards directly into database (SQL inserts)
- **Owner:** Irwin
- **Timeline:** 1 hour max

### **If Merchant Autocomplete is Complex:**
- **Fallback:** Simple text input, no autocomplete
- **Owner:** Matt removes autocomplete, keeps plain input
- **Timeline:** 30 min

### **If Geolocation is Problematic:**
- **Fallback:** Remove location feature entirely
- **Owner:** Matt removes location button
- **Timeline:** 15 min

### **If Backend Deployment Fails:**
- **Fallback:** Use ngrok/localtunnel for demo
- **Owner:** Atharva ensures stable tunnel during demo
- **Timeline:** 30 min setup before demo

---

## **SUCCESS METRICS**

### **Minimum Viable Demo (Must Have)**
- ✅ 15+ predefined cards in library
- ✅ User can select and add cards from library (no manual entry)
- ✅ User can enter merchant name
- ✅ AI recommendation works and shows best card + reason
- ✅ App works on physical device via Expo Go

### **Nice to Have (If Time Permits)**
- 🎯 Merchant autocomplete
- 🎯 Geolocation with address display
- 🎯 Card comparison view
- 🎯 Smooth animations and polish

---

## **SIMPLIFIED PRODUCT POSITIONING**

### **What We're Building:**
"An AI assistant that tells you which credit card to use before every purchase"

### **What We're NOT Building:**
- ❌ Transaction tracking app (like Mint)
- ❌ Bank integration (like Plaid)
- ❌ Budgeting tool
- ❌ Savings calculator

### **Core User Flow:**
```
1. User: "I'm going to Starbucks"
2. App: "Use Chase Sapphire Preferred - 3x points on dining"
3. User: [Uses that card]
4. Done.
```

**That's it. Simple, fast, useful.**

---

**Last Updated:** November 13, 2024  
**Product Direction:** Prospective recommendations only (no transaction tracking)  
**Next Review:** November 16, 2024 (after initial implementation)

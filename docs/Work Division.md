 Perfect\! Now let me create detailed task checklists for each person. I'll make these actionable and specific:

## **PERSON 1: Backend Core & AI Agent (Eugene)**

### **Day 1 (Today) \- Critical Path ✅**

* **Hour 1:** Get local environment running  
  * Pull latest from GitHub  
  * Activate venv, run `pip install -r requirements.txt`  
  * Create `.env` file with Groq API key  
  * Test: `uvicorn main:app --reload` \- does it start?  
* **Hour 2-3:** Audit existing `agents.py` code  
  * Read through the AI recommendation logic  
  * Test the `/api/v1/recommend` endpoint via `/docs`  
  * Document what's working vs. broken  
* **Hour 4-6:** Fix/Build Core Recommendation Logic  
  * Ensure the prompt to Groq includes:  
    * All user cards with rewards structure  
    * Transaction details (merchant, amount, category)  
    * Optimization goal (cash\_back, travel\_points, balanced)  
  * Test with hardcoded sample cards if DB isn't ready  
  * **Target:** Get ONE recommendation response working

### **Day 2 (Saturday)**

* **Morning:** Implement weighted optimization

python  
 *\# In agents.py*  
  def calculate\_card\_value(card, goal):  
      if goal \== "cash\_back":  
          return card.cash\_back\_rate \* 1.0 \+ card.points\_rate \* 0.1  
      elif goal \== "travel\_points":  
          return card.cash\_back\_rate \* 0.1 \+ card.points\_rate \* 1.0

      *\# etc.*

* **Afternoon:** Add explanation generation  
  * Make AI explain WHY it chose a card  
  * Format: "Chase Sapphire earns 3x points on travel (900 points) vs. Citi 2% cash back ($20)"  
* **Evening:** Error handling  
  * What if Groq API fails? Return simple fallback  
  * What if user has no cards? Return helpful message  
  * Add logging for debugging

### **Day 3 (Sunday)**

* Integration testing with Person 2's endpoints  
* Performance optimization (\< 2 second responses)  
* Create 3-5 test scenarios with expected outputs  
* Document API behavior for Person 3/4

### **Day 4 (Monday) \- Buffer Day**

* Fix any bugs found during integration  
* Add simple analytics endpoint (total saved, best card, etc.)  
* Help with deployment if needed

---

## **PERSON 2: Backend API & Database (Irwin)**

### **Day 1 (Today) ✅**

* **Hour 1:** Setup & audit  
  * Pull repo, setup venv  
  * Check what's in `main.py` currently  
  * Look at database schema (if exists)  
* **Hour 2-4:** Database Schema & Setup

python  
 *\# models.py or in main.py*  
  class CreditCard:  
      id: int  
      user\_id: int \= 1  *\# hardcode for MVP*  
      name: str  *\# "Chase Sapphire Preferred"*  
      card\_type: str  *\# "visa"*  
      cash\_back\_categories: dict  *\# {"groceries": 2, "travel": 3}*  
      points\_multiplier: float  
      annual\_fee: float

      created\_at: datetime

* Create tables in SQLite  
* Write initial migration/setup script  
* **Hour 5-6:** Seed Sample Data  
  * Add 5-8 realistic credit cards:  
    * Chase Sapphire Preferred (3x travel, 2x dining)  
    * Citi Double Cash (2% everything)  
    * Discover It (5% rotating categories)  
    * Chase Freedom Unlimited (1.5% everything, 5% travel)  
    * Amex Gold (4x dining, 4x groceries)  
  * Include actual reward structures

### **Day 2 (Saturday)**

* **Morning:** Build CRUD endpoints

python  
 *\# In main.py*  
  @app.get("/api/v1/cards")  
  def get\_user\_cards():  
      *\# Return all cards for user\_id=1*  
    
  @app.post("/api/v1/cards")  
  def add\_card(card: CreditCardCreate):  
      *\# Add new card*  
    
  @app.put("/api/v1/cards/{card\_id}")  
  def update\_card(card\_id: int, card: CreditCardUpdate):  
      *\# Update existing card*  
    
  @app.delete("/api/v1/cards/{card\_id}")  
  def delete\_card(card\_id: int):

      *\# Soft delete or hard delete*

* **Afternoon:** Test all endpoints in `/docs` (Swagger UI)  
  * Can you GET cards?  
  * Can you POST a new card?  
  * Can you DELETE a card?  
* **Evening:** Transaction logging (optional but good)

python  
 @app.post("/api/v1/transactions")  
  def log\_transaction(transaction: TransactionLog):  
      *\# Save: merchant, amount, category, recommended\_card, actual\_card\_used*

      *\# This helps with analytics later*

### **Day 3 (Sunday)**

* Add category endpoint for dropdown

python  
 @app.get("/api/v1/categories")  
  def get\_categories():

      return \["groceries", "dining", "travel", "gas", "shopping", "other"\]

* Work with Person 1 to ensure recommendation endpoint gets card data correctly  
* Add validation (amounts \> 0, required fields, etc.)  
* Write simple tests for each endpoint

### **Day 4 (Monday) \- Buffer**

* Fix any integration issues  
* Add more sample cards if needed  
* Optimize queries if slow

---

## **PERSON 3: Frontend Core Screens (Matt)**

### **Day 1 (Today) ✅**

* **Hour 1:** Setup & Navigation  
  * Pull repo, `cd frontend`, `npm install`  
  * Audit existing screens in `src/screens/`  
  * Setup navigation structure:  
    * Tab 1: Transaction Input  
    * Tab 2: My Cards  
    * Tab 3: Analytics (if time)  
* **Hour 2-4:** Build Transaction Input Screen

javascript  
 *// src/screens/TransactionScreen.js*  
  import { useState } from 'react';  
  import { View, TextInput, Button, Picker } from 'react-native';  
    
  export default function TransactionScreen({ navigation }) {  
    const \[merchant, setMerchant\] \= useState('');  
    const \[amount, setAmount\] \= useState('');  
    const \[category, setCategory\] \= useState('groceries');  
    const \[goal, setGoal\] \= useState('cash\_back');  
      
    *// Form UI with styling*  
    *// Submit button that navigates to Results screen*

  }

* Add form fields: merchant, amount, category dropdown, goal selector  
* Use React Native Paper or native components  
* Make it look clean with proper spacing  
* **Hour 5-6:** Build Results/Recommendation Screen

javascript  
 *// src/screens/ResultsScreen.js*  
  *// Shows:*  
  *// \- Recommended card (big, visual)*  
  *// \- Expected rewards ($X or Y points)*  
  *// \- AI explanation*  
  *// \- "Use This Card" button*

  *// \- "Try Another Transaction" button*

### **Day 2 (Saturday)**

* **Morning:** Card Management Screen

javascript  
 *// src/screens/MyCardsScreen.js*  
  *// Shows list of user's cards*  
  *// Each card shows: name, type, reward summary*  
  *// "Add New Card" button → modal or new screen*

  *// Tap card → edit/delete options*

* **Afternoon:** Add Card Form/Modal  
  * Form fields: card name, type, reward categories  
  * Keep it simple \- just name and basic info for MVP  
  * Don't worry about complex reward structure editing  
* **Evening:** Polish UI  
  * Add loading spinners  
  * Add error messages (styled components)  
  * Make sure all screens are scrollable  
  * Test navigation flow

### **Day 3 (Sunday)**

* Work with Person 4 on API integration  
* Handle edge cases:  
  * What if no cards? Show "Add your first card" message  
  * What if API fails? Show error, allow retry  
* Add form validation (amount \> 0, merchant required)  
* Test on actual phone via Expo Go

### **Day 4 (Monday) \- Buffer**

* Fix any bugs  
* Add nice-to-haves: icons, better styling  
* Quick analytics screen if time (show total saved)

---

## **PERSON 4: Frontend Integration & DevOps (Atharva)**

### **Day 1 (Today) ✅**

* **Hour 1:** Get entire stack running locally  
  * Backend: `uvicorn main:app --reload`  
  * Frontend: `npx expo start`  
  * Test: Can you hit backend from browser? `http://localhost:8000/docs`  
* **Hour 2-3:** Setup Localtunnel

bash  
 *\# In terminal 1 (backend running)*  
  lt \--port 8000

  *\# Copy the URL: https://xyz123.loca.lt*

* Update `frontend/src/services/api.js`:

javascript

 const API\_BASE\_URL \= 'https://xyz123.loca.lt/api/v1';

* Test from Expo Go on phone \- can it reach backend?  
* **Hour 4-6:** Build API Service Layer

javascript  
 *// src/services/api.js*  
  import axios from 'axios';  
    
  const API\_BASE\_URL \= 'https://your-localtunnel-url/api/v1';  
    
  export const getCards \= async () \=\> {  
    try {  
      const response \= await axios.get(\`${API\_BASE\_URL}/cards\`);  
      return response.data;  
    } catch (error) {  
      console.error('Error fetching cards:', error);  
      throw error;  
    }  
  };  
    
  export const getRecommendation \= async (transaction) \=\> {  
    try {  
      const response \= await axios.post(\`${API\_BASE\_URL}/recommend\`, transaction);  
      return response.data;  
    } catch (error) {  
      console.error('Error getting recommendation:', error);  
      throw error;  
    }  
  };


  *// Add more API functions: addCard, deleteCard, etc.*

### **Day 2 (Saturday)**

* **Morning:** Connect Transaction Screen to API  
  * Import API functions into TransactionScreen  
  * On submit, call `getRecommendation()`  
  * Handle loading state while waiting  
  * Navigate to Results screen with response  
* **Afternoon:** Connect My Cards Screen to API  
  * Fetch cards on screen load  
  * Display in FlatList  
  * Add card → call `addCard()` API  
  * Delete card → call `deleteCard()` API  
* **Evening:** Error Handling & Loading States

javascript  
 *// In each screen*  
  const \[loading, setLoading\] \= useState(false);  
  const \[error, setError\] \= useState(null);  
    
  *// Show spinner when loading=true*

  *// Show error message when error exists*

### **Day 3 (Sunday)**

* **Full Integration Testing**  
  * Test entire flow: Add card → Enter transaction → Get recommendation  
  * Test on actual phone (not just web)  
  * Document any bugs for Person 1/2 to fix  
* **Networking Debugging**  
  * If localtunnel unstable, try ngrok as backup  
  * Ensure CORS is configured in backend  
  * Test with different networks (WiFi, mobile data)  
* **Form Validation**  
  * Add client-side validation before API calls  
  * Prevent empty submissions  
  * Show validation errors clearly

### **Day 4 (Monday) \- Buffer**

* Fix any integration bugs  
* Add AsyncStorage for caching cards locally (if time)  
* Performance testing  
* Help others with whatever is broken

---

## **Daily Standup Questions (5 min each person)**

**Morning (9 AM or whenever you start):**

1. What did you finish yesterday?  
2. What are you working on today?  
3. Any blockers?

**Evening (6 PM or end of day):**

1. Did you finish what you planned?  
2. What should others know about your progress?  
3. What do you need help with tomorrow?

---

## **Key Integration Points (When to Sync)**

1. **End of Day 1:** Person 2 should have sample cards in DB → Share schema with Person 1  
2. **Saturday Morning:** Person 1 needs Person 2's `/cards` endpoint working  
3. **Saturday Afternoon:** Person 4 needs Person 2's endpoints to integrate with Person 3's screens  
4. **Sunday:** Full team testing together \- this is when everything comes together  
5. **Monday:** Bug fixes only, no new features

---

## **Emergency Protocols**

**If AI is too buggy by Sunday noon:**

* Person 1 switches to rule-based fallback:

python  
 *\# Simple logic*  
  if category \== "travel":  
      return card\_with\_highest\_travel\_rewards  
  elif category \== "dining":  
      return card\_with\_highest\_dining\_rewards  
  else:

      return card\_with\_highest\_general\_cashback

**If localtunnel keeps dying:**

* Person 4 switches to ngrok or direct IP address  
* As backup: deploy backend to free Render.com/Railway

**If frontend is too complex:**

* Person 3 focuses on just 2 screens: Transaction Input \+ Results  
* Skip card management \- hardcode the 5 sample cards

---

## **Success Metrics by Tuesday**

**Minimum Viable Demo:**

* ✅ User can see 5 pre-loaded credit cards  
* ✅ User can enter: merchant, amount, category  
* ✅ User gets a card recommendation with explanation  
* ✅ App works on mobile phone via Expo Go

**Nice to Haves (if time):**

* User can add/delete their own cards  
* Analytics screen showing savings  
* Smooth animations and polish


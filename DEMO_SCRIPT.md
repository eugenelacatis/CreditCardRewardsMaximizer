# Credit Card Rewards Maximizer - Demo Script

**Demo Date:** TBD
**Duration:** 5-7 minutes
**Presenters:** Eugene, Atharva, Matt, Irwin

---

## Pre-Demo Checklist

### Backend Preparation
- [ ] Railway backend is deployed and accessible
- [ ] Database is seeded with card library (20+ cards)
- [ ] Database is seeded with merchants (50-100 merchants)
- [ ] Test user account exists with 2-3 sample cards
- [ ] All API endpoints tested and working
- [ ] GROQ_API_KEY is valid and has sufficient quota
- [ ] GOOGLE_PLACES_API_KEY is valid

### Frontend Preparation
- [ ] Frontend updated with Railway backend URL
- [ ] App installed on demo device via Expo Go
- [ ] Location permissions granted on demo device
- [ ] Stable WiFi connection for demo device
- [ ] Demo device fully charged
- [ ] Screen mirroring/projection setup tested

### Backup Plan
- [ ] Record backup demo video (5 minutes)
- [ ] Screenshots of key features prepared
- [ ] Fallback to localhost if Railway has issues
- [ ] Presentation slides ready (no live demo fallback)

---

## Demo Script

### Opening (30 seconds)
**Presenter:** Eugene

**Script:**
> "Have you ever stood at the checkout wondering which credit card gives you the best rewards? Most people carry 3-4 credit cards but consistently use just one, leaving hundreds of dollars in rewards unclaimed.
>
> We built an AI-powered mobile app that instantly tells you which card to use for every purchase. Let me show you how it works."

---

### Part 1: The Problem (30 seconds)
**Presenter:** Eugene

**Visuals:** Show slide with credit cards

**Script:**
> "The average American has multiple credit cards with different rewards:
> - Chase Sapphire: 3x points on travel and dining
> - Amex Gold: 4x points on groceries and dining
> - Citi Double Cash: 2% cash back on everything
> - Discover It: 5% rotating categories
>
> Tracking all this manually is impossible. That's where our app comes in."

---

### Part 2: Card Library Demo (1 minute)
**Presenter:** Atharva

**Actions:**
1. Open app on phone (already logged in)
2. Navigate to "Cards" tab
3. Tap "+ Add Card" button
4. Show card library with 20+ cards

**Script:**
> "Our app comes pre-loaded with 20+ premium credit cards from major issuers. Users don't have to manually enter reward structures.
>
> [Tap '+ Add Card']
>
> Here you can see cards from Chase, American Express, Citi, Capital One, Discover, and more. Each card shows its annual fee and best categories.
>
> [Select 'Chase Sapphire Preferred']
>
> Let me add the Chase Sapphire Preferred to my wallet. One tap and it's added.
>
> [Select 'American Express Gold']
>
> I'll add the Amex Gold as well. Now I have two cards in my wallet ready for recommendations."

---

### Part 3: AI Recommendation Demo (2 minutes)
**Presenter:** Matt

**Actions:**
1. Navigate to "Transaction" tab (center button)
2. Enter merchant: "Starbucks"
3. Select category: "Dining"
4. Select goal: "Travel Points"
5. Tap "Get Recommendation"

**Script:**
> "Now let's say I'm about to grab coffee at Starbucks. Which card should I use?
>
> [Navigate to Transaction tab]
>
> I enter the merchant name - 'Starbucks'
>
> [Type 'Starbucks']
>
> Select the category - 'Dining'
>
> [Select 'Dining']
>
> And choose my optimization goal. Since I'm planning a trip, I'll select 'Travel Points'
>
> [Select 'Travel Points']
>
> [Tap 'Get Recommendation']
>
> In less than 2 seconds, our AI powered by Llama 3 analyzes my cards and gives me a recommendation.
>
> [Show result screen]
>
> The AI recommends the Chase Sapphire Preferred because it earns 3x points on dining. It shows me I'll earn 3 points per dollar spent, and explains why this is better than my Amex Gold for this specific goal.
>
> The AI also shows alternative options and the expected value from each card."

**Second Transaction:**
**Actions:**
1. Go back to Transaction screen
2. Enter merchant: "Target"
3. Category: "Shopping"
4. Goal: "Cash Back"
5. Get Recommendation

**Script:**
> "Let's try another scenario. I'm shopping at Target and want cash back instead of points.
>
> [Enter 'Target', select 'Shopping', select 'Cash Back']
>
> [Get Recommendation]
>
> Now the AI recommends a different card - showing how it adapts to the merchant, category, and your personal goals."

---

### Part 4: Location Feature Demo (1 minute)
**Presenter:** Atharva

**Actions:**
1. Navigate to "Home" tab
2. Show nearby places card
3. Tap location button (if available)

**Script:**
> "Our app also has location-based features powered by Google Places API.
>
> [Navigate to Home tab]
>
> On the home screen, the app shows nearby merchants and recommends the best card for each location.
>
> [Point to nearby places]
>
> You can see coffee shops, restaurants, and stores nearby, along with which card to use at each one. This makes it easy to plan your spending before you even leave the house."

---

### Part 5: Analytics Dashboard (1 minute)
**Presenter:** Eugene

**Actions:**
1. Navigate to "History" tab
2. Show transaction history
3. Scroll through past recommendations
4. Show analytics (if available)

**Script:**
> "The app also tracks your recommendations and shows analytics.
>
> [Navigate to History tab]
>
> You can see all your past transactions, what card we recommended, and the potential rewards.
>
> [Scroll through history]
>
> The system learns from your behavior and identifies patterns in your spending, helping make even better recommendations over time."

---

### Part 6: Technical Architecture (1 minute)
**Presenter:** Eugene

**Visuals:** Show architecture slide

**Script:**
> "Let me quickly explain what's happening under the hood:
>
> **Frontend:** React Native with Expo for cross-platform mobile development - works on iOS, Android, and web from a single codebase.
>
> **Backend:** FastAPI, a modern Python web framework, with PostgreSQL database storing user data, cards, and transactions.
>
> **AI Engine:** We use Llama 3, an open-source language model, via Groq's API for ultra-fast inference. Recommendations return in under 2 seconds.
>
> **Location Services:** Google Places API integration for nearby merchant discovery.
>
> **Deployment:** Fully containerized with Docker and deployed on Railway for production.
>
> The entire system is tested with 47+ integration tests achieving 75% code coverage."

---

### Part 7: Value Proposition & Future Work (1 minute)
**Presenter:** Eugene

**Script:**
> "So what's the value?
>
> **For Users:**
> - Never miss rewards optimization opportunities
> - Instant AI-powered recommendations
> - No mental overhead tracking multiple cards
> - Simple, fast, and intelligent
>
> **Future Enhancements:**
> We're planning to add:
> 1. **Bank integration** using Plaid API for automatic transaction import
> 2. **Spending prediction** using machine learning
> 3. **Annual fee optimization** - telling you if a card is worth keeping
> 4. **Expanded card library** with 100+ cards
> 5. **Social features** to compare optimization strategies
>
> This is a production-ready application that solves a real problem millions of credit card users face every day."

---

### Closing & Q&A (1 minute)
**Presenter:** Eugene

**Script:**
> "To summarize: We built an AI-powered mobile app that maximizes credit card rewards using modern technologies - React Native, FastAPI, PostgreSQL, and Llama 3 AI.
>
> The app is fast, intelligent, and user-friendly. It turns a complex optimization problem into a simple tap on your phone.
>
> We're happy to answer any questions!"

---

## Question & Answer Prep

### Expected Questions & Answers

**Q: How accurate are the AI recommendations?**
**A:** The AI uses deterministic calculations for reward values combined with Llama 3's reasoning. For straightforward cases (e.g., travel at 3x vs 1x), accuracy is 100%. For complex scenarios with multiple factors, the AI provides confidence scores and shows alternatives.

**Q: What happens if the API is down?**
**A:** We have fallback logic - the app uses simple rule-based recommendations (highest category match) if Groq API is unavailable. We also implement retry logic and rate limit handling.

**Q: How do you handle security and privacy?**
**A:**
- All sensitive data (API keys) stored in environment variables
- PostgreSQL database with proper access controls
- HTTPS encryption for all API calls
- No third-party data sharing
- Users can delete their data anytime

**Q: Why use Llama 3 instead of GPT-4?**
**A:**
- Groq's LPU (Language Processing Unit) provides sub-2-second inference
- Llama 3 is open-source with no vendor lock-in
- Cost-effective for high-volume requests
- Sufficient reasoning capability for our use case

**Q: How do you prevent the AI from hallucinating?**
**A:**
- We provide structured prompts with all card data
- Calculations are done programmatically, AI only generates explanations
- We validate AI outputs against expected reward values
- Confidence scoring helps identify uncertain recommendations

**Q: Can users add their own custom cards?**
**A:** Currently, users select from our pre-seeded library of 20+ cards. This ensures data quality and accurate reward calculations. Future versions will allow custom card entry.

**Q: How do you handle rotating categories (like Discover It)?**
**A:** Our database schema supports time-based rewards and category rotation. The implementation can be extended to update quarterly categories either manually or via API integration with issuers.

**Q: What about annual fees in recommendations?**
**A:** The AI considers annual fees in the optimization calculation. For example, if a card has a $95 annual fee but earns significantly more rewards, the AI will recommend it and explain the trade-off.

**Q: How do you scale this for millions of users?**
**A:**
- PostgreSQL can handle millions of records with proper indexing
- FastAPI supports async operations for concurrent requests
- Docker containerization allows horizontal scaling
- Groq API has high throughput (we handle rate limits intelligently)
- Database read replicas can be added for read-heavy workloads

**Q: What's your business model?**
**A:** This is an academic project, but potential monetization:
- Freemium (basic free, premium analytics)
- Affiliate commissions from card issuers
- Sponsored card placements
- B2B licensing to financial institutions

---

## Technical Details (For Deep Questions)

### Response Time Breakdown
- API call to backend: ~100ms
- Database query (user cards): ~50ms
- Groq API inference (Llama 3): ~500-1500ms
- Response formatting: ~50ms
- **Total:** <2 seconds end-to-end

### Database Optimization
- Indexed columns: user_id, merchant, category, created_at
- Connection pooling for efficient database access
- SQLAlchemy ORM with lazy loading for related objects

### AI Prompt Engineering
```
System: You are a credit card rewards optimization expert.

User has these cards:
1. Chase Sapphire Preferred: 3x travel, 2x dining, 1x other | $95/year
2. Amex Gold: 4x dining, 4x groceries, 1x other | $250/year

Transaction: Starbucks (dining), Goal: travel_points

Analyze which card earns the most value and explain why.
```

### Test Coverage
- 47+ integration tests
- Edge cases: no cards, invalid input, API failures
- Performance tests: response time under load
- Rate limit tests: Groq API quota handling

---

## Demo Day Logistics

### Equipment Needed
- [ ] Laptop for presentation slides
- [ ] iPhone/Android device with app installed
- [ ] HDMI cable for screen mirroring (or AirPlay/Chromecast)
- [ ] Backup device in case primary fails
- [ ] Chargers for all devices
- [ ] WiFi credentials (or mobile hotspot)

### Room Setup
- [ ] Arrive 15 minutes early
- [ ] Test projector/screen mirroring
- [ ] Connect to WiFi
- [ ] Test backend API (curl health check)
- [ ] Open app and verify it works
- [ ] Queue up presentation slides

### Contingency Plans
1. **If Railway backend is down:**
   - Switch to localhost with ngrok/localtunnel
   - Show pre-recorded demo video

2. **If WiFi is poor:**
   - Use mobile hotspot
   - Show screenshots and pre-recorded video

3. **If app crashes:**
   - Switch to backup device
   - Show architecture slides and explain verbally

4. **If Groq API hits rate limit:**
   - We have retry logic that handles this
   - Worst case: show cached example responses

---

## Post-Demo Actions

- [ ] Collect feedback from professor and peers
- [ ] Note any questions we couldn't answer
- [ ] Update documentation based on feedback
- [ ] Share demo recording with team
- [ ] Celebrate successful demo! 🎉

---

**Good luck team! We've built something amazing.**

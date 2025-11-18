# Railway Deployment Guide

**For:** Person assigned to Railway deployment
**Last Updated:** November 18, 2024

---

## What is Railway?

Railway is a modern deployment platform that makes it easy to deploy web applications and databases without complex DevOps setup. It's the professor's requirement for this project (no localhost allowed).

**Website:** https://railway.app

---

## Prerequisites

1. **Railway Account:**
   - Sign up at https://railway.app
   - Free tier includes $5/month credit (sufficient for demo)
   - Can use GitHub login for easy access

2. **Required API Keys:**
   - `GROQ_API_KEY` - Get from https://console.groq.com
   - `GOOGLE_PLACES_API_KEY` - Get from https://console.cloud.google.com

3. **GitHub Repository:**
   - Our repo: https://github.com/eugenelacatis/CreditCardRewardsMaximizer
   - Railway can auto-deploy from GitHub

---

## Step-by-Step Deployment

### Step 1: Create New Project

1. Log in to Railway: https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access the GitHub repo
5. Select: `eugenelacatis/CreditCardRewardsMaximizer`

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision a PostgreSQL database
4. Note: Database URL will be automatically available as `DATABASE_URL` environment variable

### Step 3: Configure Backend Service

1. Click "+ New" → "GitHub Repo" → Select our repo
2. Railway will detect the Dockerfile in `/backend`
3. Configure build settings:
   - **Root Directory:** `backend`
   - **Dockerfile Path:** `backend/Dockerfile` (or just `Dockerfile` if root is `backend`)
   - **Build Command:** (handled by Dockerfile)
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 4: Add Environment Variables

In the backend service settings, add these environment variables:

```
GROQ_API_KEY=gsk_... (your actual Groq API key)
GOOGLE_PLACES_API_KEY=AIza... (your actual Google Places API key)
DATABASE_URL=${{Postgres.DATABASE_URL}} (Railway auto-fills this)
```

**How to add:**
1. Click on backend service
2. Go to "Variables" tab
3. Click "+ New Variable"
4. Add each key-value pair
5. Click "Deploy" to restart with new variables

**Important:** `DATABASE_URL` is automatically provided by Railway when you link the PostgreSQL database. You can reference it as `${{Postgres.DATABASE_URL}}`.

### Step 5: Link Database to Backend

1. In backend service, go to "Settings" tab
2. Under "Service Connections", click "Link"
3. Select your PostgreSQL database
4. This automatically adds `DATABASE_URL` to backend environment variables

### Step 6: Configure Networking

1. In backend service, go to "Settings" tab
2. Under "Networking", click "Generate Domain"
3. Railway will give you a public URL like: `https://creditcardrewardsmaximizer-production.up.railway.app`
4. Copy this URL - you'll need it for frontend!

### Step 7: Deploy and Wait

1. Railway will automatically start deploying
2. Watch the build logs (click on service → "Deployments" tab)
3. Wait for build to complete (usually 2-5 minutes)
4. Check for any errors in logs

### Step 8: Verify Deployment

Test these endpoints in your browser:

1. **Health Check:**
   ```
   https://your-app.railway.app/health
   ```
   Should return: `{"status": "healthy"}`

2. **API Documentation:**
   ```
   https://your-app.railway.app/docs
   ```
   Should show interactive API docs (Swagger UI)

3. **Test Endpoint:**
   ```
   https://your-app.railway.app/api/v1/categories
   ```
   Should return list of categories

### Step 9: Initialize Database

The database needs to be seeded with cards and merchants:

**Option A: Using Railway CLI (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run seed scripts
railway run python init_db.py
railway run python -c "from seed_data import seed_cards; seed_cards()"
railway run python -c "from seed_data import seed_merchants; seed_merchants()"
```

**Option B: Manual Seeding via API**
- Create seed endpoint in `main.py`:
  ```python
  @app.post("/api/v1/admin/seed-database")
  async def seed_database(db: Session = Depends(get_db)):
      # Call seeding functions
      seed_cards(db)
      seed_merchants(db)
      return {"status": "Database seeded successfully"}
  ```
- Call the endpoint once after deployment
- Then remove/protect the endpoint

**Option C: Local Connection**
```bash
# Get database URL from Railway
railway variables

# Copy DATABASE_URL and use it locally
export DATABASE_URL="postgresql://..."
python init_db.py
```

---

## Troubleshooting Common Issues

### Issue: Build Fails

**Symptoms:** Deployment fails during build
**Solutions:**
1. Check build logs for specific error
2. Verify `requirements.txt` is in `/backend` directory
3. Ensure Dockerfile is correctly configured
4. Check if all dependencies are installable

**Common Errors:**
- `No module named 'dotenv'` → Add `python-dotenv` to requirements.txt
- `Could not find requirements.txt` → Check root directory setting
- `Port binding error` → Ensure using `$PORT` environment variable

### Issue: Database Connection Fails

**Symptoms:** App starts but crashes when accessing database
**Solutions:**
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` environment variable is set
3. Ensure database service is linked to backend service
4. Check database credentials in logs (Railway auto-generates them)

**Debug:**
```python
# Add to main.py temporarily
import os
print("DATABASE_URL:", os.getenv("DATABASE_URL"))
```

### Issue: Environment Variables Not Working

**Symptoms:** `GROQ_API_KEY` or `GOOGLE_PLACES_API_KEY` errors
**Solutions:**
1. Verify variables are added in Railway dashboard
2. Redeploy after adding variables (click "Deploy")
3. Check for typos in variable names
4. Ensure no quotes around values in Railway UI

### Issue: CORS Errors

**Symptoms:** Frontend can't connect to backend
**Solutions:**
1. Verify CORS middleware is configured in `main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Allow all origins for demo
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
2. Check Railway URL in frontend matches exactly (no trailing slash)

### Issue: API Responds Slowly

**Symptoms:** Requests take >10 seconds
**Solutions:**
1. Check Groq API key is valid and has quota
2. Verify database queries are optimized
3. Check Railway service logs for bottlenecks
4. Consider upgrading Railway plan (free tier has limitations)

---

## Production Checklist

Before telling the team it's ready:

- [ ] Health endpoint returns 200 OK
- [ ] API docs accessible at `/docs`
- [ ] Database seeded with card library (20+ cards)
- [ ] Database seeded with merchants (50-100 merchants)
- [ ] Test user can be created via `/api/v1/auth/signup`
- [ ] Test user can log in via `/api/v1/auth/signin`
- [ ] Test recommendation endpoint works:
  ```bash
  curl -X POST https://your-app.railway.app/api/v1/recommend \
    -H "Content-Type: application/json" \
    -d '{
      "user_id": "test123",
      "merchant": "Starbucks",
      "amount": 10.0,
      "category": "dining",
      "optimization_goal": "travel_points"
    }'
  ```
- [ ] Railway logs show no critical errors
- [ ] Database connection is stable (no disconnects)
- [ ] Response times are reasonable (<5 seconds)

---

## What to Share with Team

Once deployment is complete, share:

1. **Backend URL:**
   ```
   https://your-app.railway.app
   ```

2. **API Documentation URL:**
   ```
   https://your-app.railway.app/docs
   ```

3. **Health Check URL:**
   ```
   https://your-app.railway.app/health
   ```

4. **Test Credentials** (if you created a test user):
   ```
   Username: demo@test.com
   Password: demo123
   ```

5. **Deployment Status:**
   - Database: ✅ Running
   - Backend: ✅ Running
   - Seed Data: ✅ Loaded
   - APIs: ✅ All working

**Post in team chat:**
```
🚀 Railway Deployment Complete!

Backend URL: https://your-app.railway.app
API Docs: https://your-app.railway.app/docs
Health Check: https://your-app.railway.app/health

Status: All systems operational ✅
Database: Seeded with 20+ cards and 50+ merchants ✅

Frontend team: Update API_BASE_URL in frontend/src/services/api.js

Test user:
- Email: demo@test.com
- Password: demo123

Let me know if you encounter any issues!
```

---

## Railway Dashboard Tips

**Monitoring:**
- **Metrics:** Click service → "Metrics" tab to see CPU, memory, request rate
- **Logs:** Click service → "Deployments" → Click active deployment → View logs
- **Usage:** Click project → "Usage" tab to monitor credit consumption

**Useful Commands:**
- **Restart Service:** Click service → "Settings" → "Restart"
- **View Environment Variables:** Click service → "Variables"
- **Redeploy:** Click service → "Deployments" → "Deploy"
- **Rollback:** Click service → "Deployments" → Click old deployment → "Redeploy"

**Cost Monitoring:**
- Free tier: $5/month credit
- PostgreSQL: ~$0.01/hour (~$7/month)
- Backend service: ~$0.01/hour (~$7/month)
- Total: ~$14/month (exceeds free tier after ~15 days)
- **For Demo:** Free tier is sufficient if deployed <1 week before demo

---

## Alternative: Quick Deploy with Railway CLI

If you prefer command line:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (in repo root)
railway init

# Link to PostgreSQL
railway add --database postgres

# Set environment variables
railway variables set GROQ_API_KEY=gsk_your_key_here
railway variables set GOOGLE_PLACES_API_KEY=AIza_your_key_here

# Deploy backend
cd backend
railway up

# Check deployment
railway open
```

---

## Support Resources

**Railway Documentation:**
- Getting Started: https://docs.railway.app/getting-started
- PostgreSQL: https://docs.railway.app/databases/postgresql
- Environment Variables: https://docs.railway.app/develop/variables

**Railway Community:**
- Discord: https://discord.gg/railway
- GitHub: https://github.com/railwayapp/railway

**Our Project Documentation:**
- Main README: `/README.md`
- Backend README: `/backend/README.md`
- API Documentation: `/backend/API.md`

---

## Post-Deployment: Frontend Update

After you share the Railway URL, the frontend team needs to update:

**File:** `frontend/src/services/api.js`

**Change:**
```javascript
// Before (localhost)
const API_BASE_URL = 'http://localhost:8000/api/v1';

// After (Railway)
const API_BASE_URL = 'https://your-app.railway.app/api/v1';
```

**Test:**
1. Restart Expo: `npx expo start`
2. Scan QR code with Expo Go app
3. Try logging in / getting recommendation
4. Should work from anywhere (not just local network)

---

## Timeline

**Total Time:** 1-2 hours (first time)

- Railway account setup: 10 minutes
- Project creation: 5 minutes
- Database provisioning: 5 minutes
- Backend configuration: 15 minutes
- Environment variables: 10 minutes
- Deployment: 10 minutes (automatic)
- Database seeding: 15 minutes
- Testing and verification: 20 minutes
- Documentation and team notification: 10 minutes

**Ongoing:** Railway will auto-deploy on every push to main branch (if configured)

---

## Security Notes

1. **Never commit API keys to GitHub**
   - Always use environment variables
   - Keys in Railway are encrypted

2. **Database Security**
   - Railway PostgreSQL is private by default
   - Only accessible from Railway services
   - Connection string is automatically secured

3. **HTTPS**
   - Railway provides free SSL certificates
   - All traffic is encrypted

4. **Environment Variables**
   - Stored securely in Railway
   - Not visible in logs
   - Can be updated without code changes

---

## Questions?

**Contact:** Eugene (project lead) or team chat

**Common Questions:**

**Q: How much will this cost?**
A: Free tier ($5/month credit) is sufficient for demo. Actual cost ~$0.02/hour. For a 1-week demo, ~$3.50 total.

**Q: Can we use a custom domain?**
A: Yes, Railway supports custom domains, but the Railway-provided domain (*.up.railway.app) works fine for our demo.

**Q: What if we exceed free tier?**
A: Railway will notify you. You can add a credit card to continue, or project will pause. For demo, free tier is enough.

**Q: Can we deploy frontend too?**
A: Yes, but for our demo, Expo Go is simpler. Frontend deployment is optional.

**Q: How do we update after deployment?**
A: Just push to GitHub. Railway auto-deploys. Or use `railway up` CLI command.

---

**Good luck with the deployment!** 🚀

Let the team know once it's live so we can update the frontend and test end-to-end.

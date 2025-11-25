# 🚀 Deployment Guide - Render + Vercel

This guide will help you deploy the Scribble game with the backend on **Render** and the frontend on **Vercel**.

---

## 📦 Backend Deployment (Render)

### Step 1: Prepare Your GitHub Repository

Make sure all changes are pushed to GitHub:
```bash
git add .
git commit -m "Deploy: Ready for production deployment"
git push origin master
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your `scribble` repository
3. Configure the service:

**Basic Settings:**
- **Name:** `scribble-backend` (or your preferred name)
- **Region:** Choose closest to your users
- **Branch:** `master`
- **Root Directory:** `backend`
- **Runtime:** `Docker`

**Build & Deploy:**
- **Docker Command:** (Leave empty, Render will auto-detect Dockerfile)

**Instance Type:**
- Select **Free** tier (or paid for better performance)

### Step 4: Set Environment Variables

In Render dashboard, go to **Environment** tab and add:

| Key | Value | Description |
|-----|-------|-------------|
| `PORT` | `8080` | Server port (auto-set by Render) |
| `APP_SELF_PING_URL` | `https://YOUR-APP-NAME.onrender.com` | Replace with your Render URL |
| `FRONTEND_URL` | `https://YOUR-VERCEL-APP.vercel.app` | Your Vercel frontend URL (add after Vercel deployment) |

**Note:** You'll update `FRONTEND_URL` after deploying the frontend.

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for the build to complete (5-10 minutes first time)
3. Once deployed, copy your backend URL: `https://YOUR-APP-NAME.onrender.com`

### Step 6: Update APP_SELF_PING_URL

1. Go back to **Environment** tab
2. Update `APP_SELF_PING_URL` with your actual Render URL
3. Save changes (will trigger auto-redeploy)

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your `scribble` repository
3. Configure the project:

**Project Settings:**
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 3: Set Environment Variables

Before deploying, add these environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `VITE_BACKEND_URL` | `https://YOUR-RENDER-APP.onrender.com` | Your Render backend URL |
| `VITE_WS_URL` | `https://YOUR-RENDER-APP.onrender.com` | Same as backend URL |

**How to add:**
1. Click **"Environment Variables"** section
2. Add both variables
3. Select **All** environments (Production, Preview, Development)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-3 minutes)
3. Once deployed, copy your frontend URL: `https://YOUR-PROJECT.vercel.app`

### Step 5: Update Backend CORS

1. Go back to your Render dashboard
2. Navigate to **Environment** tab
3. Update `FRONTEND_URL` with your Vercel URL
4. Save (will trigger auto-redeploy)

---

## ✅ Verify Deployment

### Test Backend

Visit these URLs in your browser:

- **Health Check:** `https://YOUR-RENDER-APP.onrender.com/health`
  - Should return: `healthy`
  
- **Ping Check:** `https://YOUR-RENDER-APP.onrender.com/ping`
  - Should return: `alive`

### Test Frontend

1. Open your Vercel URL: `https://YOUR-PROJECT.vercel.app`
2. Enter a username
3. Create a lobby
4. Verify that you can:
   - Create a room
   - See room code
   - Start game (if alone, it should work)
   - Draw on canvas
   - Send chat messages

### Check Logs

**Render Logs:**
- Go to Render dashboard → Your service → **Logs** tab
- Look for: `>>> Self-ping successful`
- Should appear every 10 minutes

**Vercel Logs:**
- Go to Vercel dashboard → Your project → **Deployments**
- Click on latest deployment → **Functions** tab
- Check for any errors

---

## 🔧 Troubleshooting

### Backend Issues

**Issue:** 503 Service Unavailable
- **Solution:** Render free tier sleeps after inactivity. Wait 30-60 seconds for cold start.

**Issue:** Build failed
- **Solution:** Check Render logs for errors. Ensure Dockerfile is in `backend/` directory.

**Issue:** WebSocket connection fails
- **Solution:** 
  - Verify `FRONTEND_URL` is set correctly in Render
  - Check CORS configuration in `WebSocketConfig.java`
  - Ensure using `https://` (not `http://`) for production URLs

### Frontend Issues

**Issue:** Cannot connect to backend
- **Solution:** 
  - Verify `VITE_BACKEND_URL` is set in Vercel
  - Check that backend is running (visit `/health` endpoint)
  - Verify CORS is configured correctly

**Issue:** WebSocket not connecting
- **Solution:**
  - Check browser console for errors
  - Verify `VITE_WS_URL` matches `VITE_BACKEND_URL`
  - Ensure backend URL uses `https://`

**Issue:** 404 on refresh
- **Solution:** Vercel should handle this with `vercel.json` rewrites. Verify the file exists.

### CORS Issues

**Issue:** CORS error in browser console
- **Solution:**
  - Verify `FRONTEND_URL` environment variable is set correctly in Render
  - Include protocol (`https://`) in the URL
  - No trailing slash in URL
  - Redeploy backend after changing environment variables

---

## 🔄 Updating Deployment

### Update Backend

```bash
# Make changes to backend code
git add backend/
git commit -m "Update backend feature"
git push origin master
```

Render will automatically rebuild and deploy.

### Update Frontend

```bash
# Make changes to frontend code
git add frontend/
git commit -m "Update frontend feature"
git push origin master
```

Vercel will automatically rebuild and deploy.

---

## 💰 Costs

**Render Free Tier:**
- ✅ Free forever
- ⏱️ 750 hours/month (enough for 1 service 24/7)
- 🐌 Sleeps after 15 minutes of inactivity
- 🔄 Self-ping keeps it awake

**Vercel Free Tier:**
- ✅ Free forever
- 📊 100 GB bandwidth/month
- ⚡ Automatic HTTPS
- 🌍 Global CDN

**Upgrade Options:**
- Render Starter: $7/month (no sleep, faster)
- Vercel Pro: $20/month (more bandwidth)

---

## 🎯 Production Checklist

Before going live:

- [ ] Backend health check working
- [ ] Frontend loads correctly
- [ ] Can create and join rooms
- [ ] Drawing synchronizes across players
- [ ] Chat messages work
- [ ] Game rounds complete successfully
- [ ] Self-ping is active (check logs)
- [ ] All environment variables set correctly
- [ ] CORS configured for production URLs
- [ ] Test with 2+ players in different locations

---

## 📞 Support

If you encounter issues:

1. Check Render logs: Dashboard → Service → Logs
2. Check Vercel logs: Dashboard → Project → Deployments → Latest → Functions
3. Check browser console (F12) for frontend errors
4. Verify all environment variables are set correctly
5. Ensure URLs use `https://` (not `http://`)

---

## 🎉 Success!

Your Scribble game is now deployed and accessible worldwide! 

**Share your game:**
- Backend API: `https://YOUR-RENDER-APP.onrender.com`
- Play the game: `https://YOUR-PROJECT.vercel.app`

Share the Vercel URL with friends to play together! 🎨

---

**Made with ❤️ | Happy Drawing!**

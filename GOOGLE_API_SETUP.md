# 🗺️ Google Directions API Setup Guide

## Current Status

Your API key is configured but **Directions API is NOT enabled**. The system works with a fallback (straight-line routes), but for optimal routing, follow these steps.

---

## ⚠️ Why You Need This

**Without Directions API:**
- ❌ Straight-line routes (as the crow flies)
- ❌ No turn-by-turn navigation
- ❌ Inaccurate distance
- ❌ Wrong ETA

**With Directions API:**
- ✅ Real road-based routes
- ✅ Optimized shortest path
- ✅ Accurate distance
- ✅ Precise ETA
- ✅ Turn-by-turn navigation

---

## 📋 Step-by-Step Setup

### Step 1: Go to Google Cloud Console

Visit: https://console.cloud.google.com

### Step 2: Select Your Project

1. Click the project dropdown (top left)
2. Select your existing project (the one with your API key)
   - Your API key: `AIzaSyCJvjpt_gZpTbMXxHYK5qIXeQE-VfumNY8`

### Step 3: Enable Directions API

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. In the search box, type: **"Directions API"**
3. Click on **"Directions API"**
4. Click the blue **"Enable"** button
5. Wait for it to enable (~10 seconds)

### Step 4: Enable Distance Matrix API

1. Click **"Library"** again
2. Search: **"Distance Matrix API"**
3. Click on it
4. Click **"Enable"**

### Step 5: Enable Maps JavaScript API (if not already)

1. Click **"Library"** again
2. Search: **"Maps JavaScript API"**
3. If not enabled, click **"Enable"**

### Step 6: Verify Billing is Enabled

**Important:** Google requires billing info for APIs, but has a generous free tier.

1. Click **"Billing"** in the left sidebar
2. If not set up, click **"Link a billing account"**
3. Add a credit/debit card
4. Don't worry - you won't be charged unless you exceed free tier

**Free Tier Limits:**
- Directions API: **40,000 requests/month FREE**
- Distance Matrix API: **40,000 requests/month FREE**
- Maps JavaScript API: **28,000 map loads/month FREE**

**After free tier:**
- $0.005 per request (half a cent)

### Step 7: Check API Restrictions

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click on your API key
3. Under **"Application restrictions"**, select **"None"** (for testing)
   - Or add `localhost` and your production domain
4. Under **"API restrictions"**, select **"Don't restrict key"** (for testing)
   - Or select only the APIs you're using
5. Click **"Save"**

### Step 8: Test the API

Run this in your terminal:

```bash
node test-google-route.js
```

**Expected output (success):**
```
✅ Route fetched successfully!
Distance: 15.9 km
Duration: 32 mins
Steps: 23
```

**If still failing:**
- Wait 5-10 minutes for changes to propagate
- Restart your dev server: `npm run dev`

---

## 🧪 Quick Test

After enabling:

1. Visit: http://localhost:3000/demo
2. Click **"Start Simulation"**
3. You should see a **real road-based route** (not straight line)
4. Check browser console for any errors

---

## 💰 Cost Estimate

### Free Tier (Most Use Cases)

Your platform usage:
- **Per order:** ~3 API calls
  - 1 Directions API (route)
  - 1 Distance Matrix API (ETA)
  - 1 Maps JavaScript API (display)

With free tier:
- **13,000+ orders/month** = $0
- **100+ orders/day** = $0

### Paid Usage

After free tier (~13,000 orders/month):
- **Each additional order:** ~$0.015 (1.5 cents)
- **1,000 extra orders:** ~$15
- **10,000 extra orders:** ~$150

**Recommendation:** Set up billing alerts at $10, $50, $100

---

## 🔒 Security Best Practices

### 1. API Key Restrictions (Production)

**For Production:**
```
Application restrictions:
  HTTP referrers:
    - https://yourdomain.com/*
    - https://*.yourdomain.com/*

API restrictions:
  ✓ Directions API
  ✓ Distance Matrix API
  ✓ Maps JavaScript API
```

### 2. Use Server-Side API Keys

Your current setup is secure:
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_KEY` - Client-side (Maps only)
- ✅ `GOOGLE_DISTANCE_MATRIX_KEY` - Server-side (hidden)

### 3. Set Billing Alerts

1. Go to **Billing** in Google Cloud Console
2. Click **"Budgets & alerts"**
3. Create budget: $50/month
4. Set alerts at 50%, 90%, 100%

---

## 🚨 Troubleshooting

### Error: "This API key is not authorized"

**Solution:**
1. Make sure Directions API is enabled
2. Wait 5-10 minutes
3. Check API key restrictions
4. Restart dev server

### Error: "You must enable Billing"

**Solution:**
1. Add billing info (required)
2. No charges until you exceed free tier
3. Free tier is 40,000 requests/month

### Error: "REQUEST_DENIED"

**Solution:**
1. Check billing is enabled
2. Verify API is enabled
3. Check API key restrictions
4. Try creating a new API key

### Routes Still Showing Straight Lines

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for errors
4. Verify API is enabled in Google Console

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Directions API shows "Enabled" in Google Console
- [ ] Distance Matrix API shows "Enabled"
- [ ] Maps JavaScript API shows "Enabled"
- [ ] Billing is linked
- [ ] `node test-google-route.js` returns success
- [ ] Demo module shows curved routes (not straight lines)
- [ ] ETA is accurate (not just distance/speed)
- [ ] No console errors in browser

---

## 📞 Support

If you still have issues:

1. **Check Google Cloud Console Logs:**
   - APIs & Services → Dashboard
   - Look for error messages

2. **Check Browser Console:**
   - F12 → Console tab
   - Look for API-related errors

3. **Check Server Logs:**
   - Terminal where `npm run dev` is running
   - Look for API response errors

---

## 🎯 After Enabling

Once enabled, you'll see:

1. **Better Routes:**
   - Follows actual roads
   - Optimized for driving
   - Realistic paths

2. **Accurate ETA:**
   - Based on traffic conditions
   - Real road distances
   - Google's routing algorithm

3. **Professional Navigation:**
   - Turn-by-turn capable
   - Multiple route options
   - Real-time updates

---

## 🚀 Quick Start Command

```bash
# After enabling APIs, test immediately:
node test-google-route.js

# If successful, restart dev server:
npm run dev

# Then test in browser:
# http://localhost:3000/demo
```

---

**You're almost there! Just enable the APIs and you'll have professional-grade routing! 🗺️**

---

## 📚 Official Documentation

- [Directions API Docs](https://developers.google.com/maps/documentation/directions)
- [Distance Matrix API Docs](https://developers.google.com/maps/documentation/distance-matrix)
- [Pricing Info](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Free Tier Details](https://cloud.google.com/maps-platform/pricing)

---

**Good luck! The API setup is the final missing piece for optimal routing.** 🎉

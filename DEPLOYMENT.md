# Deployment Guide

## Overview

This guide covers deploying the ExtraHand Live Tracking platform to various hosting providers.

## Prerequisites

Before deploying, ensure you have:
- ✅ Redis instance (Upstash recommended)
- ✅ MongoDB instance (MongoDB Atlas recommended)
- ✅ Google Maps API keys
- ✅ All environment variables ready

## Deployment Options

### Option 1: Vercel (Recommended for Serverless)

**Pros**: Easy deployment, automatic SSL, global CDN, free tier
**Cons**: WebSocket support limited (use polling fallback)

#### Steps:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Add environment variables in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Mark `NEXT_PUBLIC_*` variables as exposed

5. Redeploy:
```bash
vercel --prod
```

**Note**: Vercel doesn't support custom servers, so WebSocket will auto-fallback to polling.

---

### Option 2: Railway (Recommended for Full WebSocket)

**Pros**: Full WebSocket support, easy deployment, free tier
**Cons**: Slightly more complex than Vercel

#### Steps:

1. Create account at [railway.app](https://railway.app)

2. Install Railway CLI:
```bash
npm i -g @railway/cli
```

3. Login:
```bash
railway login
```

4. Initialize project:
```bash
railway init
```

5. Add environment variables:
```bash
railway variables set NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key
railway variables set GOOGLE_DISTANCE_MATRIX_KEY=your_key
railway variables set REDIS_URL=your_redis_url
railway variables set REDIS_TOKEN=your_token
railway variables set MONGODB_URI=your_mongo_uri
railway variables set WEBSOCKET_SECRET=your_secret
```

6. Deploy:
```bash
railway up
```

Your app will be live with full WebSocket support!

---

### Option 3: DigitalOcean App Platform

**Pros**: Predictable pricing, full control, WebSocket support
**Cons**: Requires credit card

#### Steps:

1. Create account at [digitalocean.com](https://digitalocean.com)

2. Create new App:
   - Connect GitHub repository
   - Select "Web Service"
   - Set build command: `npm run build`
   - Set run command: `npm start`

3. Add environment variables in App settings

4. Deploy

---

### Option 4: AWS (EC2 + PM2)

**Pros**: Full control, scalable, production-grade
**Cons**: More complex setup

#### Steps:

1. Launch EC2 instance (Ubuntu 22.04)

2. SSH into instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Install PM2:
```bash
sudo npm install -g pm2
```

5. Clone repository:
```bash
git clone your-repo-url
cd ExtraHand-Maps
```

6. Install dependencies:
```bash
npm install
```

7. Create `.env.local` file:
```bash
nano .env.local
# Paste your environment variables
```

8. Build:
```bash
npm run build
```

9. Start with PM2:
```bash
pm2 start server.js --name extrahand-tracking
pm2 save
pm2 startup
```

10. Configure Nginx (optional):
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/tracking
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/tracking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Option 5: Docker Deployment

**Pros**: Portable, consistent environments
**Cons**: Requires Docker knowledge

#### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_GOOGLE_MAPS_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_KEY}
      - GOOGLE_DISTANCE_MATRIX_KEY=${GOOGLE_DISTANCE_MATRIX_KEY}
      - REDIS_URL=${REDIS_URL}
      - REDIS_TOKEN=${REDIS_TOKEN}
      - MONGODB_URI=${MONGODB_URI}
      - WEBSOCKET_SECRET=${WEBSOCKET_SECRET}
    restart: unless-stopped
```

#### Deploy:

```bash
# Build
docker build -t extrahand-tracking .

# Run
docker run -d -p 3000:3000 --env-file .env.local extrahand-tracking

# Or with docker-compose
docker-compose up -d
```

---

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.yourapp.com
```

### Production
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

---

## Post-Deployment Checklist

- ✅ All environment variables set
- ✅ Google Maps API working
- ✅ Redis connection successful
- ✅ MongoDB connection successful
- ✅ WebSocket or polling working
- ✅ SSL/HTTPS enabled
- ✅ Custom domain configured
- ✅ Error monitoring setup (optional: Sentry)
- ✅ Analytics setup (optional: Google Analytics)

---

## Monitoring

### Railway
- Built-in metrics in dashboard
- Logs available in real-time

### AWS
```bash
# View PM2 logs
pm2 logs extrahand-tracking

# Monitor
pm2 monit
```

### Docker
```bash
# View logs
docker logs -f container-id

# Monitor resources
docker stats
```

---

## Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage (already implemented)
- Deploy multiple instances behind load balancer
- WebSocket sticky sessions required

### Vertical Scaling
- Increase server RAM for more concurrent connections
- Optimize Next.js build with SWC

### Database Scaling
- MongoDB: Use sharding for large datasets
- Redis: Use Redis Cluster for high availability

---

## Troubleshooting

### WebSocket not connecting
- Ensure WebSocket is supported by platform
- Check CORS settings
- Verify firewall rules
- Use polling fallback

### High latency
- Use CDN for static assets
- Enable caching in Redis
- Optimize database queries

### Memory issues
- Increase server RAM
- Optimize image sizes
- Use Next.js Image component

---

## Cost Estimates

### Free Tier Options:
- **Vercel**: Free for personal projects
- **Railway**: $5/month credit (free tier)
- **MongoDB Atlas**: Free tier (512MB)
- **Upstash Redis**: Free tier (10K commands/day)

### Small Production:
- **Railway**: ~$10-20/month
- **DigitalOcean**: $12/month (basic droplet)
- **MongoDB Atlas**: $9/month (M10 tier)
- **Upstash Redis**: $10/month (Pro tier)

**Total**: ~$30-50/month for small-medium traffic

---

## Security Best Practices

1. **Never commit `.env.local`** to git
2. **Use strong WEBSOCKET_SECRET**
3. **Enable HTTPS** in production
4. **Restrict Redis access** by IP
5. **Use MongoDB connection string** with authentication
6. **Rate limit API endpoints** (add middleware)
7. **Validate all user inputs** (already using Zod)

---

## Support

For deployment issues:
1. Check provider documentation
2. Review application logs
3. Verify environment variables
4. Test locally first

---

**Recommended Stack for Production**:
- **Hosting**: Railway or DigitalOcean
- **Redis**: Upstash (serverless Redis)
- **MongoDB**: MongoDB Atlas
- **Maps**: Google Maps Platform

This combination provides the best balance of cost, performance, and reliability.

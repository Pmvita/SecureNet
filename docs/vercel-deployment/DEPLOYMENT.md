# Vercel Deployment Guide

Complete step-by-step guide to deploy SecureNet frontend to Vercel.

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ Vercel account ([signup here](https://vercel.com/signup))
- ✅ GitHub repository access
- ✅ `Vercel-Branch` ready with frontend-only code
- ✅ Domain name (optional, for custom domain)

## 🔄 Branch Switching Workflow

Since you'll be working on **two different versions** of SecureNet, here's the complete workflow for switching between branches:

### 🌐 Working on Vercel-Branch (Marketing Site)

#### Switch to Vercel-Branch and Pull Latest
```bash
# Check current branch
git branch

# Switch to Vercel-Branch
git checkout Vercel-Branch

# Pull latest changes from remote
git pull origin Vercel-Branch

# Verify you're on the right branch
git branch
# * Vercel-Branch  <-- You should see this
#   main
```

#### Work on Marketing Site
```bash
# Navigate to frontend (if needed)
cd frontend

# Start development server
npm run dev
# ✅ Opens http://localhost:5173 with landing page

# Make your changes to:
# - frontend/src/pages/LandingPage.tsx
# - frontend/src/App.tsx (routing)
# - frontend/public/ (static assets)
# - frontend/vercel.json (deployment config)
```

#### Commit and Push Changes
```bash
# Add your changes
git add .

# Commit with descriptive message
git commit -m "update: improve landing page hero section"

# Push to Vercel-Branch (triggers automatic deployment)
git push origin Vercel-Branch

# ✅ Vercel automatically deploys your changes
```

### 🏢 Working on Main Branch (Full-Stack Enterprise)

#### Switch to Main Branch and Pull Latest
```bash
# Switch to main branch
git checkout main

# Pull latest changes from remote
git pull origin main

# Verify you're on the right branch
git branch
#   Vercel-Branch
# * main  <-- You should see this
```

#### Work on Enterprise Platform
```bash
# Start backend (in one terminal)
./start_enterprise.sh
# OR
./start_production.sh

# Start frontend (in another terminal)
cd frontend
npm run dev
# ✅ Opens http://localhost:5173 with full platform

# Make your changes to:
# - Backend: api/, database/, src/
# - Frontend: full feature set
# - Documentation: docs/
```

#### Commit and Push Changes
```bash
# Add your changes
git add .

# Commit with descriptive message
git commit -m "feat: add new enterprise security dashboard"

# Push to main branch
git push origin main

# ✅ Updates main branch (for internal/staging deployment)
```

### 🔄 Daily Development Pattern

#### Morning Routine
```bash
# Check what branch you're on
git status
git branch

# Fetch all latest changes
git fetch --all

# See what's new on both branches
git log --oneline -5 main
git log --oneline -5 Vercel-Branch
```

#### Switching Between Projects
```bash
# Working on marketing site? 
git checkout Vercel-Branch
git pull origin Vercel-Branch
cd frontend && npm run dev

# Working on enterprise platform?
git checkout main  
git pull origin main
./start_enterprise.sh
```

### 🚨 Important Safety Checks

#### Before Making Changes
```bash
# ALWAYS check current branch first
git branch
git status

# Make sure you're in the right place:
# Vercel-Branch = Marketing site work
# main = Enterprise platform work
```

#### Before Committing
```bash
# Double-check what you're committing
git status
git diff

# Make sure commit message matches the branch:
# Vercel-Branch: "update: improve signup form"
# main: "feat: add enterprise audit logs"
```

### 🎯 Quick Reference Commands

```bash
# Switch to marketing site work
git checkout Vercel-Branch && git pull origin Vercel-Branch

# Switch to enterprise platform work  
git checkout main && git pull origin main

# Check current status
git branch && git status

# Push marketing changes (auto-deploys to Vercel)
git add . && git commit -m "update: marketing site" && git push origin Vercel-Branch

# Push enterprise changes
git add . && git commit -m "feat: enterprise feature" && git push origin main
```

### ⚠️ Common Pitfalls to Avoid

1. **Wrong Branch:** Always run `git branch` before making changes
2. **Stale Code:** Always `git pull` before starting work
3. **Mixed Commits:** Don't mix marketing and enterprise changes in one commit
4. **Force Push:** Never use `git push --force` on shared branches

## 🚀 Deployment Methods

### Method 1: GitHub Integration (Recommended)

#### Step 1: Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Select **`Vercel-Branch`** as the branch to deploy

#### Step 2: Configure Build Settings
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: frontend
```

#### Step 3: Environment Variables
```
VITE_APP_MODE=production
VITE_MOCK_DATA=false
VITE_API_BASE_URL=https://coming-soon
VITE_ENVIRONMENT=vercel
```

#### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for build to complete
3. Get your live URL (e.g., `your-app.vercel.app`)

### Method 2: Vercel CLI

#### Install Vercel CLI
```bash
npm install -g vercel
```

#### Deploy from Terminal
```bash
# Switch to Vercel branch
git checkout Vercel-Branch

# Navigate to frontend
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# ? Set up and deploy "~/SecureNet/frontend"? [Y/n] y
# ? Which scope do you want to deploy to? [your-team]
# ? Link to existing project? [y/N] n
# ? What's your project's name? securenet
# ? In which directory is your code located? ./
```

## ⚙️ Configuration Files

### vercel.json
Create `frontend/vercel.json`:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options", 
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### package.json Scripts
Ensure these scripts exist in `frontend/package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

## 🌐 Custom Domain Setup

### Step 1: Domain Configuration
1. Go to **Project Settings** in Vercel
2. Click **"Domains"** tab
3. Add your custom domain (e.g., `securenet.ai`)

### Step 2: DNS Configuration
Add these DNS records at your domain provider:

**For Root Domain (securenet.ai):**
```
Type: A
Name: @
Value: 76.76.19.61
```

**For Subdomain (www.securenet.ai):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 3: SSL Certificate
- Vercel automatically provides SSL certificates
- Wait 24-48 hours for full propagation

## 📊 Performance Optimization

### Build Optimization
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@heroicons/react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}
```

### Asset Optimization
- ✅ Images compressed and optimized
- ✅ Fonts subset and preloaded
- ✅ CSS purged of unused styles
- ✅ JavaScript minified and tree-shaken

## 🔍 Monitoring & Analytics

### Vercel Analytics
```javascript
// Add to main.tsx
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  )
}
```

### Google Analytics
```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🚨 Troubleshooting

### Build Failures

#### Error: "Command failed: npm run build"
```bash
# Check build locally first
cd frontend
npm install
npm run build

# Fix any TypeScript errors
npm run type-check

# Fix any linting errors  
npm run lint
```

#### Error: "Cannot resolve module"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Deployment Issues

#### "Branch not found"
```bash
# Ensure branch exists on remote
git push origin Vercel-Branch

# Check branch in Vercel dashboard
# Project Settings > Git > Production Branch
```

#### "Environment variables not working"
- Check variable names start with `VITE_`
- Verify they're added in Vercel dashboard
- Redeploy after adding variables

### Performance Issues

#### "Large bundle size"
```bash
# Analyze bundle
npm run build
npx vite-bundle-analyzer dist

# Optimize imports
# Use dynamic imports for large components
```

## 📈 Deployment Checklist

### Pre-Deployment ✅
- [ ] Code tested locally
- [ ] Build completes without errors
- [ ] All assets optimized
- [ ] Environment variables configured
- [ ] Branch pushed to GitHub

### Post-Deployment ✅  
- [ ] Site loads correctly
- [ ] Forms work properly
- [ ] Links function as expected
- [ ] Mobile responsive
- [ ] Performance metrics good
- [ ] Analytics tracking works

## 🔄 Continuous Deployment

### Automatic Deployments
Vercel automatically deploys when you push to `Vercel-Branch`:

```bash
# Make changes
git add .
git commit -m "Update coming soon page"
git push origin Vercel-Branch

# ✅ Vercel automatically deploys
```

### Preview Deployments
- Every pull request gets a preview URL
- Test changes before merging
- Share preview links with stakeholders

## 📞 Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vercel Community:** https://github.com/vercel/vercel/discussions
- **Vercel Support:** https://vercel.com/support
- **Status Page:** https://vercel-status.com

---

**Next Steps:** After successful deployment, update your domain DNS settings and configure custom analytics tracking.
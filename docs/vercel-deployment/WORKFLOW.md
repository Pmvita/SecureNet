# Development Workflow Guide

Daily development workflow for managing both `main` and `Vercel-Branch` independently.

## 📅 Daily Workflow

### Option B: Independent Branch Development

This workflow allows you to work on both branches independently without constant merging.

#### 🔄 Morning Routine

```bash
# Check current status
git status
git branch

# Fetch latest changes from remote
git fetch --all

# See what's new on both branches
git log --oneline -5 main
git log --oneline -5 Vercel-Branch
```

#### 💼 Working on Main Branch (Full-Stack Development)

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Create feature branch (optional)
git checkout -b feature/new-enterprise-feature

# Work on your changes
# ... edit files for enterprise features ...

# Test locally
npm run dev
npm run build
npm run test

# Commit and push
git add .
git commit -m "feat: add advanced security dashboard"
git push origin main

# Or push feature branch
git push origin feature/new-enterprise-feature
```

#### 🌐 Working on Vercel Branch (Marketing Site)

```bash
# Switch to Vercel branch
git checkout Vercel-Branch

# Pull latest changes
git pull origin Vercel-Branch

# Work on marketing site changes
# ... edit landing page, coming soon page, etc ...

# Test locally
cd frontend
npm run dev
npm run build

# Commit and push
git add .
git commit -m "update: improve coming soon page design"
git push origin Vercel-Branch

# ✅ Vercel automatically deploys the changes
```

## 🎯 Specific Use Cases

### Use Case 1: Update Landing Page

```bash
# Switch to Vercel branch
git checkout Vercel-Branch

# Edit landing page
code frontend/src/pages/LandingPage.tsx

# Test changes
cd frontend && npm run dev

# Commit and deploy
git add .
git commit -m "feat: add new hero section to landing page"
git push origin Vercel-Branch
```

### Use Case 2: Add New Enterprise Feature

```bash
# Switch to main branch
git checkout main

# Add new feature
code frontend/src/pages/admin/NewFeature.tsx

# Test with backend
npm run dev # (backend)
cd frontend && npm run dev # (frontend)

# Commit to main
git add .
git commit -m "feat: add enterprise analytics dashboard"
git push origin main
```

### Use Case 3: Share Feature Between Branches

Sometimes you want to share a feature from main to Vercel branch:

```bash
# Develop feature on main
git checkout main
# ... develop feature ...
git commit -m "feat: improve navigation component"
git push origin main

# Switch to Vercel branch
git checkout Vercel-Branch

# Cherry-pick specific commit
git log main --oneline -10  # Find commit hash
git cherry-pick <commit-hash>

# Resolve conflicts if any
git add .
git commit -m "merge: cherry-pick navigation improvements from main"
git push origin Vercel-Branch
```

## 📊 Branch Status Monitoring

### Quick Status Check Script
Create a script `scripts/branch-status.sh`:
```bash
#!/bin/bash
echo "🌳 Branch Status Report"
echo "======================="
echo ""

echo "📍 Current Branch:"
git branch --show-current
echo ""

echo "📊 Branch Summary:"
git branch -v
echo ""

echo "🔄 Remote Status:"
git status -uno
echo ""

echo "📈 Recent Commits on Current Branch:"
git log --oneline -5
echo ""

echo "🆚 Commits Unique to Current Branch (vs main):"
if [ "$(git branch --show-current)" != "main" ]; then
    git log main..HEAD --oneline
else
    echo "Currently on main branch"
fi
```

Make it executable:
```bash
chmod +x scripts/branch-status.sh
```

Use it:
```bash
./scripts/branch-status.sh
```

## 🔀 Syncing Strategies

### Strategy 1: Selective Syncing (Recommended)

Only sync specific features that make sense for both branches:

```bash
# List differences between branches
git diff --name-only main..Vercel-Branch

# Cherry-pick specific commits
git cherry-pick <commit-hash>

# Or merge specific files
git checkout main -- frontend/src/components/common/Button.tsx
```

### Strategy 2: Regular Sync Points

Set up weekly sync points:

```bash
# Every Friday, sync important changes
git checkout Vercel-Branch
git merge main

# Resolve conflicts carefully
# Only keep changes that make sense for marketing site
git add .
git commit -m "sync: weekly sync from main branch"
git push origin Vercel-Branch
```

### Strategy 3: Feature Flags

Use environment variables to control features:

```typescript
// In shared components
const isVercelBuild = import.meta.env.VITE_ENVIRONMENT === 'vercel'

if (isVercelBuild) {
  // Show coming soon version
  return <ComingSoonComponent />
} else {
  // Show full feature
  return <FullFeatureComponent />
}
```

## 🚀 Deployment Workflows

### Automatic Deployment (Vercel-Branch)

```bash
# Any push to Vercel-Branch triggers deployment
git checkout Vercel-Branch
git add .
git commit -m "update: improve email signup form"
git push origin Vercel-Branch

# ✅ Vercel automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys to production
# 4. Updates live site
```

### Preview Deployments

```bash
# Create feature branch from Vercel-Branch
git checkout Vercel-Branch
git checkout -b preview/new-design

# Make changes
# ... edit files ...

# Push feature branch
git add .
git commit -m "preview: test new design concept"
git push origin preview/new-design

# ✅ Vercel creates preview URL
# Share: https://securenet-git-preview-new-design.vercel.app
```

## 🛠️ Development Tools

### Branch-Specific Configurations

#### Main Branch: Full Development
```json
// frontend/.env.development
VITE_APP_MODE=development
VITE_API_BASE_URL=http://localhost:8000
VITE_MOCK_DATA=false
VITE_SHOW_FULL_FEATURES=true
```

#### Vercel Branch: Marketing Mode
```json
// frontend/.env.production
VITE_APP_MODE=production
VITE_API_BASE_URL=https://coming-soon
VITE_MOCK_DATA=false
VITE_SHOW_COMING_SOON=true
```

### Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
# Git aliases for branch management
alias gst='git status'
alias gb='git branch'
alias gco='git checkout'
alias gcom='git checkout main'
alias gcov='git checkout Vercel-Branch'
alias glog='git log --oneline -10'
alias gdiff='git diff --name-only'

# Quick branch switching
alias work-main='git checkout main && git pull origin main'
alias work-vercel='git checkout Vercel-Branch && git pull origin Vercel-Branch'

# Status checks
alias branch-status='./scripts/branch-status.sh'
```

## 📋 Weekly Checklist

### Every Monday
- [ ] Check both branches are up to date
- [ ] Review any deployment issues from weekend
- [ ] Plan which features to work on each branch

### Every Wednesday  
- [ ] Review Vercel analytics and performance
- [ ] Check for any needed updates to coming soon page
- [ ] Test email signup functionality

### Every Friday
- [ ] Decide if any main branch features should sync to Vercel
- [ ] Review and clean up any unused feature branches
- [ ] Plan weekend deployment if needed

## 🚨 Emergency Procedures

### Hotfix for Live Site (Vercel-Branch)

```bash
# Critical bug on live site
git checkout Vercel-Branch

# Create hotfix branch
git checkout -b hotfix/critical-bug-fix

# Fix the issue
# ... make minimal changes ...

# Test locally
npm run build
npm run preview

# Deploy hotfix
git add .
git commit -m "hotfix: resolve critical signup form bug"
git push origin hotfix/critical-bug-fix

# Create PR to Vercel-Branch
# After approval, merge and deploy
git checkout Vercel-Branch
git merge hotfix/critical-bug-fix
git push origin Vercel-Branch
```

### Rollback Deployment

```bash
# Find last known good commit
git log --oneline -10

# Reset to previous commit
git reset --hard <good-commit-hash>
git push --force-with-lease origin Vercel-Branch

# ✅ Vercel automatically deploys rollback
```

## 🎉 Best Practices Summary

### DO's ✅
- **Always check current branch** before making changes
- **Test changes locally** before pushing
- **Use descriptive commit messages**
- **Keep branches focused** on their purpose
- **Regular pushes** to backup work
- **Monitor Vercel deployments** after pushing

### DON'Ts ❌
- **Don't mix concerns** between branches
- **Don't force push** to shared branches
- **Don't forget to test** marketing site changes
- **Don't ignore deployment notifications**
- **Don't work on wrong branch**

---

This workflow ensures clean separation between your enterprise platform development and marketing site while maintaining flexibility to share features when needed.
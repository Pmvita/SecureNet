# Branch Management Guide

This guide explains how to work with both `main` and `Vercel-Branch` independently.

## 🌳 Branch Structure

### `main` Branch
- **Purpose:** Full-stack application development
- **Contains:** Frontend + Backend integration
- **Use Case:** Local development, enterprise features
- **Deployment:** Internal/staging environments

### `Vercel-Branch` Branch  
- **Purpose:** Frontend-only marketing site
- **Contains:** Static frontend with coming soon page
- **Use Case:** Public marketing, user acquisition
- **Deployment:** Vercel production hosting

## 🔄 Independent Workflow (Option B)

We use **Option B: Work on Both Branches Independently** for maximum flexibility.

### Daily Workflow

#### Working on Main Branch
```bash
# Switch to main branch
git checkout main

# Check current branch
git branch
# * main
#   Vercel-Branch

# Make your changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Add new enterprise features"
git push origin main
```

#### Working on Vercel Branch
```bash
# Switch to Vercel branch
git checkout Vercel-Branch

# Check current branch  
git branch
# * Vercel-Branch
#   main

# Make your changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Update coming soon page"
git push origin Vercel-Branch
```

### Syncing Changes Between Branches

#### Option 1: Merge Specific Features
```bash
# Switch to Vercel branch
git checkout Vercel-Branch

# Merge specific changes from main
git merge main

# Resolve any conflicts if needed
# ... resolve conflicts ...

# Commit and push
git add .
git commit -m "Sync features from main branch"
git push origin Vercel-Branch
```

#### Option 2: Cherry-Pick Specific Commits
```bash
# Switch to Vercel branch
git checkout Vercel-Branch

# Find commit hash from main branch
git log main --oneline -5

# Cherry-pick specific commit
git cherry-pick <commit-hash>

# Push changes
git push origin Vercel-Branch
```

## 🎯 Common Commands

### Branch Information
```bash
# See all branches (local and remote)
git branch -a

# See current branch
git branch

# See last commit on each branch
git branch -v
```

### Switching Branches
```bash
# Switch to main
git checkout main

# Switch to Vercel branch
git checkout Vercel-Branch

# Create and switch to new branch
git checkout -b new-feature-branch
```

### Remote Branch Management
```bash
# Push new branch to remote
git push -u origin Vercel-Branch

# Delete remote branch
git push origin --delete branch-name

# Fetch all remote branches
git fetch --all
```

### Checking Differences
```bash
# See differences between branches
git diff main..Vercel-Branch

# See files that differ between branches
git diff --name-only main..Vercel-Branch

# See commit differences
git log main..Vercel-Branch --oneline
```

## 🚨 Important Guidelines

### DO's ✅
- **Always check your current branch** before making changes
- **Commit frequently** with descriptive messages
- **Test locally** before pushing to remote
- **Keep branches focused** on their specific purpose
- **Document significant changes** in commit messages

### DON'Ts ❌
- **Don't merge accidentally** - always verify branch before merging
- **Don't force push** unless absolutely necessary
- **Don't work on wrong branch** - check `git branch` first
- **Don't forget to push** after committing changes

## 🔧 Troubleshooting

### "I'm on the wrong branch!"
```bash
# Check what you changed
git status

# Stash your changes
git stash

# Switch to correct branch
git checkout correct-branch-name

# Apply your changes
git stash pop
```

### "I committed to the wrong branch!"
```bash
# Reset the commit (keep changes)
git reset --soft HEAD~1

# Stash the changes
git stash

# Switch to correct branch
git checkout correct-branch-name

# Apply and commit
git stash pop
git add .
git commit -m "Your commit message"
```

### "Branches got out of sync!"
```bash
# Fetch latest from remote
git fetch --all

# Switch to branch you want to update
git checkout Vercel-Branch

# Reset to match remote (⚠️ This will lose local changes)
git reset --hard origin/Vercel-Branch
```

## 📊 Branch Status Commands

### Quick Status Check
```bash
# Current branch and status
git status

# Recent commits on current branch
git log --oneline -5

# See if branch is ahead/behind remote
git status -uno
```

### Branch Comparison
```bash
# Compare current branch with main
git diff main

# Show commits unique to current branch
git log main..HEAD --oneline

# Show commits unique to main branch
git log HEAD..main --oneline
```

## 🎉 Success Tips

1. **Use descriptive branch names** if creating new branches
2. **Always run `git branch`** to confirm current branch
3. **Use `git status`** frequently to check changes
4. **Test changes locally** before pushing
5. **Keep commit messages clear** and specific
6. **Regular pushes** to backup your work

---

Remember: Each branch serves a different purpose. Keep them focused and independent for the best development experience!
# Vercel Configuration Guide

Detailed configuration settings for SecureNet Vercel deployment.

## 📁 Project Structure

```
SecureNet/
├── frontend/                    # Vercel deployment root
│   ├── dist/                   # Build output (auto-generated)
│   ├── public/                 # Static assets
│   ├── src/                    # Source code
│   ├── package.json            # Dependencies & scripts
│   ├── vite.config.ts          # Build configuration
│   ├── vercel.json             # Vercel settings
│   └── .env.production         # Production environment variables
└── docs/vercel-deployment/     # This documentation
```

## 🔧 Environment Variables

### Required Variables
Create `frontend/.env.production`:
```bash
# Application Mode
VITE_APP_MODE=production
VITE_ENVIRONMENT=vercel

# API Configuration (disabled for static site)
VITE_MOCK_DATA=false
VITE_API_BASE_URL=https://coming-soon

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_EMAIL_COLLECTION=true
VITE_SHOW_COMING_SOON=true

# Branding
VITE_COMPANY_NAME=SecureNet
VITE_COMPANY_TAGLINE=Enterprise Security Platform
VITE_CONTACT_EMAIL=info@securenet.ai
```

### Vercel Dashboard Variables
Add these in Vercel Project Settings > Environment Variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_APP_MODE` | `production` | Production |
| `VITE_ENVIRONMENT` | `vercel` | Production |
| `VITE_MOCK_DATA` | `false` | Production |
| `VITE_API_BASE_URL` | `https://coming-soon` | Production |
| `VITE_ENABLE_ANALYTICS` | `true` | Production |
| `VITE_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Production |

## ⚡ Build Configuration

### vite.config.ts
Update `frontend/vite.config.ts` for optimized Vercel builds:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          ui: ['@heroicons/react', 'framer-motion'],
          router: ['react-router-dom'],
        },
        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
})
```

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
      "src": "/api/(.*)",
      "dest": "/api-placeholder.html",
      "status": 503
    },
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
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/admin",
      "destination": "/coming-soon",
      "permanent": false
    },
    {
      "source": "/dashboard",
      "destination": "/coming-soon", 
      "permanent": false
    }
  ],
  "functions": {
    "src/api-placeholder.html": {
      "maxDuration": 1
    }
  }
}
```

## 📦 Package Configuration

### package.json Scripts
Ensure these scripts in `frontend/package.json`:
```json
{
  "name": "securenet-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "analyze": "npx vite-bundle-analyzer dist"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@heroicons/react": "^2.0.16",
    "framer-motion": "^10.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.0",
    "typescript": "^5.0.0"
  }
}
```

## 🎨 Asset Optimization

### Static Assets Structure
```
frontend/public/
├── favicon.ico                 # 32x32 favicon
├── favicon.svg                 # SVG favicon
├── apple-touch-icon.png        # 180x180 Apple icon
├── manifest.json               # PWA manifest
├── robots.txt                  # SEO robots file
├── sitemap.xml                 # SEO sitemap
└── images/
    ├── logo/
    │   ├── securenet-logo.svg
    │   ├── securenet-logo.png
    │   └── securenet-logo-white.svg
    ├── screenshots/
    │   ├── dashboard-preview.webp
    │   ├── security-preview.webp
    │   └── analytics-preview.webp
    └── og/
        ├── og-image.png        # 1200x630 Open Graph
        └── twitter-card.png    # 1200x600 Twitter Card
```

### Image Optimization
```typescript
// Use optimized image formats
const logoSrc = '/images/logo/securenet-logo.svg'
const previewImages = [
  '/images/screenshots/dashboard-preview.webp',
  '/images/screenshots/security-preview.webp',
  '/images/screenshots/analytics-preview.webp'
]

// Lazy load images
<img 
  src={logoSrc} 
  loading="lazy"
  alt="SecureNet Logo"
  width={200}
  height={60}
/>
```

## 🔍 SEO Configuration

### index.html Meta Tags
Update `frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Primary Meta Tags -->
  <title>SecureNet - Enterprise Security Platform | Coming Soon</title>
  <meta name="title" content="SecureNet - Enterprise Security Platform | Coming Soon" />
  <meta name="description" content="Revolutionary AI-powered network security monitoring and management platform. Join the waitlist for early access." />
  <meta name="keywords" content="cybersecurity, network security, AI security, enterprise security, threat detection" />
  <meta name="author" content="SecureNet Technologies" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://securenet-ai.vercel.app/" />
  <meta property="og:title" content="SecureNet - Enterprise Security Platform" />
  <meta property="og:description" content="Revolutionary AI-powered network security monitoring and management platform." />
  <meta property="og:image" content="/images/og/og-image.png" />
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://securenet-ai.vercel.app/" />
  <meta property="twitter:title" content="SecureNet - Enterprise Security Platform" />
  <meta property="twitter:description" content="Revolutionary AI-powered network security monitoring and management platform." />
  <meta property="twitter:image" content="/images/og/twitter-card.png" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### robots.txt
Create `frontend/public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://securenet-ai.vercel.app/sitemap.xml
```

### sitemap.xml
Create `frontend/public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://securenet-ai.vercel.app/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://securenet-ai.vercel.app/coming-soon</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## 📊 Analytics Configuration

### Google Analytics 4
Add to `frontend/index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Vercel Analytics
Add to `frontend/src/main.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
)
```

## 🔒 Security Headers

### Additional Security Configuration
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com"
        }
      ]
    }
  ]
}
```

## 🏃‍♂️ Performance Monitoring

### Core Web Vitals
Monitor these metrics in Vercel dashboard:
- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms  
- **Cumulative Layout Shift (CLS):** < 0.1

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Check for large dependencies
npx bundlephobia <package-name>
```

---

**Note:** Update configuration files as needed for your specific domain and analytics setup.
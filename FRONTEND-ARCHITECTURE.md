# 🏗️ SecureNet Frontend Architecture

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Development Modes](#development-modes)
- [Design System](#design-system)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Real-time Features](#real-time-features)
- [Testing Strategy](#testing-strategy)

## Overview

SecureNet frontend is a modern React-based Security Operations Center (SOC) interface built with TypeScript and enterprise-grade UI/UX design. The application provides **real-time network monitoring** with live WiFi device discovery, actual traffic analysis, and comprehensive security management capabilities.

## Technology Stack

### Core Technologies
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript 5** - Type-safe development with strict type checking
- **Vite** - Fast development server and build tool
- **TailwindCSS** - Utility-first CSS framework with custom design system

### UI/UX Libraries
- **Headless UI** - Accessible component primitives
- **Heroicons** - Professional icon library
- **Framer Motion** - Smooth animations and transitions
- **Chart.js** - Real-time data visualization and charting
- **Vis Network** - Live network topology visualization

### Development Tools
- **React Query** - Real-time data fetching and state management
- **React Router** - Client-side routing
- **Jest & Testing Library** - Unit and integration testing
- **ESLint & Prettier** - Code quality and formatting
- **Storybook** - Component development and documentation

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   └── common/          # Base components (Card, Button, Badge, etc.)
│   ├── features/            # Feature-based modules
│   │   ├── dashboard/       # Real-time SOC Dashboard
│   │   ├── network/         # Live WiFi monitoring and device discovery
│   │   ├── anomalies/       # Real-time anomaly detection and investigation
│   │   ├── security/        # Security scanning and management
│   │   ├── logs/           # Live log management and analysis
│   │   └── settings/       # Real network monitoring configuration
│   ├── hooks/              # Custom React hooks for real-time data
│   ├── utils/              # Utility functions and helpers
│   ├── types/              # TypeScript type definitions for network data
│   └── styles/             # Global styles and Tailwind configuration
├── public/                 # Static assets
├── __tests__/              # Test files for real network features
├── .storybook/            # Storybook configuration
└── package.json           # Dependencies and scripts
```

## Development Modes

### Enterprise Mode (Real Network Monitoring) - **Primary Mode**
```bash
npm run Enterprise      # VITE_MOCK_DATA=false - Real WiFi scanning
```

**Features:**
- **Live WiFi device discovery** - Scans your actual network (192.168.x.0/24)
- **Real device monitoring** - MAC addresses, IP addresses, device types
- **Actual traffic analysis** - Real network traffic and bandwidth monitoring
- **Port scanning** - Service detection on discovered devices
- **Device classification** - Router, Server, Endpoint, Printer identification
- **Multi-subnet support** - Automatic network range detection
- **Real WebSocket connections** for live updates
- **Live log streaming** and analysis
- **Real-time anomaly detection**

**Live Discovery Results:**
```
🌐 Your Actual WiFi Network:
├── 📍 192.168.2.1   - Router (mynetwork) - MAC: 44:E9:DD:4C:7C:74
├── 📱 192.168.2.17  - Endpoint - MAC: F0:5C:77:75:DD:F6  
├── 💻 192.168.2.28  - Endpoint - MAC: 26:29:45:1F:E5:2B
├── 🖥️  192.168.2.50  - Endpoint - MAC: 4A:D6:CC:65:97:8E
└── 📺 192.168.2.54  - Endpoint - Ports: 80, 443
```

**Requirements:**
- Backend server running on `http://localhost:8000`
- Network access for device discovery
- Appropriate scanning permissions (see INSTALLATION.md)

### Mock Data Mode (Development Only)
```bash
npm run dev          # VITE_MOCK_DATA=true - Sample data
npm run dev:mock     # Explicit mock mode
```

**Features:**
- Sample network data for development
- No real network scanning or backend dependencies
- Consistent test data for UI development
- Fast development without network access

**Use Cases:**
- Frontend development and UI testing
- Component development in isolation
- Testing edge cases with predictable data

## Design System

### Color Palette
The application uses a professional gradient-based design system:

```css
/* Primary Gradients */
bg-gradient-to-br from-gray-900/50 to-gray-800/50  /* Card backgrounds */
bg-gradient-to-r from-gray-800/80 to-gray-700/80   /* Headers */

/* Status Colors */
text-blue-400     /* Information/Network */
text-green-400    /* Success/Online */
text-yellow-400   /* Warning/Medium */
text-red-400      /* Error/Critical */
text-purple-400   /* Special/Anomalies */
```

### Typography
- **Headers**: `text-2xl font-bold text-white`
- **Subheaders**: `text-lg font-semibold text-white`
- **Body**: `text-sm text-gray-300`
- **Captions**: `text-xs text-gray-400`

### Spacing System
- **Cards**: `p-6` for content, `p-4` for compact areas
- **Gaps**: `gap-3` (small), `gap-4` (medium), `gap-6` (large)
- **Margins**: Consistent `mb-2`, `mb-4`, `mb-6` progression

## Component Architecture

### Base Components
```typescript
// Card component with gradient background
<Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
  <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
    {/* Header content */}
  </div>
  <div className="p-6 bg-gray-900/30">
    {/* Main content */}
  </div>
</Card>
```

### Real Network Metrics Cards
```typescript
interface NetworkMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType;
  color: string;
  bgColor: string;
  subtitle?: string;
  devices?: NetworkDevice[];  // Real device data
  isLive?: boolean;          // Live data indicator
}
```

### Enhanced Device Tables
All device tables display real network data:
- Live device discovery results
- MAC address and vendor information
- Real-time connection states
- Actual traffic statistics
- Device type classification
- Network service detection

## State Management

### React Query for Real-time Data Fetching
```typescript
// Custom hooks for real network monitoring
const { data: devices, isLoading, error } = useNetwork();        // Real devices
const { data: traffic, isLoading, error } = useNetworkTraffic(); // Actual traffic
const { data: scan, isLoading, error } = useNetworkScan();       // Live scanning
```

### Live Network State Management
- **useState** for component-level network state
- **useReducer** for complex device discovery logic
- **useContext** for shared network configuration
- **Custom hooks** for real-time network monitoring

### Real vs Mock Data Integration
```typescript
// Environment-based data source selection
const useMockData = import.meta.env.VITE_MOCK_DATA === 'true';

// Conditional data fetching - Real network monitoring by default
const dataSource = useMockData ? mockNetworkData : fetchRealNetworkData;
```

## Real-time Features

### Live WiFi Network Discovery
- Real device scanning every 5-30 seconds
- Actual MAC address detection and vendor lookup
- Live device classification (Router, Server, Endpoint)
- Multi-subnet automatic detection
- Real-time device status monitoring

### WebSocket Integration
```typescript
// Real-time network updates
const networkWs = useWebSocket('/ws/network');
const trafficWs = useWebSocket('/ws/traffic');

// Live device discovery notifications
useEffect(() => {
  networkWs.onMessage((data) => {
    updateDeviceList(data.devices);
    updateNetworkStats(data.stats);
  });
}, [networkWs]);
```

### Actual Traffic Monitoring
- Real network packet analysis
- Live bandwidth tracking
- Actual protocol detection
- Real-time traffic statistics
- Live connection state monitoring

## Testing Strategy

### Unit Testing
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage reports
```

### Component Testing
- **React Testing Library** for component behavior testing
- **Jest** for unit tests and mocking
- **Mock data** for consistent test environments
- **Snapshot testing** for UI regression prevention

### Integration Testing
- **End-to-end** testing for complete user workflows
- **API integration** testing with mock backends
- **WebSocket** connection testing
- **Real-time feature** testing with simulated data

## Performance Optimization

### Code Organization
- **Feature-based** module structure for better maintainability
- **Custom hooks** for reusable logic
- **Component composition** for flexibility
- **TypeScript** for development-time optimization

### Bundle Optimization
- **Vite** for fast development and optimized builds
- **Tree shaking** for unused code elimination
- **Code splitting** preparation for future implementation
- **Asset optimization** with Vite's built-in features

### Real-time Performance
- **Efficient data structures** for large datasets
- **Pagination** for large data tables (20 items per page)
- **Debounced search** for filtering operations
- **Optimistic updates** for better user experience

---

## Development Workflow

### Starting Development
1. **Clone repository** and install dependencies
2. **Choose development mode** (mock or real API)
3. **Start development server** with appropriate script
4. **Access application** at `http://localhost:5173`

### Adding New Features
1. **Create feature module** in `src/features/`
2. **Implement components** following design system
3. **Add custom hooks** for data management
4. **Create mock data** for development mode
5. **Add tests** for component behavior
6. **Update documentation** as needed

### Code Quality
- **TypeScript strict mode** for type safety
- **ESLint rules** for code consistency
- **Prettier formatting** for code style
- **Component testing** for reliability
- **Storybook documentation** for component library

---

<div align="center">
Last updated: 2024-06-08 | Version: 2.0.0
</div> 
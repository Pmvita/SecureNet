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

SecureNet frontend is a modern React-based Security Operations Center (SOC) interface built with TypeScript and enterprise-grade UI/UX design. The application provides professional security management capabilities with real-time monitoring, advanced data visualization, and comprehensive security analysis tools.

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
- **Chart.js** - Data visualization and charting
- **Vis Network** - Network topology visualization

### Development Tools
- **React Query** - Data fetching and state management
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
│   │   ├── dashboard/       # SOC Dashboard
│   │   ├── network/         # Network monitoring and traffic analysis
│   │   ├── anomalies/       # Anomaly detection and investigation
│   │   ├── security/        # Security scanning and management
│   │   ├── logs/           # Log management and analysis
│   │   └── settings/       # System configuration with advanced network monitoring
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions and helpers
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles and Tailwind configuration
├── public/                 # Static assets
├── __tests__/              # Test files
├── .storybook/            # Storybook configuration
└── package.json           # Dependencies and scripts
```

## Development Modes

### Mock Data Mode (Default)
```bash
npm run dev          # VITE_MOCK_DATA=true
npm run dev:mock     # Explicit mock mode
```

**Features:**
- Complete mock data simulation for all features
- Real-time data updates with simulated WebSocket connections
- Live network traffic generation with realistic packet data
- Simulated anomaly detection with ML insights
- Mock security scans with progress monitoring
- No backend dependencies required

**Benefits:**
- Fast development without backend setup
- Consistent test data for UI development
- Realistic data patterns for testing edge cases
- Isolated frontend development environment

### Real API Mode
```bash
npm run Enterprise      # VITE_MOCK_DATA=false
```

**Features:**
- Live data from backend services
- Real WebSocket connections for live updates
- Actual network monitoring and security scans
- Live log streaming and analysis
- Real-time anomaly detection

**Requirements:**
- Backend server running on `http://localhost:8000`
- Valid API authentication
- Database connectivity

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

### Professional Metrics Cards
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType;
  color: string;
  bgColor: string;
  subtitle?: string;
}
```

### Enhanced Tables
All data tables follow the professional design pattern:
- Gradient headers with icons
- Enhanced spacing (`py-4 px-6`)
- Hover effects and transitions
- Color-coded status indicators
- Expandable rows for detailed information

## State Management

### React Query for Data Fetching
```typescript
// Custom hooks for each feature
const { data: devices, isLoading, error } = useNetwork();
const { data: anomalies, isLoading, error } = useAnomalies();
const { data: logs, isLoading, error } = useLogs();
```

### Local State Management
- **useState** for component-level state
- **useReducer** for complex state logic
- **useContext** for shared state across components
- **Custom hooks** for feature-specific state logic

### Mock Data Integration
```typescript
// Environment-based data source selection
const useMockData = import.meta.env.VITE_MOCK_DATA === 'true';

// Conditional data fetching
const dataSource = useMockData ? mockNetworkData : fetchNetworkData;
```

## Real-time Features

### Live Network Traffic Monitoring
- Real-time packet generation every 500ms-2.5s
- Traffic statistics with live counters
- Protocol-based filtering and color coding
- Geographic tracking and application categorization

### WebSocket Integration
```typescript
// Real-time data streaming
const websocket = new WebSocket('ws://localhost:8000/ws/network/traffic');
websocket.onmessage = (event) => {
  const trafficData = JSON.parse(event.data);
  updateTrafficLogs(trafficData);
};
```

### Live Data Updates
- Automatic data refresh with configurable intervals
- Play/pause controls for monitoring
- Real-time statistics and metrics updates
- Live status indicators with animations

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
import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Core Web Vitals monitoring
  initCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lcpEntry.startTime);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entries) => {
      const fidEntry = entries[0];
      this.recordMetric('FID', fidEntry.processingStart - fidEntry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entries) => {
      let clsScore = 0;
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      });
      this.recordMetric('CLS', clsScore);
    });
  }

  private observeMetric(type: string, callback: (entries: any[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error);
    }
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Log performance issues
    this.checkPerformanceThresholds(name, value);
  }

  private checkPerformanceThresholds(name: string, value: number): void {
    const thresholds = {
      'LCP': 2500, // 2.5 seconds
      'FID': 100,  // 100 milliseconds
      'CLS': 0.1   // 0.1 score
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (threshold && value > threshold) {
      console.warn(`Performance threshold exceeded for ${name}: ${value} > ${threshold}`);
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendPerformanceMetric(name, value, 'threshold_exceeded');
      }
    }
  }

  getMetrics(): Record<string, { avg: number; max: number; min: number; count: number }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      result[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        count: values.length
      };
    });
    
    return result;
  }

  // Resource timing analysis
  analyzeResourceTiming(): Record<string, any> {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const analysis = {
      totalResources: resources.length,
      totalSize: 0,
      slowResources: [] as any[],
      largeResources: [] as any[],
      resourceTypes: {} as Record<string, number>
    };

    resources.forEach(resource => {
      const duration = resource.responseEnd - resource.startTime;
      const size = resource.transferSize || 0;
      
      analysis.totalSize += size;
      
      // Track resource types
      const type = this.getResourceType(resource.name);
      analysis.resourceTypes[type] = (analysis.resourceTypes[type] || 0) + 1;
      
      // Flag slow resources (>1s)
      if (duration > 1000) {
        analysis.slowResources.push({
          name: resource.name,
          duration: Math.round(duration),
          size: size
        });
      }
      
      // Flag large resources (>500KB)
      if (size > 500000) {
        analysis.largeResources.push({
          name: resource.name,
          size: Math.round(size / 1024) + 'KB',
          duration: Math.round(duration)
        });
      }
    });

    return analysis;
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('.json')) return 'json';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private sendPerformanceMetric(name: string, value: number, type: string): void {
    // In a real app, send to analytics service
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: name,
        value,
        type,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(error => {
      console.warn('Failed to send performance metric:', error);
    });
  }

  // Memory usage monitoring
  getMemoryUsage(): Record<string, number> | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return null;
  }

  // Bundle analysis utilities
  logBundleStats(): void {
    const resources = this.analyzeResourceTiming();
    const memory = this.getMemoryUsage();
    
    console.group('📊 Bundle Performance Analysis');
    console.log('Total Resources:', resources.totalResources);
    console.log('Total Size:', Math.round(resources.totalSize / 1024) + 'KB');
    console.log('Resource Types:', resources.resourceTypes);
    
    if (resources.slowResources.length > 0) {
      console.warn('Slow Resources (>1s):', resources.slowResources);
    }
    
    if (resources.largeResources.length > 0) {
      console.warn('Large Resources (>500KB):', resources.largeResources);
    }
    
    if (memory) {
      console.log('Memory Usage:', memory);
    }
    
    console.log('Core Web Vitals:', this.getMetrics());
    console.groupEnd();
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Code splitting utilities
export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): LazyExoticComponent<T> => {
  const LazyComponent = lazy(importFunc);
  
  // Add performance tracking
  const monitor = PerformanceMonitor.getInstance();
  const componentName = importFunc.toString().match(/\/([^/]+)\.tsx?/)?.[1] || 'Unknown';
  
  return lazy(async () => {
    const startTime = performance.now();
    try {
      const module = await importFunc();
      const loadTime = performance.now() - startTime;
      monitor.recordMetric(`LazyLoad_${componentName}`, loadTime);
      return module;
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
      throw error;
    }
  });
};

// Route-based code splitting
export const LazyRoutes = {
  Dashboard: createLazyComponent(() => import('../pages/Dashboard')),
  SecurityDashboard: createLazyComponent(() => import('../components/dashboard/SecurityDashboard')),
  Anomalies: createLazyComponent(() => import('../pages/Anomalies')),
  Logs: createLazyComponent(() => import('../pages/Logs')),
  Network: createLazyComponent(() => import('../pages/Network')),
  Settings: createLazyComponent(() => import('../pages/Settings')),
  AdminDashboard: createLazyComponent(() => import('../pages/admin/AdminDashboard')),
  UserManagement: createLazyComponent(() => import('../pages/admin/UserManagement')),
  AuditLogs: createLazyComponent(() => import('../pages/admin/AuditLogs')),
  BillingManagement: createLazyComponent(() => import('../pages/admin/BillingManagement')),
  SystemConfiguration: createLazyComponent(() => import('../pages/admin/SystemConfiguration')),
  ComplianceReports: createLazyComponent(() => import('../pages/admin/ComplianceReports'))
};

// Chart performance optimization
export const optimizeChartData = (data: any[], maxPoints: number = 1000): any[] => {
  if (data.length <= maxPoints) return data;
  
  // Use sampling for large datasets
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

// Image lazy loading utility
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver => {
  const defaultOptions = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
};

// Performance-aware debounce
export const performanceDebounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T => {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  const { leading = false, trailing = true } = options;
  
  return ((...args: Parameters<T>) => {
    const now = performance.now();
    const timeSinceLastCall = now - lastCallTime;
    
    const callNow = leading && timeSinceLastCall >= wait;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    if (callNow) {
      lastCallTime = now;
      return func.apply(null, args);
    }
    
    if (trailing) {
      timeout = setTimeout(() => {
        lastCallTime = performance.now();
        func.apply(null, args);
      }, wait - timeSinceLastCall);
    }
  }) as T;
};

// Bundle size analyzer
export const analyzeBundleSize = (): void => {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analyzer available - run "npm run build:analyze" to analyze bundle');
    }).catch(() => {
      console.log('Install webpack-bundle-analyzer to analyze bundle size');
    });
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = (): PerformanceMonitor => {
  const monitor = PerformanceMonitor.getInstance();
  monitor.initCoreWebVitals();
  
  // Log bundle stats after initial load
  setTimeout(() => {
    monitor.logBundleStats();
  }, 5000);
  
  return monitor;
};

export default PerformanceMonitor; 
// Global state management
const state = {
    services: {
        ingestion: { running: false, stats: null },
        detection: { running: false, stats: null },
        alerts: { running: false, stats: null }
    },
    ws: null,
    wsReconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    apiKey: document.querySelector('meta[name="api-key"]')?.content
};

// WebSocket management
function initWebSocket(type = 'logs') {
    if (state.ws) {
        state.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${type}?api_key=${encodeURIComponent(state.apiKey)}`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
        console.log(`WebSocket ${type} connection established`);
        state.wsReconnectAttempts = 0;
    };

    state.ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(type, data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    state.ws.onclose = () => {
        console.log(`WebSocket ${type} connection closed`);
        if (state.wsReconnectAttempts < state.maxReconnectAttempts) {
            state.wsReconnectAttempts++;
            setTimeout(() => initWebSocket(type), state.reconnectDelay * state.wsReconnectAttempts);
        }
    };

    state.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// WebSocket message handling
function handleWebSocketMessage(type, data) {
    switch (type) {
        case 'logs':
            handleLogMessage(data);
            break;
        case 'notifications':
            handleNotificationMessage(data);
            break;
        default:
            console.warn('Unknown WebSocket message type:', type);
    }
}

// Log message handling
function handleLogMessage(log) {
    // Update log table or stream
    const logContainer = document.querySelector('.log-container');
    if (logContainer) {
        const logElement = createLogElement(log);
        logContainer.insertBefore(logElement, logContainer.firstChild);
        
        // Remove old logs if limit reached
        const maxLogs = 1000;
        while (logContainer.children.length > maxLogs) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    // Update log statistics
    updateLogStats(log);
}

// Notification message handling
function handleNotificationMessage(notification) {
    showToast(notification.message, notification.level);
    
    // Update notification badge
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const count = parseInt(badge.textContent || '0') + 1;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// Toast notifications
function showToast(message, level = 'info', duration = 5000) {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast alert alert-${level}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Service control
async function toggleService(service) {
    try {
        const action = state.services[service].running ? 'stop' : 'start';
        const response = await fetch(`/api/${service}/${action}`, {
            method: 'POST',
            headers: {
                'X-API-Key': state.apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to ${action} ${service} service`);
        }

        const data = await response.json();
        state.services[service].running = action === 'start';
        updateServiceUI(service);
        showToast(data.message, 'success');
    } catch (error) {
        console.error(`Error toggling ${service} service:`, error);
        showToast(error.message, 'danger');
    }
}

// UI updates
function updateServiceUI(service) {
    const button = document.querySelector(`#${service}-service-btn`);
    if (button) {
        button.textContent = state.services[service].running ? 'Stop' : 'Start';
        button.className = `btn ${state.services[service].running ? 'btn-danger' : 'btn-success'}`;
    }

    const status = document.querySelector(`#${service}-service-status`);
    if (status) {
        status.className = `status-indicator status-${state.services[service].running ? 'active' : 'inactive'}`;
    }
}

function updateLogStats(log) {
    const stats = document.querySelector('.log-stats');
    if (!stats) return;

    const level = log.level.toLowerCase();
    const countElement = stats.querySelector(`.${level}-count`);
    if (countElement) {
        const count = parseInt(countElement.textContent || '0') + 1;
        countElement.textContent = count;
    }
}

// Chart initialization
function initChart(canvasId, type, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...options
        }
    });
}

// Network map initialization
function initNetworkMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // Initialize network visualization
    // This is a placeholder - implement actual network visualization
    return {
        update: (data) => {
            console.log('Updating network map with:', data);
            // Implement network map update logic
        }
    };
}

// Form handling
function handleFormSubmit(formId, endpoint, method = 'POST') {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': state.apiKey
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Form submission failed');
            }

            const result = await response.json();
            showToast(result.message || 'Success', 'success');
            form.reset();
        } catch (error) {
            console.error('Form submission error:', error);
            showToast(error.message, 'danger');
        }
    });
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleString();
}

function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize WebSocket connections
    initWebSocket('logs');
    initWebSocket('notifications');

    // Initialize service status
    Object.keys(state.services).forEach(service => {
        updateServiceUI(service);
    });

    // Initialize forms
    handleFormSubmit('log-source-form', '/api/logs/sources');
    handleFormSubmit('settings-form', '/api/settings', 'PUT');

    // Initialize charts if present
    const trafficChart = document.getElementById('traffic-chart');
    if (trafficChart) {
        initChart('traffic-chart', 'line', {
            labels: [],
            datasets: [{
                label: 'Inbound',
                data: [],
                borderColor: '#3498db',
                fill: false
            }, {
                label: 'Outbound',
                data: [],
                borderColor: '#2ecc71',
                fill: false
            }]
        });
    }

    // Initialize network map if present
    const networkMap = document.getElementById('network-map');
    if (networkMap) {
        initNetworkMap('network-map');
    }
}); 
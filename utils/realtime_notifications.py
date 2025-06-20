"""
SecureNet Real-time Notification System
Day 4 Sprint 1: WebSocket-based real-time notifications and event streaming
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Callable
from enum import Enum
from dataclasses import dataclass, asdict
import socketio
from fastapi import FastAPI, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from utils.cache_service import cache_service
from auth.audit_logging import security_audit_logger, AuditEventType, AuditSeverity

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    """Types of real-time notifications"""
    SECURITY_ALERT = "security_alert"
    SYSTEM_STATUS = "system_status"
    USER_ACTIVITY = "user_activity"
    THREAT_DETECTED = "threat_detected"
    SYSTEM_MAINTENANCE = "system_maintenance"
    AUDIT_EVENT = "audit_event"
    PERFORMANCE_ALERT = "performance_alert"
    COMPLIANCE_UPDATE = "compliance_update"
    DASHBOARD_UPDATE = "dashboard_update"
    CHAT_MESSAGE = "chat_message"

class NotificationPriority(Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    URGENT = "urgent"

@dataclass
class NotificationPayload:
    """Structured notification payload"""
    id: str
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    room: Optional[str] = None
    expires_at: Optional[datetime] = None
    requires_acknowledgment: bool = False
    actions: Optional[List[Dict[str, Any]]] = None
    
    def __post_init__(self):
        """Generate notification ID and set expiration"""
        if not hasattr(self, 'id') or not self.id:
            self.id = f"notif_{int(time.time() * 1000)}_{hash(self.message) % 10000:04d}"
        
        if not self.expires_at:
            # Set expiration based on priority
            expiry_hours = {
                NotificationPriority.URGENT: 24,
                NotificationPriority.CRITICAL: 48,
                NotificationPriority.HIGH: 72,
                NotificationPriority.MEDIUM: 168,  # 1 week
                NotificationPriority.LOW: 720     # 1 month
            }
            self.expires_at = self.timestamp + timedelta(hours=expiry_hours[self.priority])

class RealTimeNotificationManager:
    """
    Enterprise Real-time Notification System
    WebSocket-based notifications with room management and persistence
    """
    
    def __init__(self):
        # Socket.IO server configuration
        self.sio = socketio.AsyncServer(
            cors_allowed_origins="*",
            async_mode='asgi',
            logger=False,
            engineio_logger=False
        )
        
        # Connection management
        self.connected_users: Dict[str, Set[str]] = {}  # user_id -> set of session_ids
        self.user_rooms: Dict[str, str] = {}  # session_id -> room
        self.session_users: Dict[str, str] = {}  # session_id -> user_id
        
        # Notification queues and history
        self.notification_queue: Dict[str, List[NotificationPayload]] = {}
        self.notification_handlers: Dict[NotificationType, List[Callable]] = {}
        
        # Performance metrics
        self.metrics = {
            "total_notifications_sent": 0,
            "active_connections": 0,
            "notifications_per_minute": 0,
            "average_delivery_time": 0.0
        }
        
        self._setup_socket_handlers()
    
    def _setup_socket_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ, auth):
            """Handle client connection"""
            try:
                # Extract user authentication from headers or auth data
                user_id = auth.get('user_id') if auth else None
                user_role = auth.get('user_role') if auth else None
                
                if not user_id:
                    logger.warning(f"Connection rejected for session {sid}: No user_id provided")
                    return False
                
                # Track connection
                if user_id not in self.connected_users:
                    self.connected_users[user_id] = set()
                
                self.connected_users[user_id].add(sid)
                self.session_users[sid] = user_id
                
                # Join user to their personal room
                await self.sio.enter_room(sid, f"user_{user_id}")
                
                # Join role-based room
                if user_role:
                    await self.sio.enter_room(sid, f"role_{user_role}")
                    self.user_rooms[sid] = f"role_{user_role}"
                
                self.metrics["active_connections"] = len(self.session_users)
                
                # Send pending notifications
                await self._send_pending_notifications(user_id, sid)
                
                # Log connection
                await security_audit_logger.log_event(
                    event_type=AuditEventType.USER_ACTIVITY,
                    severity=AuditSeverity.LOW,
                    user_id=user_id,
                    action="websocket_connect",
                    result="success",
                    details={"session_id": sid, "user_role": user_role}
                )
                
                logger.info(f"User {user_id} connected with session {sid}")
                return True
                
            except Exception as e:
                logger.error(f"Connection error for session {sid}: {e}")
                return False
        
        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            try:
                user_id = self.session_users.get(sid)
                
                if user_id and sid in self.connected_users.get(user_id, set()):
                    self.connected_users[user_id].discard(sid)
                    
                    # Remove user from connected_users if no sessions
                    if not self.connected_users[user_id]:
                        del self.connected_users[user_id]
                
                # Clean up session tracking
                self.session_users.pop(sid, None)
                self.user_rooms.pop(sid, None)
                
                self.metrics["active_connections"] = len(self.session_users)
                
                if user_id:
                    logger.info(f"User {user_id} disconnected session {sid}")
                
            except Exception as e:
                logger.error(f"Disconnection error for session {sid}: {e}")
        
        @self.sio.event
        async def acknowledge_notification(sid, data):
            """Handle notification acknowledgment"""
            try:
                notification_id = data.get('notification_id')
                user_id = self.session_users.get(sid)
                
                if notification_id and user_id:
                    await self._acknowledge_notification(user_id, notification_id)
                    await self.sio.emit('notification_acknowledged', {
                        'notification_id': notification_id,
                        'timestamp': datetime.now().isoformat()
                    }, room=sid)
                
            except Exception as e:
                logger.error(f"Acknowledgment error: {e}")
        
        @self.sio.event
        async def join_room(sid, data):
            """Handle room join requests"""
            try:
                room = data.get('room')
                user_id = self.session_users.get(sid)
                
                if room and user_id:
                    # Validate room access (implement authorization logic)
                    if await self._validate_room_access(user_id, room):
                        await self.sio.enter_room(sid, room)
                        self.user_rooms[sid] = room
                        
                        await self.sio.emit('room_joined', {
                            'room': room,
                            'timestamp': datetime.now().isoformat()
                        }, room=sid)
                
            except Exception as e:
                logger.error(f"Room join error: {e}")
    
    async def _validate_room_access(self, user_id: str, room: str) -> bool:
        """Validate if user has access to specific room"""
        # Implement your authorization logic here
        # For now, allow all authenticated users
        return True
    
    async def _send_pending_notifications(self, user_id: str, session_id: str):
        """Send pending notifications to newly connected user"""
        try:
            # Get pending notifications from Redis
            pending_key = f"notifications:pending:{user_id}"
            pending_notifications = await cache_service.redis_client.lrange(pending_key, 0, -1)
            
            for notification_data in pending_notifications:
                try:
                    notification_dict = json.loads(notification_data)
                    await self.sio.emit('notification', notification_dict, room=session_id)
                except json.JSONDecodeError:
                    continue
            
            # Clear pending notifications after sending
            await cache_service.redis_client.delete(pending_key)
            
        except Exception as e:
            logger.error(f"Failed to send pending notifications: {e}")
    
    async def send_notification(self, 
                               notification: NotificationPayload,
                               target_users: Optional[List[str]] = None,
                               target_room: Optional[str] = None) -> bool:
        """
        Send real-time notification to users or rooms
        """
        try:
            notification_dict = asdict(notification)
            # Convert datetime objects to ISO strings
            notification_dict['timestamp'] = notification.timestamp.isoformat()
            if notification.expires_at:
                notification_dict['expires_at'] = notification.expires_at.isoformat()
            
            delivery_count = 0
            
            # Send to specific users
            if target_users:
                for user_id in target_users:
                    if user_id in self.connected_users:
                        # User is online - send immediately
                        for session_id in self.connected_users[user_id]:
                            await self.sio.emit('notification', notification_dict, room=session_id)
                            delivery_count += 1
                    else:
                        # User is offline - queue notification
                        await self._queue_notification(user_id, notification)
            
            # Send to room
            elif target_room:
                await self.sio.emit('notification', notification_dict, room=target_room)
                delivery_count += 1
            
            # Send to user's personal room if specified
            elif notification.user_id:
                user_room = f"user_{notification.user_id}"
                await self.sio.emit('notification', notification_dict, room=user_room)
                delivery_count += 1
            
            # Store notification in history
            await self._store_notification_history(notification)
            
            # Update metrics
            self.metrics["total_notifications_sent"] += delivery_count
            
            # Log notification
            await security_audit_logger.log_event(
                event_type=AuditEventType.SYSTEM_STATUS,
                severity=AuditSeverity.LOW,
                action="notification_sent",
                result="success",
                details={
                    "notification_id": notification.id,
                    "type": notification.type.value,
                    "priority": notification.priority.value,
                    "delivery_count": delivery_count
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False
    
    async def _queue_notification(self, user_id: str, notification: NotificationPayload):
        """Queue notification for offline user"""
        try:
            pending_key = f"notifications:pending:{user_id}"
            notification_data = json.dumps(asdict(notification), default=str)
            
            # Add to pending queue
            await cache_service.redis_client.lpush(pending_key, notification_data)
            
            # Limit queue size (keep last 50 notifications)
            await cache_service.redis_client.ltrim(pending_key, 0, 49)
            
            # Set expiration for pending queue
            await cache_service.redis_client.expire(pending_key, 86400)  # 24 hours
            
        except Exception as e:
            logger.error(f"Failed to queue notification: {e}")
    
    async def _store_notification_history(self, notification: NotificationPayload):
        """Store notification in history for audit and retrieval"""
        try:
            history_key = f"notifications:history:{notification.user_id or 'global'}"
            notification_data = json.dumps(asdict(notification), default=str)
            
            # Store with score as timestamp for range queries
            score = notification.timestamp.timestamp()
            await cache_service.redis_client.zadd(history_key, {notification_data: score})
            
            # Limit history size (keep last 1000 notifications)
            await cache_service.redis_client.zremrangebyrank(history_key, 0, -1001)
            
            # Set expiration for history
            await cache_service.redis_client.expire(history_key, 2592000)  # 30 days
            
        except Exception as e:
            logger.error(f"Failed to store notification history: {e}")
    
    async def _acknowledge_notification(self, user_id: str, notification_id: str):
        """Mark notification as acknowledged"""
        try:
            ack_key = f"notifications:acknowledged:{user_id}"
            await cache_service.redis_client.sadd(ack_key, notification_id)
            await cache_service.redis_client.expire(ack_key, 86400)  # 24 hours
            
        except Exception as e:
            logger.error(f"Failed to acknowledge notification: {e}")
    
    async def broadcast_security_alert(self, 
                                     alert_type: str,
                                     severity: str,
                                     message: str,
                                     data: Dict[str, Any],
                                     target_roles: List[str] = None):
        """Broadcast security alert to relevant users"""
        try:
            priority_map = {
                "critical": NotificationPriority.CRITICAL,
                "high": NotificationPriority.HIGH,
                "medium": NotificationPriority.MEDIUM,
                "low": NotificationPriority.LOW
            }
            
            notification = NotificationPayload(
                id="",
                type=NotificationType.SECURITY_ALERT,
                priority=priority_map.get(severity.lower(), NotificationPriority.MEDIUM),
                title=f"Security Alert: {alert_type}",
                message=message,
                data=data,
                timestamp=datetime.now(),
                requires_acknowledgment=priority_map.get(severity.lower()) in [
                    NotificationPriority.CRITICAL, NotificationPriority.HIGH
                ],
                actions=[
                    {"label": "View Details", "action": "view_alert", "data": {"alert_id": data.get("alert_id")}},
                    {"label": "Acknowledge", "action": "acknowledge", "data": {"alert_id": data.get("alert_id")}}
                ] if priority_map.get(severity.lower()) in [NotificationPriority.CRITICAL, NotificationPriority.HIGH] else None
            )
            
            # Send to specific roles or all security roles
            target_roles = target_roles or ["platform_owner", "security_admin", "soc_analyst"]
            
            for role in target_roles:
                await self.send_notification(notification, target_room=f"role_{role}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to broadcast security alert: {e}")
            return False
    
    async def send_system_status_update(self, 
                                      status: str,
                                      component: str,
                                      message: str,
                                      data: Dict[str, Any] = None):
        """Send system status update to all connected users"""
        try:
            notification = NotificationPayload(
                id="",
                type=NotificationType.SYSTEM_STATUS,
                priority=NotificationPriority.MEDIUM,
                title=f"System Update: {component}",
                message=message,
                data=data or {},
                timestamp=datetime.now()
            )
            
            # Broadcast to all connected users
            for user_id in self.connected_users.keys():
                await self.send_notification(notification, target_users=[user_id])
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send system status update: {e}")
            return False
    
    async def get_notification_history(self, 
                                     user_id: str,
                                     limit: int = 50,
                                     start_time: Optional[datetime] = None,
                                     end_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Get notification history for a user"""
        try:
            history_key = f"notifications:history:{user_id}"
            
            # Set time range
            if not end_time:
                end_time = datetime.now()
            if not start_time:
                start_time = end_time - timedelta(days=7)
            
            # Query Redis sorted set
            start_score = start_time.timestamp()
            end_score = end_time.timestamp()
            
            notifications = await cache_service.redis_client.zrangebyscore(
                history_key, start_score, end_score, withscores=True
            )
            
            # Parse and return
            result = []
            for notification_data, score in notifications[-limit:]:
                try:
                    notification_dict = json.loads(notification_data)
                    result.append(notification_dict)
                except json.JSONDecodeError:
                    continue
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get notification history: {e}")
            return []
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get real-time notification system metrics"""
        try:
            # Calculate notifications per minute
            current_time = int(time.time())
            minute_key = f"notifications:metrics:minute:{current_time // 60}"
            notifications_this_minute = await cache_service.redis_client.get(minute_key) or 0
            
            return {
                **self.metrics,
                "notifications_per_minute": int(notifications_this_minute),
                "connected_users": len(self.connected_users),
                "total_sessions": len(self.session_users),
                "rooms_active": len(set(self.user_rooms.values())),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return self.metrics

# Global notification manager instance
notification_manager = RealTimeNotificationManager()

# FastAPI integration
def get_socketio_app():
    """Get Socket.IO ASGI app for FastAPI integration"""
    return socketio.ASGIApp(notification_manager.sio)

# Convenience functions for common notification patterns
async def send_security_alert(alert_type: str, severity: str, message: str, 
                            data: Dict[str, Any], target_roles: List[str] = None):
    """Send security alert notification"""
    return await notification_manager.broadcast_security_alert(
        alert_type, severity, message, data, target_roles
    )

async def send_system_notification(title: str, message: str, 
                                 priority: NotificationPriority = NotificationPriority.MEDIUM,
                                 data: Dict[str, Any] = None):
    """Send general system notification"""
    notification = NotificationPayload(
        id="",
        type=NotificationType.SYSTEM_STATUS,
        priority=priority,
        title=title,
        message=message,
        data=data or {},
        timestamp=datetime.now()
    )
    
    # Send to all connected users
    for user_id in notification_manager.connected_users.keys():
        await notification_manager.send_notification(notification, target_users=[user_id])

async def send_user_notification(user_id: str, title: str, message: str,
                                notification_type: NotificationType = NotificationType.USER_ACTIVITY,
                                priority: NotificationPriority = NotificationPriority.MEDIUM,
                                data: Dict[str, Any] = None):
    """Send notification to specific user"""
    notification = NotificationPayload(
        id="",
        type=notification_type,
        priority=priority,
        title=title,
        message=message,
        data=data or {},
        timestamp=datetime.now(),
        user_id=user_id
    )
    
    return await notification_manager.send_notification(notification, target_users=[user_id]) 
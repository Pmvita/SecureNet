# API Authentication Guide

## Overview
SecureNet API uses JWT (JSON Web Tokens) for authentication. All API requests require a valid JWT token in the Authorization header.

## Obtaining a Token
1. Send POST request to `/api/auth/login` with username and password
2. Receive JWT token in response
3. Include token in subsequent requests

## Using the Token
Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Token Expiration
- Default expiration: 1 hour
- Refresh tokens available for longer sessions
- Monitor token expiration and refresh as needed

## Rate Limiting
- 100 requests per minute per user
- 1000 requests per minute per organization
- Rate limit headers included in responses

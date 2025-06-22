{
  "variable": {
    "aws_region": {
      "description": "AWS region for resources",
      "type": "string",
      "default": "us-west-2"
    },
    "environment": {
      "description": "Environment name",
      "type": "string",
      "default": "production"
    },
    "db_password": {
      "description": "Database password",
      "type": "string",
      "sensitive": true
    },
    "redis_auth_token": {
      "description": "Redis authentication token",
      "type": "string",
      "sensitive": true
    }
  }
}
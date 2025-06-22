"""
SecureNet Enterprise Secrets Management
Replaces hardcoded secrets with secure enterprise-grade secret storage
"""

import os
import hvac
import boto3
import base64
import json
import hashlib
import secrets as crypto_secrets
import time
from typing import Dict, Any, Optional, Union, List
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging
from datetime import datetime
from dataclasses import dataclass
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

@dataclass
class SecretConfig:
    """Configuration for secrets management"""
    provider: str = "file"  # file, vault, aws, azure
    encryption_key: Optional[str] = None
    vault_url: Optional[str] = None
    vault_token: Optional[str] = None
    aws_region: Optional[str] = None
    key_rotation_days: int = 90

class SecretProvider(ABC):
    """Abstract base class for secret providers"""
    
    @abstractmethod
    async def get_secret(self, key: str) -> Optional[str]:
        """Get a secret by key"""
        pass
    
    @abstractmethod
    async def set_secret(self, key: str, value: str, metadata: Dict[str, Any] = None) -> bool:
        """Set a secret"""
        pass
    
    @abstractmethod
    async def delete_secret(self, key: str) -> bool:
        """Delete a secret"""
        pass
    
    @abstractmethod
    async def list_secrets(self) -> List[str]:
        """List available secret keys"""
        pass

class FileSecretProvider(SecretProvider):
    """File-based secret provider with encryption"""
    
    def __init__(self, config: SecretConfig):
        self.config = config
        self.secrets_dir = Path("secrets")
        self.secrets_dir.mkdir(exist_ok=True, mode=0o700)
        self._cipher = self._get_cipher()
    
    def _get_cipher(self) -> Fernet:
        """Get encryption cipher"""
        if self.config.encryption_key:
            # If the key looks like a base64-encoded Fernet key, use it directly
            if len(self.config.encryption_key) == 44 and self.config.encryption_key.endswith('='):
                key = self.config.encryption_key.encode()
            else:
                # Generate a proper Fernet key from the provided key
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=b'securenet-salt',
                    iterations=100000,
                )
                key = base64.urlsafe_b64encode(kdf.derive(self.config.encryption_key.encode()))
        else:
            # Generate key from environment
            master_key = os.getenv("MASTER_KEY_MATERIAL", "default-master-key").encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'securenet-salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_key))
        
        return Fernet(key)
    
    async def get_secret(self, key: str) -> Optional[str]:
        """Get encrypted secret from file"""
        try:
            secret_file = self.secrets_dir / f"{key}.enc"
            if not secret_file.exists():
                return None
            
            with open(secret_file, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self._cipher.decrypt(encrypted_data)
            secret_data = json.loads(decrypted_data.decode())
            
            return secret_data.get('value')
            
        except Exception as e:
            logger.error(f"Failed to get secret {key}: {e}")
            return None
    
    async def set_secret(self, key: str, value: str, metadata: Dict[str, Any] = None) -> bool:
        """Set encrypted secret to file"""
        try:
            secret_data = {
                'value': value,
                'created_at': datetime.utcnow().isoformat(),
                'metadata': metadata or {}
            }
            
            encrypted_data = self._cipher.encrypt(json.dumps(secret_data).encode())
            
            secret_file = self.secrets_dir / f"{key}.enc"
            with open(secret_file, 'wb') as f:
                f.write(encrypted_data)
            
            # Set restrictive permissions
            secret_file.chmod(0o600)
            
            logger.info(f"Secret {key} stored successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set secret {key}: {e}")
            return False
    
    async def delete_secret(self, key: str) -> bool:
        """Delete secret file"""
        try:
            secret_file = self.secrets_dir / f"{key}.enc"
            if secret_file.exists():
                secret_file.unlink()
                logger.info(f"Secret {key} deleted successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to delete secret {key}: {e}")
            return False
    
    async def list_secrets(self) -> List[str]:
        """List available secret keys"""
        try:
            return [f.stem for f in self.secrets_dir.glob("*.enc")]
        except Exception as e:
            logger.error(f"Failed to list secrets: {e}")
            return []

class HashiCorpVaultProvider(SecretProvider):
    """HashiCorp Vault secret provider"""
    
    def __init__(self, config: SecretConfig):
        self.config = config
        self.client = hvac.Client(
            url=config.vault_url,
            token=config.vault_token
        )
        
        if not self.client.is_authenticated():
            raise ValueError("Failed to authenticate with Vault")
    
    async def get_secret(self, key: str) -> Optional[str]:
        """Get secret from Vault"""
        try:
            response = self.client.secrets.kv.v2.read_secret_version(
                path=key,
                mount_point='securenet'
            )
            return response['data']['data'].get('value')
        except Exception as e:
            logger.error(f"Failed to get secret {key} from Vault: {e}")
            return None
    
    async def set_secret(self, key: str, value: str, metadata: Dict[str, Any] = None) -> bool:
        """Set secret in Vault"""
        try:
            secret_data = {'value': value}
            if metadata:
                secret_data.update(metadata)
            
            self.client.secrets.kv.v2.create_or_update_secret(
                path=key,
                secret=secret_data,
                mount_point='securenet'
            )
            
            logger.info(f"Secret {key} stored in Vault successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to set secret {key} in Vault: {e}")
            return False
    
    async def delete_secret(self, key: str) -> bool:
        """Delete secret from Vault"""
        try:
            self.client.secrets.kv.v2.delete_metadata_and_all_versions(
                path=key,
                mount_point='securenet'
            )
            logger.info(f"Secret {key} deleted from Vault successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to delete secret {key} from Vault: {e}")
            return False
    
    async def list_secrets(self) -> List[str]:
        """List secrets in Vault"""
        try:
            response = self.client.secrets.kv.v2.list_secrets(
                path='',
                mount_point='securenet'
            )
            return response['data']['keys']
        except Exception as e:
            logger.error(f"Failed to list secrets from Vault: {e}")
            return []

class AWSSecretsManagerProvider(SecretProvider):
    """AWS Secrets Manager provider"""
    
    def __init__(self, config: SecretConfig):
        self.config = config
        self.client = boto3.client(
            'secretsmanager',
            region_name=config.aws_region or 'us-east-1'
        )
        self.secret_prefix = "securenet/"
    
    async def get_secret(self, key: str) -> Optional[str]:
        """Get secret from AWS Secrets Manager"""
        try:
            response = self.client.get_secret_value(
                SecretId=f"{self.secret_prefix}{key}"
            )
            
            if 'SecretString' in response:
                secret_data = json.loads(response['SecretString'])
                return secret_data.get('value')
            
            return None
        except Exception as e:
            logger.error(f"Failed to get secret {key} from AWS: {e}")
            return None
    
    async def set_secret(self, key: str, value: str, metadata: Dict[str, Any] = None) -> bool:
        """Set secret in AWS Secrets Manager"""
        try:
            secret_data = {'value': value}
            if metadata:
                secret_data['metadata'] = metadata
            
            secret_name = f"{self.secret_prefix}{key}"
            
            try:
                # Try to update existing secret
                self.client.update_secret(
                    SecretId=secret_name,
                    SecretString=json.dumps(secret_data)
                )
            except self.client.exceptions.ResourceNotFoundException:
                # Create new secret
                self.client.create_secret(
                    Name=secret_name,
                    SecretString=json.dumps(secret_data),
                    Description=f"SecureNet secret: {key}"
                )
            
            logger.info(f"Secret {key} stored in AWS Secrets Manager successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to set secret {key} in AWS: {e}")
            return False
    
    async def delete_secret(self, key: str) -> bool:
        """Delete secret from AWS Secrets Manager"""
        try:
            self.client.delete_secret(
                SecretId=f"{self.secret_prefix}{key}",
                ForceDeleteWithoutRecovery=True
            )
            logger.info(f"Secret {key} deleted from AWS Secrets Manager successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to delete secret {key} from AWS: {e}")
            return False
    
    async def list_secrets(self) -> List[str]:
        """List secrets in AWS Secrets Manager"""
        try:
            response = self.client.list_secrets()
            secrets = []
            
            for secret in response['SecretList']:
                name = secret['Name']
                if name.startswith(self.secret_prefix):
                    secrets.append(name[len(self.secret_prefix):])
            
            return secrets
        except Exception as e:
            logger.error(f"Failed to list secrets from AWS: {e}")
            return []

class SecureNetSecretsManager:
    """Centralized secrets management for SecureNet"""
    
    def __init__(self, config: SecretConfig = None):
        self.config = config or SecretConfig()
        self.provider = self._get_provider()
        self._cache = {}  # Simple in-memory cache
        self._cache_ttl = 300  # 5 minutes
    
    def _get_provider(self) -> SecretProvider:
        """Get the configured secret provider"""
        if self.config.provider == "vault":
            return HashiCorpVaultProvider(self.config)
        elif self.config.provider == "aws":
            return AWSSecretsManagerProvider(self.config)
        else:
            return FileSecretProvider(self.config)
    
    async def get_secret(self, key: str, use_cache: bool = True) -> Optional[str]:
        """Get a secret with optional caching"""
        if use_cache and key in self._cache:
            cached_data = self._cache[key]
            if time.time() - cached_data['timestamp'] < self._cache_ttl:
                return cached_data['value']
        
        value = await self.provider.get_secret(key)
        
        if value and use_cache:
            self._cache[key] = {
                'value': value,
                'timestamp': time.time()
            }
        
        return value
    
    async def set_secret(self, key: str, value: str, metadata: Dict[str, Any] = None) -> bool:
        """Set a secret"""
        # Clear from cache
        self._cache.pop(key, None)
        
        return await self.provider.set_secret(key, value, metadata)
    
    async def delete_secret(self, key: str) -> bool:
        """Delete a secret"""
        # Clear from cache
        self._cache.pop(key, None)
        
        return await self.provider.delete_secret(key)
    
    async def rotate_secret(self, key: str, generator_func: callable = None) -> bool:
        """Rotate a secret"""
        try:
            if generator_func:
                new_value = generator_func()
            else:
                new_value = self.generate_secure_secret()
            
            # Store old secret for rollback
            old_value = await self.get_secret(key)
            
            if await self.set_secret(key, new_value):
                logger.info(f"Secret {key} rotated successfully")
                return True
            else:
                logger.error(f"Failed to rotate secret {key}")
                return False
                
        except Exception as e:
            logger.error(f"Error rotating secret {key}: {e}")
            return False
    
    @staticmethod
    def generate_secure_secret(length: int = 32) -> str:
        """Generate a cryptographically secure secret"""
        return crypto_secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_jwt_secret() -> str:
        """Generate a JWT secret"""
        return crypto_secrets.token_urlsafe(64)
    
    @staticmethod
    def generate_encryption_key() -> str:
        """Generate an encryption key"""
        return base64.urlsafe_b64encode(os.urandom(32)).decode()
    
    async def initialize_default_secrets(self):
        """Initialize default secrets for SecureNet"""
        default_secrets = {
            'jwt_secret': self.generate_jwt_secret,
            'encryption_key': self.generate_encryption_key,
            'api_key': lambda: f"sk-{crypto_secrets.token_urlsafe(32)}",
            'webhook_secret': lambda: crypto_secrets.token_urlsafe(32),
        }
        
        for key, generator in default_secrets.items():
            existing = await self.get_secret(key)
            if not existing:
                new_secret = generator()
                await self.set_secret(key, new_secret, {
                    'auto_generated': True,
                    'created_at': datetime.utcnow().isoformat()
                })
                logger.info(f"Generated default secret: {key}")

# Global secrets manager
_secrets_manager: Optional[SecureNetSecretsManager] = None

def get_secrets_manager() -> SecureNetSecretsManager:
    """Get the global secrets manager"""
    global _secrets_manager
    if _secrets_manager is None:
        config = SecretConfig(
            provider=os.getenv("SECRETS_PROVIDER", "file"),
            vault_url=os.getenv("VAULT_URL"),
            vault_token=os.getenv("VAULT_TOKEN"),
            aws_region=os.getenv("AWS_REGION"),
            encryption_key=os.getenv("ENCRYPTION_KEY")
        )
        _secrets_manager = SecureNetSecretsManager(config)
    return _secrets_manager

# Utility functions for common secrets
async def get_jwt_secret() -> str:
    """Get JWT secret"""
    manager = get_secrets_manager()
    secret = await manager.get_secret('jwt_secret')
    if not secret:
        # Fallback to environment variable
        secret = os.getenv('JWT_SECRET')
        if not secret:
            raise ValueError("JWT secret not found in secrets store or environment")
    return secret

async def get_database_password() -> str:
    """Get database password"""
    manager = get_secrets_manager()
    secret = await manager.get_secret('database_password')
    if not secret:
        secret = os.getenv('POSTGRES_PASSWORD')
        if not secret:
            raise ValueError("Database password not found")
    return secret

async def get_encryption_key() -> str:
    """Get encryption key"""
    manager = get_secrets_manager()
    secret = await manager.get_secret('encryption_key')
    if not secret:
        secret = os.getenv('ENCRYPTION_KEY')
        if not secret:
            raise ValueError("Encryption key not found")
    return secret

async def get_api_key() -> str:
    """Get API key"""
    manager = get_secrets_manager()
    secret = await manager.get_secret('api_key')
    if not secret:
        secret = os.getenv('API_KEY')
        if not secret:
            raise ValueError("API key not found")
    return secret

# Secret validation functions
def validate_jwt_secret(secret: str) -> bool:
    """Validate JWT secret strength"""
    if len(secret) < 32:
        return False
    
    # Check for sufficient entropy
    entropy = len(set(secret))
    return entropy >= 16

def validate_encryption_key(key: str) -> bool:
    """Validate encryption key format"""
    try:
        decoded = base64.urlsafe_b64decode(key)
        return len(decoded) >= 32
    except Exception:
        return False

# Initialization script for setting up secrets
async def setup_enterprise_secrets():
    """Setup enterprise secrets"""
    manager = get_secrets_manager()
    
    print("🔐 Setting up SecureNet Enterprise Secrets")
    print("=" * 50)
    
    # Initialize default secrets
    await manager.initialize_default_secrets()
    
    # Generate additional enterprise secrets
    enterprise_secrets = {
        'postgres_password': lambda: crypto_secrets.token_urlsafe(32),
        'redis_password': lambda: crypto_secrets.token_urlsafe(24),
        'grafana_admin_password': lambda: crypto_secrets.token_urlsafe(16),
        'monitoring_api_key': lambda: f"mon-{crypto_secrets.token_urlsafe(24)}",
        'webhook_signing_secret': lambda: crypto_secrets.token_urlsafe(32),
        'session_secret': lambda: crypto_secrets.token_urlsafe(32),
    }
    
    for key, generator in enterprise_secrets.items():
        existing = await manager.get_secret(key)
        if not existing:
            new_secret = generator()
            await manager.set_secret(key, new_secret, {
                'type': 'enterprise',
                'auto_generated': True,
                'created_at': datetime.utcnow().isoformat()
            })
            print(f"✓ Generated secret: {key}")
        else:
            print(f"✓ Secret exists: {key}")
    
    print("\n✅ Enterprise secrets setup completed!")
    print("\nSecrets are encrypted and stored securely.")
    print("For production, consider using HashiCorp Vault or AWS Secrets Manager.")

if __name__ == "__main__":
    import asyncio
    import time
    from datetime import datetime
    
    asyncio.run(setup_enterprise_secrets()) 
"""
SecureNet Enterprise Encryption at Rest
AES-256 encryption with envelope encryption for tenant data
"""

import os
import base64
import secrets
from typing import Dict, Any, Optional, Tuple, Union
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import json
import logging
from dataclasses import dataclass
from enum import Enum
import hashlib
from datetime import datetime, timezone
import redis

logger = logging.getLogger(__name__)

class EncryptionMethod(Enum):
    AES_256_GCM = "aes_256_gcm"
    FERNET = "fernet"
    RSA_OAEP = "rsa_oaep"

class KeyType(Enum):
    DATA_ENCRYPTION_KEY = "dek"
    KEY_ENCRYPTION_KEY = "kek"
    MASTER_KEY = "master"

@dataclass
class EncryptionConfig:
    """Encryption configuration"""
    master_key_path: str = "secrets/master.key"
    key_rotation_days: int = 90
    use_envelope_encryption: bool = True
    default_method: EncryptionMethod = EncryptionMethod.AES_256_GCM
    key_derivation_iterations: int = 100000

class EnterpriseEncryption:
    """Enterprise-grade encryption manager"""
    
    def __init__(self, config: EncryptionConfig, redis_client: Optional[redis.Redis] = None):
        self.config = config
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=2)
        self.backend = default_backend()
        
        # Initialize master key
        self.master_key = self._load_or_create_master_key()
        
        # Key cache (in production, use secure key management service)
        self.key_cache = {}
        
        logger.info("Enterprise encryption manager initialized")
    
    def _load_or_create_master_key(self) -> bytes:
        """Load or create master encryption key"""
        master_key_path = self.config.master_key_path
        
        # Ensure secrets directory exists
        os.makedirs(os.path.dirname(master_key_path), exist_ok=True)
        
        if os.path.exists(master_key_path):
            # Load existing master key
            with open(master_key_path, 'rb') as f:
                encrypted_key = f.read()
            
            # In production, this would be decrypted using HSM or KMS
            # For now, we'll assume it's stored encrypted with a passphrase
            return self._decrypt_master_key(encrypted_key)
        else:
            # Generate new master key
            master_key = secrets.token_bytes(32)  # 256-bit key
            
            # Encrypt and store master key
            encrypted_key = self._encrypt_master_key(master_key)
            with open(master_key_path, 'wb') as f:
                f.write(encrypted_key)
            
            # Set restrictive permissions
            os.chmod(master_key_path, 0o600)
            
            logger.info(f"New master key created at {master_key_path}")
            return master_key
    
    def _encrypt_master_key(self, master_key: bytes) -> bytes:
        """Encrypt master key with passphrase (simplified)"""
        # In production, use HSM or KMS
        passphrase = os.getenv("MASTER_KEY_PASSPHRASE", "default-passphrase").encode()
        
        salt = secrets.token_bytes(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=self.config.key_derivation_iterations,
            backend=self.backend
        )
        key = kdf.derive(passphrase)
        
        f = Fernet(base64.urlsafe_b64encode(key))
        encrypted_key = f.encrypt(master_key)
        
        # Prepend salt for decryption
        return salt + encrypted_key
    
    def _decrypt_master_key(self, encrypted_data: bytes) -> bytes:
        """Decrypt master key with passphrase"""
        salt = encrypted_data[:16]
        encrypted_key = encrypted_data[16:]
        
        passphrase = os.getenv("MASTER_KEY_PASSPHRASE", "default-passphrase").encode()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=self.config.key_derivation_iterations,
            backend=self.backend
        )
        key = kdf.derive(passphrase)
        
        f = Fernet(base64.urlsafe_b64encode(key))
        return f.decrypt(encrypted_key)
    
    def generate_data_encryption_key(self, organization_id: str) -> Tuple[bytes, str]:
        """Generate new data encryption key for organization"""
        # Generate 256-bit DEK
        dek = secrets.token_bytes(32)
        
        # Create key ID
        key_id = f"dek_{organization_id}_{secrets.token_hex(8)}"
        
        if self.config.use_envelope_encryption:
            # Encrypt DEK with master key (envelope encryption)
            encrypted_dek = self._encrypt_with_master_key(dek)
            
            # Store encrypted DEK
            self._store_encrypted_key(key_id, encrypted_dek, KeyType.DATA_ENCRYPTION_KEY)
        else:
            # Store DEK directly (less secure)
            self._store_key(key_id, dek, KeyType.DATA_ENCRYPTION_KEY)
        
        # Cache DEK for performance
        self.key_cache[key_id] = dek
        
        logger.info(f"Generated DEK for organization {organization_id}: {key_id}")
        return dek, key_id
    
    def get_data_encryption_key(self, key_id: str) -> Optional[bytes]:
        """Retrieve data encryption key"""
        # Check cache first
        if key_id in self.key_cache:
            return self.key_cache[key_id]
        
        # Load from storage
        if self.config.use_envelope_encryption:
            encrypted_dek = self._load_encrypted_key(key_id)
            if encrypted_dek:
                dek = self._decrypt_with_master_key(encrypted_dek)
                self.key_cache[key_id] = dek
                return dek
        else:
            return self._load_key(key_id)
        
        return None
    
    def _encrypt_with_master_key(self, data: bytes) -> bytes:
        """Encrypt data with master key using AES-256-GCM"""
        # Generate random IV
        iv = secrets.token_bytes(12)  # 96-bit IV for GCM
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(self.master_key),
            modes.GCM(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        
        # Encrypt data
        ciphertext = encryptor.update(data) + encryptor.finalize()
        
        # Return IV + tag + ciphertext
        return iv + encryptor.tag + ciphertext
    
    def _decrypt_with_master_key(self, encrypted_data: bytes) -> bytes:
        """Decrypt data with master key"""
        # Extract components
        iv = encrypted_data[:12]
        tag = encrypted_data[12:28]
        ciphertext = encrypted_data[28:]
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(self.master_key),
            modes.GCM(iv, tag),
            backend=self.backend
        )
        decryptor = cipher.decryptor()
        
        # Decrypt data
        return decryptor.update(ciphertext) + decryptor.finalize()
    
    def encrypt_data(self, data: Union[str, bytes, dict], key_id: str) -> str:
        """Encrypt data using specified key"""
        # Get encryption key
        dek = self.get_data_encryption_key(key_id)
        if not dek:
            raise ValueError(f"Encryption key not found: {key_id}")
        
        # Serialize data if needed
        if isinstance(data, dict):
            data = json.dumps(data).encode('utf-8')
        elif isinstance(data, str):
            data = data.encode('utf-8')
        
        # Encrypt with AES-256-GCM
        encrypted_data = self._encrypt_with_key(data, dek)
        
        # Create envelope with metadata
        envelope = {
            "version": "1.0",
            "method": EncryptionMethod.AES_256_GCM.value,
            "key_id": key_id,
            "encrypted_data": base64.b64encode(encrypted_data).decode('utf-8'),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return base64.b64encode(json.dumps(envelope).encode('utf-8')).decode('utf-8')
    
    def decrypt_data(self, encrypted_envelope: str) -> Union[str, dict]:
        """Decrypt data from encrypted envelope"""
        try:
            # Decode envelope
            envelope_data = base64.b64decode(encrypted_envelope.encode('utf-8'))
            envelope = json.loads(envelope_data.decode('utf-8'))
            
            # Get encryption key
            key_id = envelope["key_id"]
            dek = self.get_data_encryption_key(key_id)
            if not dek:
                raise ValueError(f"Decryption key not found: {key_id}")
            
            # Decrypt data
            encrypted_data = base64.b64decode(envelope["encrypted_data"].encode('utf-8'))
            decrypted_data = self._decrypt_with_key(encrypted_data, dek)
            
            # Try to parse as JSON, otherwise return as string
            try:
                return json.loads(decrypted_data.decode('utf-8'))
            except json.JSONDecodeError:
                return decrypted_data.decode('utf-8')
                
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Failed to decrypt data")
    
    def _encrypt_with_key(self, data: bytes, key: bytes) -> bytes:
        """Encrypt data with specific key using AES-256-GCM"""
        # Generate random IV
        iv = secrets.token_bytes(12)
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        
        # Encrypt data
        ciphertext = encryptor.update(data) + encryptor.finalize()
        
        # Return IV + tag + ciphertext
        return iv + encryptor.tag + ciphertext
    
    def _decrypt_with_key(self, encrypted_data: bytes, key: bytes) -> bytes:
        """Decrypt data with specific key"""
        # Extract components
        iv = encrypted_data[:12]
        tag = encrypted_data[12:28]
        ciphertext = encrypted_data[28:]
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=self.backend
        )
        decryptor = cipher.decryptor()
        
        # Decrypt data
        return decryptor.update(ciphertext) + decryptor.finalize()
    
    def _store_encrypted_key(self, key_id: str, encrypted_key: bytes, key_type: KeyType):
        """Store encrypted key in Redis"""
        key_data = {
            "encrypted_key": base64.b64encode(encrypted_key).decode('utf-8'),
            "key_type": key_type.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0"
        }
        
        self.redis_client.set(
            f"encrypted_key:{key_id}",
            json.dumps(key_data)
        )
    
    def _load_encrypted_key(self, key_id: str) -> Optional[bytes]:
        """Load encrypted key from Redis"""
        key_data_str = self.redis_client.get(f"encrypted_key:{key_id}")
        if not key_data_str:
            return None
        
        key_data = json.loads(key_data_str.decode('utf-8'))
        return base64.b64decode(key_data["encrypted_key"].encode('utf-8'))
    
    def _store_key(self, key_id: str, key: bytes, key_type: KeyType):
        """Store key directly (less secure)"""
        key_data = {
            "key": base64.b64encode(key).decode('utf-8'),
            "key_type": key_type.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0"
        }
        
        self.redis_client.set(
            f"key:{key_id}",
            json.dumps(key_data)
        )
    
    def _load_key(self, key_id: str) -> Optional[bytes]:
        """Load key directly"""
        key_data_str = self.redis_client.get(f"key:{key_id}")
        if not key_data_str:
            return None
        
        key_data = json.loads(key_data_str.decode('utf-8'))
        return base64.b64decode(key_data["key"].encode('utf-8'))
    
    def rotate_organization_key(self, organization_id: str, old_key_id: str) -> str:
        """Rotate encryption key for organization"""
        # Generate new DEK
        new_dek, new_key_id = self.generate_data_encryption_key(organization_id)
        
        # Mark old key for rotation
        self._mark_key_for_rotation(old_key_id)
        
        logger.info(f"Key rotated for organization {organization_id}: {old_key_id} -> {new_key_id}")
        return new_key_id
    
    def _mark_key_for_rotation(self, key_id: str):
        """Mark key for rotation (keep for decryption of old data)"""
        rotation_data = {
            "key_id": key_id,
            "rotated_at": datetime.now(timezone.utc).isoformat(),
            "status": "rotated"
        }
        
        self.redis_client.set(
            f"key_rotation:{key_id}",
            json.dumps(rotation_data)
        )
    
    def encrypt_pii_field(self, field_value: str, organization_id: str, field_name: str) -> str:
        """Encrypt PII field with organization-specific key"""
        # Get or create organization key
        key_id = f"org_{organization_id}_pii"
        
        if not self.get_data_encryption_key(key_id):
            self.generate_data_encryption_key(organization_id)
        
        # Add field context to encryption
        field_data = {
            "value": field_value,
            "field": field_name,
            "organization_id": organization_id
        }
        
        return self.encrypt_data(field_data, key_id)
    
    def decrypt_pii_field(self, encrypted_field: str, organization_id: str) -> str:
        """Decrypt PII field"""
        decrypted_data = self.decrypt_data(encrypted_field)
        
        if isinstance(decrypted_data, dict):
            # Verify organization context
            if decrypted_data.get("organization_id") != organization_id:
                raise ValueError("Organization mismatch in encrypted data")
            
            return decrypted_data["value"]
        
        return str(decrypted_data)
    
    def get_encryption_status(self, organization_id: str) -> Dict[str, Any]:
        """Get encryption status for organization"""
        key_id = f"org_{organization_id}_pii"
        
        return {
            "organization_id": organization_id,
            "encryption_enabled": self.get_data_encryption_key(key_id) is not None,
            "encryption_method": self.config.default_method.value,
            "envelope_encryption": self.config.use_envelope_encryption,
            "key_rotation_days": self.config.key_rotation_days
        }

class DatabaseEncryption:
    """Database-specific encryption utilities"""
    
    def __init__(self, encryption_manager: EnterpriseEncryption):
        self.encryption = encryption_manager
    
    def encrypt_sensitive_columns(self, data: Dict[str, Any], organization_id: str, 
                                 sensitive_fields: list) -> Dict[str, Any]:
        """Encrypt sensitive database columns"""
        encrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encryption.encrypt_pii_field(
                    str(encrypted_data[field]), 
                    organization_id, 
                    field
                )
        
        return encrypted_data
    
    def decrypt_sensitive_columns(self, data: Dict[str, Any], organization_id: str,
                                 sensitive_fields: list) -> Dict[str, Any]:
        """Decrypt sensitive database columns"""
        decrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    decrypted_data[field] = self.encryption.decrypt_pii_field(
                        decrypted_data[field], 
                        organization_id
                    )
                except Exception as e:
                    logger.error(f"Failed to decrypt field {field}: {e}")
                    # Keep encrypted value if decryption fails
        
        return decrypted_data

# Global encryption manager
encryption_manager: Optional[EnterpriseEncryption] = None

def get_encryption_manager() -> EnterpriseEncryption:
    """Get global encryption manager"""
    global encryption_manager
    if encryption_manager is None:
        config = EncryptionConfig()
        encryption_manager = EnterpriseEncryption(config)
    return encryption_manager

def get_database_encryption() -> DatabaseEncryption:
    """Get database encryption utilities"""
    return DatabaseEncryption(get_encryption_manager())

# Utility functions for common encryption tasks
def encrypt_user_data(user_data: Dict[str, Any], organization_id: str) -> Dict[str, Any]:
    """Encrypt sensitive user data fields"""
    sensitive_fields = ['email', 'phone', 'address', 'ssn', 'credit_card']
    db_encryption = get_database_encryption()
    return db_encryption.encrypt_sensitive_columns(user_data, organization_id, sensitive_fields)

def decrypt_user_data(encrypted_data: Dict[str, Any], organization_id: str) -> Dict[str, Any]:
    """Decrypt sensitive user data fields"""
    sensitive_fields = ['email', 'phone', 'address', 'ssn', 'credit_card']
    db_encryption = get_database_encryption()
    return db_encryption.decrypt_sensitive_columns(encrypted_data, organization_id, sensitive_fields)

def encrypt_scan_results(scan_data: Dict[str, Any], organization_id: str) -> Dict[str, Any]:
    """Encrypt sensitive scan result data"""
    sensitive_fields = ['ip_address', 'hostname', 'mac_address', 'device_info']
    db_encryption = get_database_encryption()
    return db_encryption.encrypt_sensitive_columns(scan_data, organization_id, sensitive_fields)

def decrypt_scan_results(encrypted_data: Dict[str, Any], organization_id: str) -> Dict[str, Any]:
    """Decrypt sensitive scan result data"""
    sensitive_fields = ['ip_address', 'hostname', 'mac_address', 'device_info']
    db_encryption = get_database_encryption()
    return db_encryption.decrypt_sensitive_columns(encrypted_data, organization_id, sensitive_fields) 
"""
SecureNet Advanced Cryptography
Phase 3: Advanced Tooling - PyNaCl Integration
"""

import nacl.secret
import nacl.utils
import nacl.hash
import nacl.pwhash
from nacl.public import PrivateKey, PublicKey, Box
from nacl.signing import SigningKey, VerifyKey
from nacl.encoding import Base64Encoder, HexEncoder
import os
import json
from typing import Dict, Any, Optional, Union, Tuple
from datetime import datetime
import secrets
from utils.logging_config import get_logger

logger = get_logger(__name__)

class SecureNetCrypto:
    """Advanced cryptography service for SecureNet"""
    
    def __init__(self, master_key: bytes = None):
        self.master_key = master_key or self._derive_master_key()
        self.secret_box = nacl.secret.SecretBox(self.master_key)
        
        # Generate signing key for data integrity
        self.signing_key = SigningKey.generate()
        self.verify_key = self.signing_key.verify_key
        
        logger.info("SecureNet crypto service initialized")
    
    def _derive_master_key(self) -> bytes:
        """Derive master key from environment or generate new one"""
        
        key_material = os.getenv("MASTER_KEY_MATERIAL")
        if key_material:
            # Derive key from provided material
            return nacl.hash.blake2b(
                key_material.encode(),
                digest_size=32,
                encoder=nacl.encoding.RawEncoder
            )
        else:
            # Generate new key (should be stored securely in production)
            key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
            logger.warning("Generated new master key - store securely!")
            return key
    
    def encrypt_data(self, data: Union[str, bytes, Dict[str, Any]]) -> str:
        """Encrypt data with authenticated encryption"""
        
        try:
            # Convert data to bytes if needed
            if isinstance(data, dict):
                data_bytes = json.dumps(data).encode('utf-8')
            elif isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = data
            
            # Encrypt with authenticated encryption
            encrypted = self.secret_box.encrypt(data_bytes)
            
            # Return base64 encoded result
            return encrypted.encode(Base64Encoder).decode('utf-8')
            
        except Exception as e:
            logger.error("Encryption failed", error=str(e))
            raise
    
    def decrypt_data(self, encrypted_data: str) -> bytes:
        """Decrypt data and verify authenticity"""
        
        try:
            # Decode from base64
            encrypted_bytes = encrypted_data.encode('utf-8')
            
            # Decrypt and verify
            decrypted = self.secret_box.decrypt(encrypted_bytes, encoder=Base64Encoder)
            
            return decrypted
            
        except Exception as e:
            logger.error("Decryption failed", error=str(e))
            raise
    
    def encrypt_json(self, data: Dict[str, Any]) -> str:
        """Encrypt JSON data"""
        return self.encrypt_data(data)
    
    def decrypt_json(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt JSON data"""
        decrypted_bytes = self.decrypt_data(encrypted_data)
        return json.loads(decrypted_bytes.decode('utf-8'))
    
    def hash_password(self, password: str) -> str:
        """Hash password with Argon2id"""
        
        try:
            # Use Argon2id for password hashing
            hashed = nacl.pwhash.argon2id.str(password.encode('utf-8'))
            return hashed.decode('utf-8')
            
        except Exception as e:
            logger.error("Password hashing failed", error=str(e))
            raise
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        
        try:
            nacl.pwhash.argon2id.verify(hashed.encode('utf-8'), password.encode('utf-8'))
            return True
            
        except nacl.exceptions.InvalidMessage:
            return False
        except Exception as e:
            logger.error("Password verification failed", error=str(e))
            return False
    
    def generate_key_pair(self) -> Tuple[str, str]:
        """Generate public/private key pair for asymmetric encryption"""
        
        private_key = PrivateKey.generate()
        public_key = private_key.public_key
        
        return (
            private_key.encode(Base64Encoder).decode('utf-8'),
            public_key.encode(Base64Encoder).decode('utf-8')
        )
    
    def encrypt_for_recipient(self, data: Union[str, bytes], recipient_public_key: str, sender_private_key: str) -> str:
        """Encrypt data for specific recipient using public key cryptography"""
        
        try:
            # Decode keys
            private_key = PrivateKey(sender_private_key.encode('utf-8'), encoder=Base64Encoder)
            public_key = PublicKey(recipient_public_key.encode('utf-8'), encoder=Base64Encoder)
            
            # Create box for encryption
            box = Box(private_key, public_key)
            
            # Convert data to bytes if needed
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = data
            
            # Encrypt
            encrypted = box.encrypt(data_bytes)
            
            return encrypted.encode(Base64Encoder).decode('utf-8')
            
        except Exception as e:
            logger.error("Public key encryption failed", error=str(e))
            raise
    
    def decrypt_from_sender(self, encrypted_data: str, sender_public_key: str, recipient_private_key: str) -> bytes:
        """Decrypt data from specific sender using public key cryptography"""
        
        try:
            # Decode keys
            private_key = PrivateKey(recipient_private_key.encode('utf-8'), encoder=Base64Encoder)
            public_key = PublicKey(sender_public_key.encode('utf-8'), encoder=Base64Encoder)
            
            # Create box for decryption
            box = Box(private_key, public_key)
            
            # Decrypt
            decrypted = box.decrypt(encrypted_data.encode('utf-8'), encoder=Base64Encoder)
            
            return decrypted
            
        except Exception as e:
            logger.error("Public key decryption failed", error=str(e))
            raise
    
    def sign_data(self, data: Union[str, bytes]) -> str:
        """Sign data for integrity verification"""
        
        try:
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = data
            
            signed = self.signing_key.sign(data_bytes)
            return signed.encode(Base64Encoder).decode('utf-8')
            
        except Exception as e:
            logger.error("Data signing failed", error=str(e))
            raise
    
    def verify_signature(self, signed_data: str, verify_key: str = None) -> bytes:
        """Verify signed data"""
        
        try:
            if verify_key:
                key = VerifyKey(verify_key.encode('utf-8'), encoder=Base64Encoder)
            else:
                key = self.verify_key
            
            verified = key.verify(signed_data.encode('utf-8'), encoder=Base64Encoder)
            return verified
            
        except Exception as e:
            logger.error("Signature verification failed", error=str(e))
            raise

class SecretManager:
    """Secure secret management"""
    
    def __init__(self, crypto: SecureNetCrypto):
        self.crypto = crypto
        self.secrets_store = {}  # In production, use secure storage
        self.logger = get_logger("secret_manager")
    
    def store_secret(self, key: str, value: str, metadata: Dict[str, Any] = None) -> str:
        """Store a secret securely"""
        
        try:
            secret_data = {
                "value": value,
                "created_at": datetime.utcnow().isoformat(),
                "metadata": metadata or {}
            }
            
            encrypted_secret = self.crypto.encrypt_json(secret_data)
            secret_id = secrets.token_urlsafe(16)
            
            self.secrets_store[key] = {
                "id": secret_id,
                "encrypted_data": encrypted_secret
            }
            
            self.logger.info(
                "Secret stored",
                key=key,
                secret_id=secret_id
            )
            
            return secret_id
            
        except Exception as e:
            self.logger.error("Failed to store secret", key=key, error=str(e))
            raise
    
    def retrieve_secret(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve a secret"""
        
        try:
            if key not in self.secrets_store:
                return None
            
            stored_secret = self.secrets_store[key]
            decrypted_data = self.crypto.decrypt_json(stored_secret["encrypted_data"])
            
            self.logger.info("Secret retrieved", key=key)
            
            return decrypted_data
            
        except Exception as e:
            self.logger.error("Failed to retrieve secret", key=key, error=str(e))
            return None
    
    def delete_secret(self, key: str) -> bool:
        """Delete a secret"""
        
        try:
            if key in self.secrets_store:
                del self.secrets_store[key]
                self.logger.info("Secret deleted", key=key)
                return True
            return False
            
        except Exception as e:
            self.logger.error("Failed to delete secret", key=key, error=str(e))
            return False
    
    def rotate_secret(self, key: str, new_value: str) -> str:
        """Rotate a secret value"""
        
        # Store old secret with timestamp
        old_secret = self.retrieve_secret(key)
        if old_secret:
            old_key = f"{key}_old_{int(datetime.utcnow().timestamp())}"
            self.store_secret(old_key, old_secret["value"], {"rotated_from": key})
        
        # Store new secret
        return self.store_secret(key, new_value, {"rotated_at": datetime.utcnow().isoformat()})

class TenantCrypto:
    """Tenant-specific cryptography operations"""
    
    def __init__(self, crypto: SecureNetCrypto, tenant_id: str):
        self.crypto = crypto
        self.tenant_id = tenant_id
        self.logger = get_logger(f"tenant_crypto_{tenant_id}")
        
        # Generate tenant-specific key material
        self.tenant_key = self._derive_tenant_key()
        self.tenant_box = nacl.secret.SecretBox(self.tenant_key)
    
    def _derive_tenant_key(self) -> bytes:
        """Derive tenant-specific encryption key"""
        
        # Derive key from master key + tenant ID
        key_material = f"{self.tenant_id}:tenant_key".encode('utf-8')
        return nacl.hash.blake2b(
            key_material,
            key=self.crypto.master_key,
            digest_size=32,
            encoder=nacl.encoding.RawEncoder
        )
    
    def encrypt_tenant_data(self, data: Union[str, Dict[str, Any]]) -> str:
        """Encrypt data with tenant-specific key"""
        
        try:
            if isinstance(data, dict):
                data_bytes = json.dumps(data).encode('utf-8')
            else:
                data_bytes = data.encode('utf-8')
            
            encrypted = self.tenant_box.encrypt(data_bytes)
            return encrypted.encode(Base64Encoder).decode('utf-8')
            
        except Exception as e:
            self.logger.error("Tenant data encryption failed", error=str(e))
            raise
    
    def decrypt_tenant_data(self, encrypted_data: str) -> bytes:
        """Decrypt tenant-specific data"""
        
        try:
            decrypted = self.tenant_box.decrypt(encrypted_data.encode('utf-8'), encoder=Base64Encoder)
            return decrypted
            
        except Exception as e:
            self.logger.error("Tenant data decryption failed", error=str(e))
            raise
    
    def encrypt_sensitive_field(self, field_name: str, value: str) -> str:
        """Encrypt sensitive database field"""
        
        field_data = {
            "field": field_name,
            "value": value,
            "tenant_id": self.tenant_id,
            "encrypted_at": datetime.utcnow().isoformat()
        }
        
        return self.encrypt_tenant_data(field_data)
    
    def decrypt_sensitive_field(self, encrypted_field: str) -> str:
        """Decrypt sensitive database field"""
        
        decrypted_bytes = self.decrypt_tenant_data(encrypted_field)
        field_data = json.loads(decrypted_bytes.decode('utf-8'))
        
        # Verify tenant ID matches
        if field_data.get("tenant_id") != self.tenant_id:
            raise ValueError("Tenant ID mismatch in encrypted field")
        
        return field_data["value"]

# Global crypto instances
crypto_service = SecureNetCrypto()
secret_manager = SecretManager(crypto_service)

def get_tenant_crypto(tenant_id: str) -> TenantCrypto:
    """Get tenant-specific crypto instance"""
    return TenantCrypto(crypto_service, tenant_id) 
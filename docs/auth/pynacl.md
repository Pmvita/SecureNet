✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# PyNaCl - Advanced Cryptography

PyNaCl is a Python binding to the Networking and Cryptography library (NaCl), providing high-level cryptographic operations including encryption, digital signatures, and key exchange.

## 🎯 Purpose for SecureNet

- **Data Encryption** - Secure sensitive data at rest and in transit
- **Digital Signatures** - Verify data integrity and authenticity
- **Key Exchange** - Secure key agreement protocols
- **Password Hashing** - Secure password storage with Argon2
- **Secret Management** - Encrypt configuration secrets and API keys

## 📦 Installation

```bash
pip install pynacl
```

## 🔧 Integration

### Core Cryptography Service

**File**: `crypto/nacl_service.py`

```python
import nacl.secret
import nacl.public
import nacl.signing
import nacl.hash
import nacl.pwhash
import nacl.utils
from nacl.encoding import Base64Encoder, HexEncoder
import os
import json
from typing import Dict, Any, Optional, Tuple
import structlog

logger = structlog.get_logger()

class SecureNetCrypto:
    """Advanced cryptography service using PyNaCl"""
    
    def __init__(self, master_key: Optional[bytes] = None):
        self.master_key = master_key or self._generate_master_key()
        self.secret_box = nacl.secret.SecretBox(self.master_key)
        
    def _generate_master_key(self) -> bytes:
        """Generate or load master encryption key"""
        key_file = "master.key"
        
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                return f.read()
        else:
            key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
            with open(key_file, "wb") as f:
                f.write(key)
            return key
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        encrypted = self.secret_box.encrypt(data.encode('utf-8'))
        return encrypted.encode(Base64Encoder).decode('utf-8')
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        encrypted_bytes = encrypted_data.encode('utf-8')
        decrypted = self.secret_box.decrypt(encrypted_bytes, encoder=Base64Encoder)
        return decrypted.decode('utf-8')
    
    def hash_password(self, password: str) -> str:
        """Hash password using Argon2"""
        return nacl.pwhash.str(password.encode('utf-8')).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            nacl.pwhash.verify(hashed.encode('utf-8'), password.encode('utf-8'))
            return True
        except nacl.exceptions.InvalidMessage:
            return False
    
    def generate_keypair(self) -> Tuple[str, str]:
        """Generate public/private key pair"""
        private_key = nacl.public.PrivateKey.generate()
        public_key = private_key.public_key
        
        return (
            private_key.encode(Base64Encoder).decode('utf-8'),
            public_key.encode(Base64Encoder).decode('utf-8')
        )
    
    def encrypt_for_recipient(self, data: str, recipient_public_key: str, sender_private_key: str) -> str:
        """Encrypt data for specific recipient"""
        recipient_key = nacl.public.PublicKey(recipient_public_key, encoder=Base64Encoder)
        sender_key = nacl.public.PrivateKey(sender_private_key, encoder=Base64Encoder)
        
        box = nacl.public.Box(sender_key, recipient_key)
        encrypted = box.encrypt(data.encode('utf-8'))
        
        return encrypted.encode(Base64Encoder).decode('utf-8')
    
    def decrypt_from_sender(self, encrypted_data: str, sender_public_key: str, recipient_private_key: str) -> str:
        """Decrypt data from specific sender"""
        sender_key = nacl.public.PublicKey(sender_public_key, encoder=Base64Encoder)
        recipient_key = nacl.public.PrivateKey(recipient_private_key, encoder=Base64Encoder)
        
        box = nacl.public.Box(recipient_key, sender_key)
        decrypted = box.decrypt(encrypted_data.encode('utf-8'), encoder=Base64Encoder)
        
        return decrypted.decode('utf-8')
    
    def sign_data(self, data: str, private_key: str) -> str:
        """Create digital signature"""
        signing_key = nacl.signing.SigningKey(private_key, encoder=Base64Encoder)
        signed = signing_key.sign(data.encode('utf-8'))
        
        return signed.encode(Base64Encoder).decode('utf-8')
    
    def verify_signature(self, signed_data: str, public_key: str) -> str:
        """Verify digital signature and return original data"""
        verify_key = nacl.signing.VerifyKey(public_key, encoder=Base64Encoder)
        verified = verify_key.verify(signed_data.encode('utf-8'), encoder=Base64Encoder)
        
        return verified.decode('utf-8')

class SecretManager:
    """Manage encrypted secrets and configuration"""
    
    def __init__(self, crypto_service: SecureNetCrypto):
        self.crypto = crypto_service
        self.secrets_file = "secrets.enc"
        self._secrets_cache = {}
    
    def store_secret(self, key: str, value: str, category: str = "general"):
        """Store encrypted secret"""
        secrets = self._load_secrets()
        
        if category not in secrets:
            secrets[category] = {}
        
        secrets[category][key] = self.crypto.encrypt_data(value)
        self._save_secrets(secrets)
        
        # Update cache
        if category not in self._secrets_cache:
            self._secrets_cache[category] = {}
        self._secrets_cache[category][key] = value
        
        logger.info("Secret stored", key=key, category=category)
    
    def get_secret(self, key: str, category: str = "general") -> Optional[str]:
        """Retrieve and decrypt secret"""
        # Check cache first
        if category in self._secrets_cache and key in self._secrets_cache[category]:
            return self._secrets_cache[category][key]
        
        secrets = self._load_secrets()
        
        if category not in secrets or key not in secrets[category]:
            return None
        
        encrypted_value = secrets[category][key]
        decrypted_value = self.crypto.decrypt_data(encrypted_value)
        
        # Cache decrypted value
        if category not in self._secrets_cache:
            self._secrets_cache[category] = {}
        self._secrets_cache[category][key] = decrypted_value
        
        return decrypted_value
    
    def _load_secrets(self) -> Dict[str, Dict[str, str]]:
        """Load encrypted secrets from file"""
        if not os.path.exists(self.secrets_file):
            return {}
        
        with open(self.secrets_file, 'r') as f:
            return json.load(f)
    
    def _save_secrets(self, secrets: Dict[str, Dict[str, str]]):
        """Save encrypted secrets to file"""
        with open(self.secrets_file, 'w') as f:
            json.dump(secrets, f, indent=2)

class TenantCrypto:
    """Tenant-specific cryptographic operations"""
    
    def __init__(self, base_crypto: SecureNetCrypto):
        self.base_crypto = base_crypto
        self.tenant_keys = {}
    
    def get_tenant_key(self, tenant_id: str) -> bytes:
        """Get or create tenant-specific encryption key"""
        if tenant_id not in self.tenant_keys:
            # Derive tenant key from master key and tenant ID
            tenant_key = nacl.hash.blake2b(
                self.base_crypto.master_key + tenant_id.encode('utf-8'),
                digest_size=32
            )
            self.tenant_keys[tenant_id] = tenant_key
        
        return self.tenant_keys[tenant_id]
    
    def encrypt_tenant_data(self, data: str, tenant_id: str) -> str:
        """Encrypt data with tenant-specific key"""
        tenant_key = self.get_tenant_key(tenant_id)
        secret_box = nacl.secret.SecretBox(tenant_key)
        encrypted = secret_box.encrypt(data.encode('utf-8'))
        return encrypted.encode(Base64Encoder).decode('utf-8')
    
    def decrypt_tenant_data(self, encrypted_data: str, tenant_id: str) -> str:
        """Decrypt data with tenant-specific key"""
        tenant_key = self.get_tenant_key(tenant_id)
        secret_box = nacl.secret.SecretBox(tenant_key)
        decrypted = secret_box.decrypt(encrypted_data.encode('utf-8'), encoder=Base64Encoder)
        return decrypted.decode('utf-8')
```

### Database Encryption Integration

**File**: `crypto/database_encryption.py`

```python
from crypto.nacl_service import SecureNetCrypto, TenantCrypto
from sqlalchemy import event, Column, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.types import TypeDecorator, String as SQLString
import structlog

logger = structlog.get_logger()

class EncryptedType(TypeDecorator):
    """SQLAlchemy type for encrypted fields"""
    
    impl = SQLString
    
    def __init__(self, crypto_service: SecureNetCrypto, *args, **kwargs):
        self.crypto_service = crypto_service
        super().__init__(*args, **kwargs)
    
    def process_bind_param(self, value, dialect):
        """Encrypt value before storing in database"""
        if value is not None:
            return self.crypto_service.encrypt_data(str(value))
        return value
    
    def process_result_value(self, value, dialect):
        """Decrypt value after retrieving from database"""
        if value is not None:
            return self.crypto_service.decrypt_data(value)
        return value

class TenantEncryptedType(TypeDecorator):
    """SQLAlchemy type for tenant-specific encrypted fields"""
    
    impl = SQLString
    
    def __init__(self, tenant_crypto: TenantCrypto, *args, **kwargs):
        self.tenant_crypto = tenant_crypto
        super().__init__(*args, **kwargs)
    
    def process_bind_param(self, value, dialect):
        """Encrypt value with tenant-specific key"""
        if value is not None and hasattr(self, '_current_tenant_id'):
            return self.tenant_crypto.encrypt_tenant_data(str(value), self._current_tenant_id)
        return value
    
    def process_result_value(self, value, dialect):
        """Decrypt value with tenant-specific key"""
        if value is not None and hasattr(self, '_current_tenant_id'):
            return self.tenant_crypto.decrypt_tenant_data(value, self._current_tenant_id)
        return value

# Example encrypted models
Base = declarative_base()
crypto_service = SecureNetCrypto()
tenant_crypto = TenantCrypto(crypto_service)

class EncryptedThreat(Base):
    __tablename__ = 'encrypted_threats'
    
    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    
    # Encrypted fields
    description = Column(EncryptedType(crypto_service))
    source_ip = Column(TenantEncryptedType(tenant_crypto))
    target_details = Column(TenantEncryptedType(tenant_crypto))
    
    # Non-encrypted fields
    severity = Column(String)
    detected_at = Column(String)
```

## 🚀 Usage Examples

### Basic Encryption

```python
from crypto.nacl_service import SecureNetCrypto

# Initialize crypto service
crypto = SecureNetCrypto()

# Encrypt sensitive data
sensitive_data = "192.168.1.100 - Critical vulnerability detected"
encrypted = crypto.encrypt_data(sensitive_data)
print(f"Encrypted: {encrypted}")

# Decrypt data
decrypted = crypto.decrypt_data(encrypted)
print(f"Decrypted: {decrypted}")
```

### Password Hashing

```python
# Hash password
password = "user_password_123"
hashed = crypto.hash_password(password)
print(f"Hashed: {hashed}")

# Verify password
is_valid = crypto.verify_password(password, hashed)
print(f"Valid: {is_valid}")
```

### Secret Management

```python
from crypto.nacl_service import SecretManager

# Initialize secret manager
secret_manager = SecretManager(crypto)

# Store secrets
secret_manager.store_secret("database_url", "postgresql://user:pass@host/db", "database")
secret_manager.store_secret("api_key", "sk-1234567890abcdef", "external_apis")

# Retrieve secrets
db_url = secret_manager.get_secret("database_url", "database")
api_key = secret_manager.get_secret("api_key", "external_apis")
```

### Tenant-Specific Encryption

```python
from crypto.nacl_service import TenantCrypto

# Initialize tenant crypto
tenant_crypto = TenantCrypto(crypto)

# Encrypt data for specific tenant
tenant_data = "Sensitive threat intelligence for Tenant A"
encrypted_tenant = tenant_crypto.encrypt_tenant_data(tenant_data, "tenant_123")

# Decrypt data for tenant
decrypted_tenant = tenant_crypto.decrypt_tenant_data(encrypted_tenant, "tenant_123")
```

## ✅ Validation Steps

1. **Install PyNaCl**:
   ```bash
   pip install pynacl
   ```

2. **Test Basic Encryption**:
   ```python
   from crypto.nacl_service import SecureNetCrypto
   
   crypto = SecureNetCrypto()
   encrypted = crypto.encrypt_data("test data")
   decrypted = crypto.decrypt_data(encrypted)
   assert decrypted == "test data"
   ```

3. **Test Password Hashing**:
   ```python
   hashed = crypto.hash_password("password123")
   assert crypto.verify_password("password123", hashed)
   assert not crypto.verify_password("wrong", hashed)
   ```

## 📈 Benefits for SecureNet

- **Strong Encryption** - Industry-standard cryptographic algorithms
- **Data Protection** - Secure sensitive data at rest and in transit
- **Tenant Isolation** - Cryptographic separation of tenant data
- **Password Security** - Secure password hashing with Argon2
- **Secret Management** - Encrypted storage of configuration secrets
- **Compliance** - Meet data protection regulatory requirements

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [Authentication Overview](README.md)
- [Authlib Integration](authlib.md) 
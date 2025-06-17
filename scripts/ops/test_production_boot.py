#!/usr/bin/env python3
"""
SecureNet Production Boot Test Script

Comprehensive validation of production environment readiness using reusable validation module.
"""

import sys
import asyncio
import logging
from pathlib import Path

# Add project root and utils to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / 'scripts'))

from utils.validate import SecureNetValidator

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    """Main test runner using reusable validation module."""
    try:
        # Create validator instance
        validator = SecureNetValidator(project_root)
        
        # Run core 5-point validation suite
        passed, total = await validator.run_core_validations()
        
        # Print summary and determine success
        success = validator.print_summary(passed, total)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except Exception as e:
        logger.error(f"Test runner failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 
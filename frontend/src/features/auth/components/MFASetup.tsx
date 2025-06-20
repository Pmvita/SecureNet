import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCodeIcon, KeyIcon, ShieldCheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Alert } from '../../../components/common/Alert';
import { Modal } from '../../../components/common/Modal';

/**
 * SecureNet MFA Setup Component
 * Day 3 Sprint 1: Frontend integration with MFA backend service
 */

interface MFASetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (success: boolean) => void;
}

interface MFASetupData {
  secret_key: string;
  qr_code: string;
  backup_codes: string[];
  totp_uri: string;
}

export const MFASetup: React.FC<MFASetupProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'backup' | 'complete'>('intro');
  const [mfaData, setMfaData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  // Initialize MFA setup
  const initializeMFA = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initialize MFA setup');
      }

      const data = await response.json();
      setMfaData(data);
      setStep('qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup MFA');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify TOTP code
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          token: verificationCode,
          secret: mfaData?.secret_key
        })
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      setStep('backup');
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete MFA setup
  const completeMFASetup = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/mfa/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete MFA setup');
      }

      setStep('complete');
      setTimeout(() => {
        onComplete(true);
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to complete MFA setup');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = async () => {
    if (!mfaData?.backup_codes) return;
    
    const codesText = mfaData.backup_codes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 3000);
    } catch (err) {
      setError('Failed to copy backup codes');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <div className="mb-6">
              <ShieldCheckIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                Enable Two-Factor Authentication
              </h3>
              <p className="text-gray-300 mb-6">
                Add an extra layer of security to your SecureNet account
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-white mb-4">What you'll need:</h4>
              <ul className="text-left text-gray-300 space-y-2">
                <li className="flex items-center">
                  <QrCodeIcon className="h-5 w-5 text-blue-500 mr-3" />
                  An authenticator app (Google Authenticator, Authy, etc.)
                </li>
                <li className="flex items-center">
                  <KeyIcon className="h-5 w-5 text-blue-500 mr-3" />
                  Access to your mobile device
                </li>
                <li className="flex items-center">
                  <ClipboardDocumentIcon className="h-5 w-5 text-blue-500 mr-3" />
                  A secure place to store backup codes
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={initializeMFA} disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Get Started'}
              </Button>
            </div>
          </motion.div>
        );

      case 'qr':
        return (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h3 className="text-2xl font-bold text-white mb-2">
              Scan QR Code
            </h3>
            <p className="text-gray-300 mb-6">
              Use your authenticator app to scan this QR code
            </p>

            {mfaData?.qr_code && (
              <div className="bg-white p-6 rounded-lg inline-block mb-6">
                <img 
                  src={mfaData.qr_code} 
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300 mb-2">
                Can't scan? Enter this code manually:
              </p>
              <code className="text-blue-400 font-mono text-sm bg-gray-900 px-3 py-1 rounded">
                {mfaData?.secret_key}
              </code>
            </div>

            <Button onClick={() => setStep('verify')} className="w-full">
              I've Added the Account
            </Button>
          </motion.div>
        );

      case 'verify':
        return (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h3 className="text-2xl font-bold text-white mb-2 text-center">
              Verify Setup
            </h3>
            <p className="text-gray-300 mb-6 text-center">
              Enter the 6-digit code from your authenticator app
            </p>

            <div className="mb-6">
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <p className="text-sm text-gray-400 mt-2 text-center">
                Enter the current code from your authenticator app
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setStep('qr')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                onClick={verifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </motion.div>
        );

      case 'backup':
        return (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h3 className="text-2xl font-bold text-white mb-2 text-center">
              Save Backup Codes
            </h3>
            <p className="text-gray-300 mb-6 text-center">
              Store these codes safely. You can use them to access your account if you lose your device.
            </p>

                         <Alert 
               variant="warning" 
               message="Each code can only be used once. Store them in a secure location."
               title="Important"
               className="mb-6"
             />

            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {mfaData?.backup_codes.map((code, index) => (
                  <div key={index} className="text-blue-400 p-2 bg-gray-900 rounded">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                variant="secondary"
                onClick={copyBackupCodes}
                className="flex-1"
              >
                {copiedBackupCodes ? 'Copied!' : 'Copy Codes'}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="secondary"
                onClick={() => setStep('verify')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={completeMFASetup}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Completing...' : 'Complete Setup'}
              </Button>
            </div>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                MFA Enabled Successfully!
              </h3>
              <p className="text-gray-300">
                Your account is now protected with two-factor authentication
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}
        
        {renderStep()}
      </div>
    </Modal>
  );
};

export default MFASetup; 
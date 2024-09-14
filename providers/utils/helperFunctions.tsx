import { TransferRequestURL } from '@solana/pay';
import { ParsedInstruction } from '@solana/web3.js';
import crypto from 'crypto';

function encrypt(data: string, apiKey: string) {
  // Use the API key to create a key for encryption
  const key = crypto.createHash('sha256').update(apiKey).digest();

  // Create an initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  // Encrypt the data
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  // Create a signature
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(encryptedData);
  const signature = hmac.digest('hex');

  // Combine IV, encrypted data, and signature
  return iv.toString('hex') + ':' + encryptedData + ':' + signature;
}

function decrypt(data: string, apiKey: string) {
  // Split the encrypted memo into its components
  const [ivHex, encryptedData, signature] = data.split(':');

  // Use the API key to recreate the encryption key
  const key = crypto.createHash('sha256').update(apiKey).digest();

  // Verify the signature
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(encryptedData);
  const computedSignature = hmac.digest('hex');

  if (computedSignature !== signature) {
    throw new Error(
      'Signature verification failed. The data may have been tampered with.',
    );
  }

  // Recreate the IV
  const iv = Buffer.from(ivHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  // Decrypt the data
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');

  // Parse the JSON data
  return decryptedData;
}

function extractPayNowInfo(payNowString: string): {
  uen?: string;
  phoneNumber?: string;
  netsAccount?: string;
} {
  // Regular expression to capture phone numbers (Singapore numbers usually start with +65)
  const phoneRegex = /\+65\d{8}/;
  // Updated UEN regex: Alphanumeric UEN which can be 9 digits followed by a letter or other similar formats
  const uenRegex = /\b\d{9}[A-Z]|\b\d{10}[A-Z]\b/;
  // Regular expression to capture NETS account numbers (typically 12 digits separated by spaces)
  const netsRegex = /\d{6}\s\d{4}\s\d{6}/;

  const phoneNumberMatch = payNowString.match(phoneRegex);
  const uenMatch = payNowString.match(uenRegex);
  const netsAccountMatch = payNowString.match(netsRegex);

  return {
    uen: uenMatch ? uenMatch[0] : undefined,
    phoneNumber: phoneNumberMatch ? phoneNumberMatch[0] : undefined,
    netsAccount: netsAccountMatch
      ? netsAccountMatch[0].replace(/\s/g, '')
      : undefined, // remove spaces in NETS accounts
  };
}

function isTransferRequestURL(obj: unknown): obj is TransferRequestURL {
  return typeof obj === 'object' && obj !== null && 'recipient' in obj;
}

function isParsedInstruction(obj: unknown): obj is ParsedInstruction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'program' in obj &&
    'parsed' in obj
  );
}

export {
  encrypt,
  decrypt,
  extractPayNowInfo,
  isTransferRequestURL,
  isParsedInstruction,
};

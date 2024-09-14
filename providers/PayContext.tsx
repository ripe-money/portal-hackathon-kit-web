/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, {
  useContext,
  createContext,
  useReducer,
  useEffect,
  useState,
} from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { usePortal } from './portal';
import { parseURL, TransferRequestURL } from '@solana/pay';
import {
  Grid,
  Typography,
  Button,
  Box,
  CircularProgress,
  TextField,
} from '@mui/material';
import { Cancel, Pending, Send } from '@mui/icons-material';
import crypto from 'crypto';
import { ParsedInstruction, ParsedTransactionWithMeta } from '@solana/web3.js';

const PYUSDAddress =
  process.env.pyUsdMint || 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM';
const MemoPrefix = 'Ripe:';
type PayType = 'SOLANA_ADDRESS' | 'SOLANA_PAY' | 'RIPE_FIAT' | null;
interface PaymentInfo {
  chainId: string;
  to: string;
  from: string;
  tokenAddress: string;
  tokenAmount: number;
  payType: PayType;
  memo: string;
  hash: string;
  pay: () => void;
  decode: (rawQRData: string) => void;
  reset?: () => void;
  updateFields?: ({
    tokenAmount,
    memo,
    fiatAmount,
  }: {
    tokenAmount?: number;
    memo?: string;
    fiatAmount?: number;
  }) => void;
  getPaymentTransactions: () => void;
}

interface FiatInfo {
  fiatAmount?: number;
  fiatCurrency?: 'SGD' | 'PESO' | 'IDR' | 'BHT';
  netsAcc?: string;
  uen?: string;
  phoneNumber?: string;
}

interface MemoInfo {
  description: string;
  payType: PayType;
  fiatInfo?: FiatInfo;
}

interface PaymentUIState extends PaymentInfo, FiatInfo {
  isPayingLoading: boolean;
}

interface PaymentTransaction {
  memoInfo: MemoInfo;
  transaction: ParsedTransactionWithMeta;
}

const initialState: PaymentUIState = {
  chainId: process.env.solanaChainId || '',
  to: '',
  from: '',
  tokenAddress: '',
  tokenAmount: 0,
  payType: null,
  memo: '',
  fiatAmount: 0,
  hash: '',
  isPayingLoading: false,
  pay: () => {},
  decode: (rawQRData: string) => {},
  getPaymentTransactions: () => {},
};

type ACTIONTYPE =
  | { type: 'initiate'; payload: PaymentUIState }
  | { type: 'pay'; payload: PaymentUIState }
  | { type: 'decode'; payload: PaymentUIState }
  | { type: 'updateFields'; payload: PaymentUIState };

const PayContext = createContext(initialState);

function reducer(state: PaymentUIState, action: ACTIONTYPE) {
  switch (action.type) {
    case 'initiate':
      return {
        ...action.payload,
      };
    case 'pay':
      return {
        ...state,
        ...action.payload,
      };
    case 'updateFields':
      return {
        ...state,
        ...action.payload,
      };
    case 'decode':
      return {
        ...state,
        ...action.payload,
      };
    default:
      throw new Error('Pay action type not valid');
  }
}

function PayProvider({ children }: { children: React.ReactNode }) {
  const portal = usePortal();
  const [state, dispatch] = useReducer(reducer, initialState);

  async function reset() {
    dispatch({
      type: 'initiate',
      payload: {
        ...initialState,
      },
    });
  }

  async function pay() {
    if (!state || !process.env.portalClientApiKey) return;

    dispatch({
      type: 'pay',
      payload: {
        ...state,
        isPayingLoading: true,
      },
    });

    if (state.payType === 'RIPE_FIAT') return;
    const memo = constructMemoWithEncryption(
      state.memo || 'No Memo Provided',
      process.env.portalClientApiKey,
    );
    const hash = await portal.sendTokensOnSolanaWithMemo(
      state.to,
      state.tokenAddress,
      state.tokenAmount,
      constructMemoWithEncryption(
        state.memo || 'No Memo Provided',
        process.env.portalClientApiKey,
      ),
    );

    dispatch({
      type: 'pay',
      payload: {
        ...state,
        isPayingLoading: false,
        hash,
      },
    });

    destructureMemoWithDecryption(memo, process.env.portalClientApiKey);
  }

  async function updateFields(updatedFields: {
    tokenAmount?: number;
    memo?: string;
    fiatAmount?: number;
  }) {
    if (!state) return;

    dispatch({
      type: 'updateFields',
      payload: {
        ...state,
        ...updatedFields,
      },
    });
  }

  async function decode(rawQRData: string) {
    //if it is a solana pay qrcode

    if (rawQRData.substring(0, 7) === 'solana:') {
      try {
        const payParams = parseURL(rawQRData);

        if (!isTransferRequestURL(payParams)) return;

        dispatch({
          type: 'decode',
          payload: {
            ...state,
            to: payParams?.recipient.toString(),
            tokenAmount: Number(payParams?.amount),
            tokenAddress: payParams?.splToken?.toString() || '',
            payType: 'SOLANA_PAY',
          },
        });
      } catch (error) {
        console.error('invalid solana pay qr code: ', error);
      } finally {
        return;
      }
    }

    //if it is a Paynow qrcode
    if (
      rawQRData.toUpperCase().includes('PAYNOW') ||
      rawQRData.toUpperCase().includes('SGQR') ||
      rawQRData.toUpperCase().includes('SG.COM.NETS')
    ) {
      //Ripe services

      const { uen, phoneNumber, netsAccount } = extractPayNowInfo(rawQRData);
      console.log({ uen, phoneNumber, netsAccount });
      dispatch({
        type: 'decode',
        payload: {
          ...state,
          tokenAddress: PYUSDAddress,
          payType: 'RIPE_FIAT',
          uen: uen,
          phoneNumber,
          netsAcc: netsAccount,
          fiatCurrency: 'SGD',
        },
      });
      return;
    }

    //if it is a solana address, which is usually between 32-44 characters
    if (rawQRData.length >= 32 && rawQRData.length <= 44) {
      dispatch({
        type: 'decode',
        payload: {
          ...state,
          to: rawQRData,
          tokenAddress: PYUSDAddress,
          payType: 'SOLANA_ADDRESS',
        },
      });

      return;
    }
  }

  async function getPaymentTransactions() {
    if (!process.env.portalClientApiKey) return [];

    const paymentTransactions: PaymentTransaction[] = [];

    const transactions = await portal.getAllTransactions();
    if (!transactions || transactions.length === 0) return [];

    for (let i = 0; i < transactions?.length; i++) {
      const tx = transactions[i];
      if (!tx) continue;
      const instructions = tx.transaction.message.instructions;
      if (!instructions || instructions.length === 0) continue;

      for (let j = 0; j < instructions.length; j++) {
        const instruction = instructions[j];

        if (!isParsedInstruction(instruction)) continue;

        const memoEncodedText = instruction.parsed;
        const memoInfo = destructureMemoWithDecryption(
          memoEncodedText,
          process.env.portalClientApiKey,
        );

        if (!memoInfo) continue;

        if ('description' in memoInfo) {
          paymentTransactions.push({
            memoInfo,
            transaction: tx,
          });
        }
      }
    }

    return paymentTransactions;
  }

  function constructMemoWithEncryption(description: string, apiKey: string) {
    const memoInfo: MemoInfo = {
      description,
      payType: state.payType,
    };
    if (state.payType === 'RIPE_FIAT') {
      memoInfo.fiatInfo = {
        fiatAmount: state.fiatAmount,
        fiatCurrency: state.fiatCurrency,
        netsAcc: state.netsAcc,
        uen: state.uen,
        phoneNumber: state.phoneNumber,
      };
    }
    return MemoPrefix + encrypt(JSON.stringify(memoInfo), apiKey);
  }

  function destructureMemoWithDecryption(memo: string, apiKey: string) {
    try {
      if (!memo || typeof memo !== 'string') return null;
      if (!memo.startsWith(MemoPrefix))
        throw new Error('This is not a payment transaction initiated by Ripe');
      const memoInfo = JSON.parse(decrypt(memo.substring(5), apiKey));
      if (!memoInfo?.description || !memoInfo?.payType)
        throw new Error('This is not a payment transaction initiated by Ripe');

      return memoInfo;
    } catch (error) {
      console.error(error);
    } finally {
      return null;
    }
  }

  return (
    <PayContext.Provider
      value={{
        ...state,
        pay,
        decode,
        reset,
        updateFields,
        getPaymentTransactions,
      }}
    >
      {children}
    </PayContext.Provider>
  );
}

function usePay() {
  const context = useContext(PayContext);
  if (context === undefined)
    throw new Error('Pay Context is outside of Provider');
  return context;
}

function PayUI({ payCrypto }: { payCrypto: PaymentUIState }) {
  switch (payCrypto.payType) {
    case 'SOLANA_ADDRESS':
      return <PayThroughSolanaTransfer payCrypto={payCrypto} />;
    case 'SOLANA_PAY':
      return <PayThroughSolana_Pay payCrypto={payCrypto} />;
    case 'RIPE_FIAT':
      return <PayThroughRipeFiat payCrypto={payCrypto} />;
    case null:
      return <QRScanner decode={payCrypto.decode} />;
    default:
      return <QRScanner decode={payCrypto.decode} />;
  }
}

function QRScanner({ decode }: { decode?: (rawQRData: string) => void }) {
  // @ts-expect-error unsure what type is expected
  function handleOnScan(result) {
    if (!decode) return;

    decode(result?.[0].rawValue || '');
  }
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '580px',
        position: 'relative',
      }}
    >
      <Typography
        sx={{
          position: 'absolute',
          right: '35px',
          bottom: '10px',
          zIndex: 10,
          fontSize: {
            xs: '10px',
            sm: '12px',
          },
          color: '#8B6A00',
          fontWeight: 'bold',
          fontFamily: 'fantasy',
        }}
      >
        Powered by @Ripe
      </Typography>
      <Scanner onScan={(result) => handleOnScan(result)} />
    </Box>
  );
}

function PayThroughSolana_Pay({ payCrypto }: { payCrypto: PaymentUIState }) {
  return (
    <Box sx={{ p: 3, background: 'white', borderRadius: '20px' }}>
      <Box display="flex" justifyContent="left" alignItems="center" mb={2}>
        <Typography variant="h5" align="center" gutterBottom>
          Solana Pay Transaction Request
        </Typography>
        <img
          src="/solanapay-logo.svg"
          alt="solana pay logo"
          style={{ marginLeft: '8px' }}
        />
      </Box>

      <Grid container spacing={2}>
        {/* Send To Address */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Send To Address:
          </Typography>
          <Typography
            variant="body1"
            style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
          >
            {payCrypto.to}
          </Typography>
        </Grid>

        {/* Token (Icon, name, address) */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Token:
          </Typography>
          <Typography
            variant="body1"
            style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
          >
            <img
              src="/pyusd.png"
              alt="PYUSD"
              style={{ width: '24px', marginRight: '8px' }}
            />
            {'PYUSD'} ({payCrypto.tokenAddress})
          </Typography>
        </Grid>

        {/* Token Amount */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Token Amount:
          </Typography>
          <Typography variant="body1">{payCrypto.tokenAmount}</Typography>
        </Grid>

        {/* Memo */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Memo:
          </Typography>
          <Typography
            variant="body1"
            style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
          >
            {payCrypto.memo || 'No memo provided'}
          </Typography>
        </Grid>

        {/* Transaction Hash */}
        {payCrypto.hash && (
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Transaction Hash:
            </Typography>
            <Typography
              variant="body1"
              style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
            >
              {payCrypto.hash}
            </Typography>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box display="flex" gap={2}>
            <Button
              color="inherit"
              variant="contained"
              onClick={async () => {
                payCrypto.pay();
              }}
              endIcon={
                payCrypto.isPayingLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <Send />
                )
              }
            >
              {payCrypto.isPayingLoading ? 'Paying' : 'Pay'}
            </Button>
            <Button
              color="inherit"
              variant="contained"
              onClick={async () => {
                if (payCrypto.reset) payCrypto.reset();
              }}
              endIcon={<Cancel />}
            >
              Cancel
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function PayThroughSolanaTransfer({
  payCrypto,
}: {
  payCrypto: PaymentUIState;
}) {
  return (
    <div>
      <Box sx={{ p: 3, background: 'white', borderRadius: '20px' }}>
        {/* Header for the form */}
        <Typography variant="h5" gutterBottom>
          Solana Address Transfer
        </Typography>

        <Grid container spacing={2}>
          {/* First row: Send To Address (Non-editable) */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Send To Address:
            </Typography>
            <Typography variant="body1" sx={{ wordWrap: 'break-word' }}>
              {payCrypto.to}
            </Typography>
          </Grid>

          {/* Token (Icon, name, address) */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Token:
            </Typography>
            <Typography
              variant="body1"
              style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
            >
              <img
                src="/pyusd.png"
                alt="PYUSD"
                style={{ width: '24px', marginRight: '8px' }}
              />
              {'PYUSD'} ({payCrypto.tokenAddress})
            </Typography>
          </Grid>

          {/* Token Amount */}
          <Grid item xs={12}>
            <TextField
              label="Token Amount"
              variant="outlined"
              fullWidth
              type="number"
              name="tokenAmount"
              value={payCrypto.tokenAmount}
              onChange={(e) =>
                payCrypto.updateFields &&
                payCrypto.updateFields({
                  tokenAmount: Number(e.target.value || 0),
                  fiatAmount: payCrypto.fiatAmount,
                  memo: payCrypto.memo,
                })
              }
            />
          </Grid>

          {/* Memo */}
          <Grid item xs={12}>
            <TextField
              label="Memo"
              variant="outlined"
              fullWidth
              name="memo"
              value={payCrypto.memo}
              onChange={(e) =>
                payCrypto.updateFields &&
                payCrypto.updateFields({
                  memo: e.target.value,
                  fiatAmount: payCrypto.fiatAmount,
                  tokenAmount: payCrypto.tokenAmount,
                })
              }
            />
          </Grid>

          {/* Transaction Hash */}
          {payCrypto.hash && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Transaction Hash:
              </Typography>
              <Typography
                variant="body1"
                style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
              >
                {payCrypto.hash}
              </Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <Button
                color="inherit"
                variant="contained"
                onClick={async () => {
                  payCrypto.pay();
                }}
                endIcon={
                  payCrypto.isPayingLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <Send />
                  )
                }
              >
                {payCrypto.isPayingLoading ? 'Paying' : 'Pay'}
              </Button>
              <Button
                color="inherit"
                variant="contained"
                onClick={async () => {
                  if (payCrypto.reset) payCrypto.reset();
                }}
                endIcon={<Cancel />}
              >
                Cancel
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
}

function PayThroughRipeFiat({ payCrypto }: { payCrypto: PaymentUIState }) {
  const SGD_USD_CONVERSION = 0.77;

  return (
    <div>
      <Box sx={{ p: 3, background: 'white', borderRadius: '20px' }}>
        <Typography variant="h5" gutterBottom>
          Pay Fiat using @Ripe
        </Typography>

        <Grid container spacing={2}>
          {!payCrypto.phoneNumber && !payCrypto.uen && !payCrypto.netsAcc ? (
            <Grid item xs={12}>
              <Typography variant="body1" gutterBottom>
                No Phone Number, UEN and Nets account found
              </Typography>
            </Grid>
          ) : (
            <>
              {payCrypto.phoneNumber && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Phone Number:
                  </Typography>
                  <Typography variant="body1" sx={{ wordWrap: 'break-word' }}>
                    {payCrypto.phoneNumber}
                  </Typography>
                </Grid>
              )}

              {payCrypto.uen && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    UEN:
                  </Typography>
                  <Typography variant="body1" sx={{ wordWrap: 'break-word' }}>
                    {payCrypto.uen}
                  </Typography>
                </Grid>
              )}

              {payCrypto.netsAcc && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    SG NETS Account:
                  </Typography>
                  <Typography variant="body1" sx={{ wordWrap: 'break-word' }}>
                    {payCrypto.netsAcc}
                  </Typography>
                </Grid>
              )}

              {/* Token (Icon, name, address) */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Token:
                </Typography>
                <Typography
                  variant="body1"
                  style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                >
                  <img
                    src="/pyusd.png"
                    alt="PYUSD"
                    style={{ width: '24px', marginRight: '8px' }}
                  />
                  {'PYUSD'} ({payCrypto.tokenAddress})
                </Typography>
              </Grid>

              {/* Fiat Amount */}
              <Grid item xs={6}>
                <TextField
                  label="Fiat Amount (SGD)"
                  variant="outlined"
                  fullWidth
                  type="number"
                  name="fiatAmount"
                  value={payCrypto.fiatAmount}
                  onChange={(e) =>
                    payCrypto.updateFields &&
                    payCrypto.updateFields({
                      fiatAmount: Number(e.target.value || 0),
                      tokenAmount:
                        Number(e.target.value || 0) * SGD_USD_CONVERSION,
                      memo: payCrypto.memo,
                    })
                  }
                />
              </Grid>

              {/* Token Amount */}
              <Grid item xs={6}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid rgba(0, 0, 0, 0.23)', // Similar border to TextField
                    borderRadius: '4px', // Match TextField's border radius
                    padding: '16.5px 14px', // Padding matches the default padding of TextField
                    backgroundColor: '#fff', // TextField background color
                    fontSize: '16px', // Default font size for TextField
                    lineHeight: '1.5', // Adjust to match TextField's line height
                    height: '56px',
                  }}
                >
                  <img
                    src="/pyusd.png"
                    alt="PYUSD"
                    style={{ width: '24px', marginRight: '8px' }}
                  />
                  <Typography
                    variant="body1"
                    style={{
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {'PYUSD'} {payCrypto.tokenAmount}
                  </Typography>
                </div>
              </Grid>

              {/* Memo */}
              <Grid item xs={12}>
                <TextField
                  label="Memo"
                  variant="outlined"
                  fullWidth
                  name="memo"
                  value={payCrypto.memo}
                  onChange={(e) =>
                    payCrypto.updateFields &&
                    payCrypto.updateFields({
                      memo: e.target.value,
                      fiatAmount: payCrypto.fiatAmount,
                      tokenAmount: payCrypto.tokenAmount,
                    })
                  }
                />
              </Grid>

              {/* Transaction Hash */}
              {payCrypto.hash && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Transaction Hash:
                  </Typography>
                  <Typography
                    variant="body1"
                    style={{
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {payCrypto.hash}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    color="inherit"
                    variant="contained"
                    onClick={async () => {
                      payCrypto.pay();
                    }}
                    endIcon={
                      payCrypto.isPayingLoading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        <Send />
                      )
                    }
                  >
                    {payCrypto.isPayingLoading ? 'Paying' : 'Pay'}
                  </Button>
                  <Button
                    color="inherit"
                    variant="contained"
                    onClick={async () => {
                      if (payCrypto.reset) payCrypto.reset();
                    }}
                    endIcon={<Cancel />}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </div>
  );
}

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

//throw a few examples to ChatGPT to let it generate possible Regex patterns
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

export { PayProvider, usePay, PayUI };

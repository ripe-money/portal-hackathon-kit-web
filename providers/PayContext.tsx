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

const PYUSDAddress = 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM';

interface PaymentInfo {
  chainId: string;
  to: string;
  from: string;
  tokenAddress: string;
  tokenAmount: number;
  payType: 'SOLANA_ADDRESS' | 'SOLANA_PAY' | 'RIPE_FIAT' | null;
  memo?: string;
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
}

interface FiatInfo {
  fiatAmount?: number;
  fiatCurrency?: 'SGD' | 'PESO' | 'IDR' | 'BHT';
  netsAcc?: string;
  uen?: string;
  phoneNumber?: string;
}

interface PaymentUIState extends PaymentInfo, FiatInfo {
  isPayingLoading: boolean;
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

  useEffect(() => {
    console.log({ ...state });
  }, [state]);

  async function reset() {
    dispatch({
      type: 'initiate',
      payload: {
        ...initialState,
      },
    });
  }

  async function pay() {
    if (!state) return;

    console.log('here');
    dispatch({
      type: 'pay',
      payload: {
        ...state,
        isPayingLoading: true,
      },
    });

    const hash = await portal.sendTokensOnSolana(
      state.to,
      state.tokenAddress,
      state.tokenAmount,
    );

    dispatch({
      type: 'pay',
      payload: {
        ...state,
        isPayingLoading: false,
        hash,
      },
    });
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
    console.log(rawQRData);

    //if it is a solana pay qrcode

    /*
      solana:
      GvHeR432g7MjN9uKyX3Dzg66TqwrEWgANLnnFZXMeyyj
      ?
      amount=1
      &
      spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
      &
      reference=72FrP58fnrD24Fo48jKR2PoyjjaTcKQJHM9inPV6TFGn
      &
      label=Solana%20Pay
    */

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

  function isTransferRequestURL(obj: unknown): obj is TransferRequestURL {
    return typeof obj === 'object' && obj !== null && 'recipient' in obj;
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

  return (
    <PayContext.Provider value={{ ...state, pay, decode, reset, updateFields }}>
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
  return <Scanner onScan={(result) => handleOnScan(result)} />;
}

function PayThroughSolana_Pay({ payCrypto }: { payCrypto: PaymentUIState }) {
  return (
    <Box sx={{ p: 3 }}>
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
      <Box sx={{ p: 3 }}>
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
      <Box sx={{ p: 3 }}>
        {/* Header for the form */}
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

export { PayProvider, usePay, PayUI };
/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Grid,
  Typography,
  Button,
  Box,
  CircularProgress,
  TextField,
} from '@mui/material';
import { Cancel, Home, Send } from '@mui/icons-material';
import React from 'react';
import { PaymentUIState } from '../PayContext';
import { Scanner } from '@yudiel/react-qr-scanner';

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
          style={{ marginLeft: '16px', transform: 'translateY(-4px)' }}
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
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
            }}
          >
            <img
              src="/pyusd.png"
              alt="PYUSD"
              style={{
                width: '24px',
                marginRight: '8px',
                transform: 'translateY(5px)',
              }}
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
            {!payCrypto.hash && (
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
            )}
            <Button
              color="inherit"
              variant="contained"
              onClick={async () => {
                if (payCrypto.reset) payCrypto.reset();
              }}
              endIcon={payCrypto.hash ? <Home /> : <Cancel />}
            >
              {payCrypto.hash ? 'Home' : 'Cancel'}
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
                style={{
                  width: '24px',
                  marginRight: '8px',
                  transform: 'translateY(5px)',
                }}
              />
              {'PYUSD'} ({payCrypto.tokenAddress})
            </Typography>
          </Grid>

          {/* Token Amount */}
          <Grid item xs={12} marginTop={'10px'}>
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
              {!payCrypto.hash && (
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
              )}
              <Button
                color="inherit"
                variant="contained"
                onClick={async () => {
                  if (payCrypto.reset) payCrypto.reset();
                }}
                endIcon={payCrypto.hash ? <Home /> : <Cancel />}
              >
                {payCrypto.hash ? 'Home' : 'Cancel'}
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
          Pay Fiat Using Ripe
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
                    style={{
                      width: '24px',
                      marginRight: '8px',
                      transform: 'translateY(5px)',
                    }}
                  />
                  {'PYUSD'} ({payCrypto.tokenAddress})
                </Typography>
              </Grid>

              {/* Fiat Amount */}
              <Grid item xs={6} marginTop={'10px'}>
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
              <Grid item xs={6} marginTop={'10px'}>
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
                  {!payCrypto.hash && (
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
                  )}
                  <Button
                    color="inherit"
                    variant="contained"
                    onClick={async () => {
                      if (payCrypto.reset) payCrypto.reset();
                    }}
                    endIcon={payCrypto.hash ? <Home /> : <Cancel />}
                  >
                    {payCrypto.hash ? 'Home' : 'Cancel'}
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

export {
  PayThroughSolana_Pay,
  PayThroughSolanaTransfer,
  PayThroughRipeFiat,
  QRScanner,
};

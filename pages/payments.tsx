import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Link,
} from '@mui/material';
import { usePortal } from 'portal-sol-pay-package';
import { useSnackbar } from '@/providers/snackbar';
import { FiatInfo, PaymentTransaction, usePay } from 'portal-sol-pay-package';

export default function Home() {
  const portal = usePortal();
  const snackbar = useSnackbar();
  const payCrypto = usePay();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const txns = await payCrypto.getPaymentTransactions();
      console.log(txns);
      setTransactions(txns);
    } catch (e) {
      snackbar.setSnackbarOpen(true);
      snackbar.setSnackbarContent({
        severity: 'error',
        message: `Something went wrong - ${e}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (portal.ready) {
      loadTransactions();
    }
  }, [portal.ready]);

  const renderFiatInfo = (fiatInfo: FiatInfo) => (
    <>
      {fiatInfo.fiatAmount && fiatInfo.fiatCurrency && (
        <>
          <Typography component="span" variant="body2" color="text.primary">
            Fiat Amount: {fiatInfo.fiatAmount} {fiatInfo.fiatCurrency}
          </Typography>
          <br />
        </>
      )}
      {fiatInfo.netsAcc && (
        <>
          <Typography component="span" variant="body2" color="text.primary">
            NETS Account: {fiatInfo.netsAcc}
          </Typography>
          <br />
        </>
      )}
      {fiatInfo.uen && (
        <>
          <Typography component="span" variant="body2" color="text.primary">
            UEN: {fiatInfo.uen}
          </Typography>
          <br />
        </>
      )}
      {fiatInfo.phoneNumber && (
        <>
          <Typography component="span" variant="body2" color="text.primary">
            Phone Number: {fiatInfo.phoneNumber}
          </Typography>
          <br />
        </>
      )}
    </>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '70vh',
        overflow: 'auto',
        background: 'white',
        borderRadius: '20px',
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 4,
        }}
      >
        <Box
          sx={{
            p: { xs: 2, md: 4 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Payment Transactions
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : transactions.length > 0 ? (
            <List>
              {transactions.map((tx, index) => (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Typography
                          variant="h6"
                          color="primary"
                          sx={{
                            '& a': {
                              textDecoration: 'none',
                              transition: 'text-decoration 0.3s',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            },
                          }}
                        >
                          <Link
                            href={`https://solscan.io/tx/${tx.transaction.transaction.signatures[0]}`}
                            sx={{
                              color: 'inherit',
                            }}
                          >
                            {tx.memoInfo.description}
                          </Link>
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            Pay Type: {tx.memoInfo.payType}
                          </Typography>
                          <br />
                          {tx.memoInfo.payType === 'RIPE_FIAT' &&
                            tx.memoInfo.fiatInfo && (
                              <>
                                {renderFiatInfo(tx.memoInfo.fiatInfo)}
                                <br />
                              </>
                            )}
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            To: {tx.memoInfo.to}
                          </Typography>
                          <br />
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            Token: {tx.memoInfo.tokenAddress}
                          </Typography>
                          <br />
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            Amount: {tx.memoInfo.tokenAmount}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <Chip
                      label={new Date(
                        tx.transaction.blockTime! * 1000,
                      ).toLocaleString()}
                      variant="outlined"
                      size="small"
                      sx={{ alignSelf: 'flex-start', mt: 1 }}
                    />
                  </ListItem>
                  {index < transactions.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" sx={{ p: 2 }}>
              No transactions found.
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}

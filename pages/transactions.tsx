/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { ITokenBalance, usePortal } from '@/providers/portal';
import React, { useEffect, useState } from 'react';
import { Box, Container } from '@mui/material';
import { useSnackbar } from '@/providers/snackbar';
import { usePay } from '@/providers/PayContext';

export default function Home() {
  const portal = usePortal();
  const snackbar = useSnackbar();
  const payCrypto = usePay();

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const txns = payCrypto.getPaymentTransactions();
      // setTransactions(txns);
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
    loadTransactions();
  }, [portal.ready]);

  return (
    <Box
      sx={{
        p: 4,
        display: 'flex',
        justifyContent: 'center',
        placeItems: 'start',
        minHeight: '65vh',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            p: { md: 8 },
            py: { xs: 8, md: 16 },
            display: 'flex',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '20px',
          }}
        ></Box>
      </Container>
    </Box>
  );
}

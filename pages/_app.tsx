import React from 'react';
import Layout from '@/components/Layout';
import { SnackbarProvider } from '@/providers/snackbar';
import { themeV1 } from '@/theme/v1';
import { ThemeProvider } from '@mui/material';
import type { AppProps } from 'next/app';
import { PortalProvider, PayProvider } from 'portal-sol-pay-package';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PortalProvider>
      <PayProvider>
        <ThemeProvider theme={themeV1}>
          <SnackbarProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </SnackbarProvider>
        </ThemeProvider>
      </PayProvider>
    </PortalProvider>
  );
}

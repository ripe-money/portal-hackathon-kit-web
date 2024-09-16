import { usePay, PayUI } from 'universal-qr-scanner';
import { Box } from '@mui/material';
import React from 'react';

const Scan = () => {
  const payCrypto = usePay();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        placeItems: 'start',
        height: '600px',
      }}
    >
      <PayUI payCrypto={payCrypto} />
    </Box>
  );
};

export default Scan;

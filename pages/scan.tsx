import { Box } from '@mui/material';
import { usePay, PayUI } from '../providers/PayContext';
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

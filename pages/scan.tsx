import { Button } from '@mui/material';
import { usePay, QRScanner } from '../providers/PayContext';
import { Pending, Send } from '@mui/icons-material';
import React, { useState } from 'react';

const Scan = () => {
  const { pay, decode } = usePay();
  const [paying] = useState(false);

  return (
    <div>
      <QRScanner decode={decode} />
      <Button
        color="inherit"
        variant="outlined"
        onClick={async () => {
          if (!pay) return;
          pay();
        }}
        endIcon={paying ? <Pending /> : <Send />}
      >
        Pay
      </Button>
    </div>
  );
};

export default Scan;

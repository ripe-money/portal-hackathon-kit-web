import { usePay, PayUI } from '../providers/PayContext';
import React from 'react';

const Scan = () => {
  const payCrypto = usePay();

  return (
    <div>
      <PayUI payCrypto={payCrypto} />
    </div>
  );
};

export default Scan;

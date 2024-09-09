import { usePay, PayUI } from 'portal-sol-pay-package';
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

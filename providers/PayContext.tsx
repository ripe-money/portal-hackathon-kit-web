import React, { useContext, createContext, useReducer, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { usePortal } from './portal';
import { parseURL, TransferRequestURL } from '@solana/pay';

interface PaymentInfo {
  chainId: string;
  to: string;
  from: string;
  tokenAddress: string;
  tokenAmount: number;
  payType: 'SOLANA_PAY' | 'FIAT';
  memo?: string;
  fiatAmount?: number;
  fiatCurrency?: 'SGD' | 'PESO' | 'IDR' | 'BHT';
  pay?: () => void;
  decode?: (rawQRData: string) => void;
}

const initialState: PaymentInfo = {
  chainId: process.env.solanaChainId || '',
  to: '',
  from: '',
  tokenAddress: '',
  tokenAmount: 0,
  payType: 'SOLANA_PAY',
  memo: '',
  fiatAmount: 0,
};

type ACTIONTYPE =
  | { type: 'initiate'; payload: number }
  | { type: 'pay'; payload: PaymentInfo }
  | { type: 'decode'; payload: PaymentInfo };

const PayContext = createContext(initialState);

function reducer(state: PaymentInfo, action: ACTIONTYPE) {
  switch (action.type) {
    case 'initiate':
      return {
        ...state,
      };
    case 'pay':
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

  async function pay() {
    if (!state) return;

    console.log({ ...state });

    console.log(state.to, state.tokenAddress, state.tokenAmount);
    const hash = await portal.sendTokensOnSolana(
      state.to,
      state.tokenAddress,
      state.tokenAmount,
    );
    console.log(hash);
  }

  useEffect(() => {
    console.log({ ...state });
  }, [state]);

  async function decode(rawQRData: string) {
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
      //temporarily convert solana: to https:// so that we can use new URL.
      try {
        // const modifiedUrl = rawQRData.replace('solana:', 'https://');
        // console.log(modifiedUrl);
        // const parsedUrl = new URL(modifiedUrl);
        // console.log(parsedUrl);
        // const toAddress = parsedUrl.host;
        // const params = new URLSearchParams(parsedUrl.search);
        // // Access specific parameters
        // const amount = params.get('amount'); // "1"
        // const splToken = params.get('spl-token'); // "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        // // const reference = params.get('reference'); // "72FrP58fnrD24Fo48jKR2PoyjjaTcKQJHM9inPV6TFGn"
        // // const label = params.get('label'); // "Solana Pay"

        // dispatch({
        //   type: 'decode',
        //   payload: {
        //     ...state,
        //     to: toAddress,
        //     tokenAmount: Number(amount),
        //     tokenAddress: splToken || '',
        //     payType: 'SOLANA_PAY',
        //   },
        // });
        const payParams = parseURL(rawQRData);

        if (!isTransferRequestURL(payParams)) return;

        console.log({
          ...state,
          to: payParams?.recipient.toString(),
          tokenAmount: Number(payParams?.amount),
          tokenAddress: payParams?.splToken?.toString() || '',
          payType: 'SOLANA_PAY',
        });
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
        console.error('invalid qr code: ', error);
      }
    }
  }

  function isTransferRequestURL(obj: unknown): obj is TransferRequestURL {
    return typeof obj === 'object' && obj !== null && 'recipient' in obj;
  }

  return (
    <PayContext.Provider value={{ ...state, pay, decode }}>
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

function QRScanner({ decode }: { decode?: (rawQRData: string) => void }) {
  // @ts-expect-error unsure what type is expected
  function handleOnScan(result) {
    if (!decode) return;

    decode(result?.[0].rawValue || '');
  }
  return <Scanner onScan={(result) => handleOnScan(result)} />;
}

export { PayProvider, usePay, QRScanner };

//solana pay code
// const payParams = parseURL(rawQRData);

// if(!isTransferRequestURL(payParams)) return;

// console.log(
//   {
//     ...state,
//     to:payParams?.recipient.toString(),
//     tokenAmount:Number(payParams?.amount),
//     tokenAddress:payParams?.splToken?.toString() || '',
//     payType:"SOLANA_PAY",
//   }
// )
// dispatch({
//   type:'decode',
//   payload:{
//     ...state,
//     to:payParams?.recipient.toString(),
//     tokenAmount:Number(payParams?.amount),
//     tokenAddress:payParams?.splToken?.toString() || '',
//     payType:"SOLANA_PAY",
//   }
// })

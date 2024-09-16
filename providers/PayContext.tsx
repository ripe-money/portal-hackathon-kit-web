/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useContext, createContext, useReducer, useEffect } from 'react';
import { usePortal } from './portal';
import { parseURL } from '@solana/pay';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import {
  encrypt,
  decrypt,
  extractPayNowInfo,
  isTransferRequestURL,
  isParsedInstruction,
  getRecipientAddress,
  getTransactionAmount,
} from './utils/helperFunctions';
import {
  PayThroughSolana_Pay,
  PayThroughSolanaTransfer,
  PayThroughRipeFiat,
  QRScanner,
} from './utils/payUI';

const PYUSDAddress =
  process.env.pyUsdMint || 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM';
const MemoPrefix = 'Ripe:';
const RIPE_ADDRESS = 'Cve1SAJDWSS3FSLU8pu5nLn8nsKZyGaKUystwWb9xpWy';
type PayType = 'SOLANA_ADDRESS' | 'SOLANA_PAY' | 'RIPE_FIAT' | null;
export interface PaymentInfo {
  chainId: string;
  to: string;
  from: string;
  tokenAddress: string;
  tokenAmount: number;
  payType: PayType;
  memo: string;
  hash: string;
  pay: () => void;
  decode: (rawQRData: string) => void;
  reset?: () => void;
  updateFields?: ({
    tokenAmount,
    memo,
    fiatAmount,
  }: {
    tokenAmount?: number;
    memo?: string;
    fiatAmount?: number;
  }) => void;
  getPaymentTransactions: () => Promise<PaymentTransaction[]>;
}

export interface FiatInfo {
  fiatAmount?: number;
  fiatCurrency?: 'SGD' | 'PESO' | 'IDR' | 'BHT';
  netsAcc?: string;
  uen?: string;
  phoneNumber?: string;
}

export interface MemoInfo {
  description: string;
  payType: PayType;
  from: string;
  to: string;
  tokenAddress: string;
  tokenAmount: string | number;
  fiatInfo?: FiatInfo;
}

export interface PaymentUIState extends PaymentInfo, FiatInfo {
  isPayingLoading: boolean;
}

export interface PaymentTransaction {
  memoInfo: MemoInfo;
  transaction: ParsedTransactionWithMeta;
}

const initialState: PaymentUIState = {
  chainId: process.env.solanaChainId || '',
  to: '',
  from: '',
  tokenAddress: '',
  tokenAmount: 0,
  payType: null,
  memo: '',
  fiatAmount: 0,
  hash: '',
  isPayingLoading: false,
  pay: () => {},
  decode: (rawQRData: string) => {},
  getPaymentTransactions: () => Promise.resolve([]),
};

type ACTIONTYPE =
  | { type: 'initiate'; payload: PaymentUIState }
  | { type: 'setPayer'; payload: { from: string } }
  | { type: 'pay'; payload: PaymentUIState }
  | { type: 'decode'; payload: PaymentUIState }
  | { type: 'updateFields'; payload: PaymentUIState };

const PayContext = createContext(initialState);

function reducer(state: PaymentUIState, action: ACTIONTYPE) {
  switch (action.type) {
    case 'initiate':
      return {
        ...action.payload,
      };
    case 'setPayer':
      return {
        ...state,
        from: action.payload.from,
      };
    case 'pay':
      return {
        ...state,
        ...action.payload,
      };
    case 'updateFields':
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

  useEffect(() => {
    async function setPayerAfterInitiate() {
      const address = await portal.getSolanaAddress();

      dispatch({
        type: 'setPayer',
        payload: { from: address },
      });
    }

    if (!portal || !portal?.ready) return;
    setPayerAfterInitiate();
  }, [portal]);
  async function reset() {
    dispatch({
      type: 'initiate',
      payload: {
        ...initialState,
      },
    });
  }

  async function pay() {
    if (!state || !process.env.portalClientApiKey) return;

    dispatch({
      type: 'pay',
      payload: {
        ...state,
        isPayingLoading: true,
      },
    });

    // if (state.payType === 'RIPE_FIAT') return;
    const hash = await portal.sendTokensOnSolanaWithMemo(
      state.to,
      state.tokenAddress,
      state.tokenAmount,
      constructMemoWithEncryption(
        state.memo || 'no memo provided',
        process.env.portalClientApiKey,
      ),
    );

    dispatch({
      type: 'pay',
      payload: {
        ...state,
        isPayingLoading: false,
        hash,
      },
    });
  }

  async function updateFields(updatedFields: {
    tokenAmount?: number;
    memo?: string;
    fiatAmount?: number;
  }) {
    if (!state) return;

    dispatch({
      type: 'updateFields',
      payload: {
        ...state,
        ...updatedFields,
      },
    });
  }

  async function decode(rawQRData: string) {
    //if it is a solana pay qrcode

    if (rawQRData.substring(0, 7) === 'solana:') {
      try {
        const payParams = parseURL(rawQRData);

        if (!isTransferRequestURL(payParams)) return;

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
        console.error('invalid solana pay qr code: ', error);
      } finally {
        return;
      }
    }

    //if it is a Paynow qrcode
    if (
      rawQRData.toUpperCase().includes('PAYNOW') ||
      rawQRData.toUpperCase().includes('SGQR') ||
      rawQRData.toUpperCase().includes('SG.COM.NETS')
    ) {
      //Ripe services

      const { uen, phoneNumber, netsAccount } = extractPayNowInfo(rawQRData);
      console.log({ uen, phoneNumber, netsAccount });
      dispatch({
        type: 'decode',
        payload: {
          ...state,
          tokenAddress: PYUSDAddress,
          payType: 'RIPE_FIAT',
          uen: uen,
          phoneNumber,
          netsAcc: netsAccount,
          fiatCurrency: 'SGD',
          to: RIPE_ADDRESS,
        },
      });
      return;
    }

    //if it is a solana address, which is usually between 32-44 characters
    if (rawQRData.length >= 32 && rawQRData.length <= 44) {
      dispatch({
        type: 'decode',
        payload: {
          ...state,
          to: rawQRData,
          tokenAddress: PYUSDAddress,
          payType: 'SOLANA_ADDRESS',
        },
      });

      return;
    }
  }

  async function getPaymentTransactions() {
    if (!process.env.portalClientApiKey) return [];

    const paymentTransactions: PaymentTransaction[] = [];

    const transactions = await portal.getAllTransactions();
    if (!transactions || transactions.length === 0) return [];

    for (let i = 0; i < transactions?.length; i++) {
      const tx = transactions[i];
      if (!tx) continue;
      const instructions = tx.transaction.message.instructions;
      if (!instructions || instructions.length === 0) continue;

      for (let j = 0; j < instructions.length; j++) {
        const instruction = instructions[j];

        if (!isParsedInstruction(instruction)) continue;

        const memoEncodedText = instruction.parsed;
        const memoInfo = destructureMemoWithDecryption(
          memoEncodedText,
          process.env.portalClientApiKey,
        );

        if (!memoInfo) continue;

        if ('description' in memoInfo) {
          console.log(tx.transaction);
          console.log(
            tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58()),
          );
          paymentTransactions.push({
            memoInfo,
            transaction: tx,
          });
        }
      }
    }

    return paymentTransactions;
  }

  function constructMemoWithEncryption(description: string, apiKey: string) {
    const memoInfo: MemoInfo = {
      description,
      payType: state.payType,
      to: state.to,
      from: state.from,
      tokenAddress: state.tokenAddress,
      tokenAmount: state.tokenAmount,
    };
    if (state.payType === 'RIPE_FIAT') {
      memoInfo.fiatInfo = {
        fiatAmount: state.fiatAmount,
        fiatCurrency: state.fiatCurrency,
        netsAcc: state.netsAcc,
        uen: state.uen,
        phoneNumber: state.phoneNumber,
      };
    }
    return MemoPrefix + encrypt(JSON.stringify(memoInfo), apiKey);
  }

  function destructureMemoWithDecryption(memo: string, apiKey: string) {
    try {
      if (!memo || typeof memo !== 'string') return null;
      if (!memo.startsWith(MemoPrefix))
        throw new Error('This is not a payment transaction initiated by Ripe');

      const memoInfo = JSON.parse(decrypt(memo.substring(5), apiKey));
      if (!memoInfo?.description || !memoInfo?.payType)
        throw new Error('This is not a payment transaction initiated by Ripe');

      return memoInfo;
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  return (
    <PayContext.Provider
      value={{
        ...state,
        pay,
        decode,
        reset,
        updateFields,
        getPaymentTransactions,
      }}
    >
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

function PayUI({ payCrypto }: { payCrypto: PaymentUIState }) {
  switch (payCrypto.payType) {
    case 'SOLANA_ADDRESS':
      return <PayThroughSolanaTransfer payCrypto={payCrypto} />;
    case 'SOLANA_PAY':
      return <PayThroughSolana_Pay payCrypto={payCrypto} />;
    case 'RIPE_FIAT':
      return <PayThroughRipeFiat payCrypto={payCrypto} />;
    case null:
      return <QRScanner decode={payCrypto.decode} />;
    default:
      return <QRScanner decode={payCrypto.decode} />;
  }
}

export { PayProvider, usePay, PayUI };

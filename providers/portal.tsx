/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import Portal from '@portal-hq/web';
import pyusdThumb from '../public/pyusd.png';
import solanaThumb from '../public/solana.png';
import {
  ConfirmedSignatureInfo,
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

export interface ITokenBalance {
  balance: string;
  decimals: number;
  name: string;
  rawBalance: string;
  symbol: string;
  metadata: Record<string, unknown> & {
    tokenMintAddress: string;
  };
}

interface IPortalContext {
  ready: boolean;
  getSolanaAddress: () => Promise<string>;
  getSolanaTokenBalances: () => Promise<ITokenBalance[]>;
  sendTokensOnSolanaWithMemo: (
    to: string,
    tokenMint: string,
    tokenAmount: number,
    memo?: string,
  ) => Promise<string>;
  getAllTransactions: () => Promise<
    (ParsedTransactionWithMeta | null)[] | undefined
  >;
}

const PortalContext = createContext<IPortalContext>({} as IPortalContext);
export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const SOLANA_MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const [portal, setPortal] = useState<Portal>();

  useEffect(() => {
    setPortal(
      new Portal({
        apiKey: process.env.portalClientApiKey,
        autoApprove: true,
        rpcConfig: {
          [process.env.solanaChainId!]: process.env.solanaRpcUrl!,
        },
      }),
    );
  }, []);

  return (
    <PortalContext.Provider
      value={{
        ready: Boolean(portal && portal.ready),
        async getSolanaAddress() {
          if (!portal || !portal?.ready)
            throw new Error('Portal has not initialised');

          const walletExists = await portal.doesWalletExist();

          if (!walletExists) {
            await portal.createWallet();
          }

          const solAddress = await portal.getSolanaAddress();

          return solAddress;
        },
        async getSolanaTokenBalances() {
          const res = await fetch('/api/getSolanaAssets');
          const data = await res.json();

          if (data.error) throw new Error(data.error);

          const pyusdBalance: ITokenBalance = data.tokenBalances.find(
            (tb: ITokenBalance) =>
              tb.metadata.tokenMintAddress === process.env.pyusdMint,
          ) || {
            balance: '0',
            decimals: 6,
            name: 'PayPal USD',
            rawBalance: '0',
            symbol: 'PYUSD',
            metadata: {
              tokenMintAddress: process.env.pyusdMint,
            },
          };

          return [
            {
              balance: data.nativeBalance.balance,
              decimals: data.nativeBalance.decimals,
              name: data.nativeBalance.name,
              rawBalance: data.nativeBalance.rawBalance,
              symbol: data.nativeBalance.symbol,
              metadata: {
                tokenMintAddress: process.env.solMint,
                thumbnail: solanaThumb.src,
                ...data.nativeBalance.metadata,
              },
            },
            {
              ...pyusdBalance,
              metadata: {
                ...pyusdBalance.metadata,
                thumbnail: pyusdThumb.src,
              },
            },
            ...data.tokenBalances.filter(
              (tb: ITokenBalance) =>
                tb.metadata.tokenMintAddress !== process.env.pyusdMint,
            ),
          ];
        },
        async sendTokensOnSolanaWithMemo(
          to,
          tokenMint,
          tokenAmount,
          memo = 'No Memo Provided',
        ) {
          if (!portal || !portal?.ready)
            throw new Error('Portal has not initialised');

          const res = await fetch('/api/buildSolanaTransaction', {
            method: 'POST',
            body: JSON.stringify({
              to,
              token: tokenMint,
              amount: String(tokenAmount),
            }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);

          // Decode the transaction from returned data. From serialized to obj.
          const transaction = Transaction.from(
            Buffer.from(data.transaction, 'base64'),
          );

          // Create memo instruction
          const memoInstruction = new TransactionInstruction({
            keys: [],
            programId: new PublicKey(SOLANA_MEMO_PROGRAM_ID),
            data: Buffer.from(memo),
          });

          transaction.add(memoInstruction);

          // Serialize the updated transaction
          const serializedTransaction = transaction
            .serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            })
            .toString('base64');

          const txnHash = await portal.request({
            chainId: process.env.solanaChainId,
            method: 'sol_signAndSendTransaction',
            params: serializedTransaction,
          });

          return txnHash;
        },
        async getAllTransactions() {
          if (!portal || !portal?.ready)
            throw new Error('Portal has not initialised');
          const address = await portal.getSolanaAddress();

          if (!process.env.solanaRpcUrl || !address) return;

          const connection = new Connection(process.env.solanaRpcUrl);

          const pubKey = new PublicKey(address);
          let transactionList: (ParsedTransactionWithMeta | null)[] = [];

          try {
            // Get the list of signatures
            const signatures = await connection.getSignaturesForAddress(pubKey);
            // Fetch transactions one by one
            for (let i = 0; i < signatures.length; i++) {
              const tx = await connection.getParsedTransaction(
                signatures[i].signature,
                {
                  maxSupportedTransactionVersion: 0,
                },
              );
              transactionList.push(tx);
              console.log(
                `Fetched transaction ${i + 1} of ${signatures.length}`,
              );
            }

            // Filter out any null transactions
            transactionList = transactionList.filter(
              (tx): tx is ParsedTransactionWithMeta => tx !== null,
            );
            return transactionList;
          } catch (error) {
            console.error('Error fetching transactions:', error);
          }
          return [];
        },
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => useContext(PortalContext);

import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import Portal from '@portal-hq/web';

import pyusdThumb from '../public/pyusd.png';
import solanaThumb from '../public/solana.png';
// import {
//   Connection,
//   PublicKey,
//   SystemProgram,
//   Transaction,
// } from '@solana/web3.js';
// import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

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
  sendTokensOnSolana: (
    to: string,
    tokenMint: string,
    tokenAmount: number,
  ) => Promise<string>;
  // sendTokensOnSolanaWithMemo: (
  //   to: string,
  //   tokenMint: string,
  //   tokenAmount: number,
  //   memo: string,
  // ) => Promise<string>;
}

const PortalContext = createContext<IPortalContext>({} as IPortalContext);
export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
        async sendTokensOnSolana(to, tokenMint, tokenAmount) {
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
          console.log('sending token transaction', data);
          if (data.error) throw new Error(data.error);

          const txnHash = await portal.request({
            chainId: process.env.solanaChainId,
            method: 'sol_signAndSendTransaction',
            params: data.transaction,
          });

          return txnHash;
        },
        // async sendTokensOnSolanaWithMemo(to, tokenMint, tokenAmount, memo) {
        //   if (!portal || !portal?.ready)
        //     throw new Error('Portal has not initialised');

        //   const solAddress = await portal.getSolanaAddress();
        //   if (!solAddress) return;
        //   const fromPubkey = new PublicKey(solAddress);
        //   const toPubkey = new PublicKey(
        //     to, // Replace with the recipient's address
        //   );

        //   const connection = new Connection(
        //     `https://solana-devnet.g.alchemy.com/v2/${process.env.alchemyApiKey}`,
        //     'confirmed',
        //   );

        //   // Get the token account of the sender address
        //   const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        //     connection,
        //     fromPubkey,
        //     new PublicKey(tokenMint),
        //     senderWallet.publicKey,
        //   );

        //   // Get the token account of the recipient address
        //   const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        //     connection,
        //     senderWallet,
        //     new PublicKey(tokenMint),
        //     new web3.PublicKey(recipientAddress),
        //   );

        //   const instructions = [
        //     SystemProgram.transfer({
        //       fromPubkey,
        //       toPubkey,
        //       lamports: 1_000_000,
        //     }),
        //   ];

        //   // Create a token transfer instruction
        //   const transferInstruction = transfer(
        //     fromTokenAccount.address,
        //     toTokenAccount.address,
        //     fromPubkey, // Authority to sign for the transfer
        //     1_000_000, // Amount of USDC to send (in lamports, 6 decimal places for USDC)
        //   );

        //   const res = await fetch('/api/buildSolanaTransaction', {
        //     method: 'POST',
        //     body: JSON.stringify({
        //       to,
        //       token: tokenMint,
        //       amount: String(tokenAmount),
        //     }),
        //   });
        //   const data = await res.json();

        //   if (data.error) throw new Error(data.error);

        //   const txnHash = await portal.request({
        //     chainId: process.env.solanaChainId,
        //     method: 'sol_signAndSendTransaction',
        //     params: data.transaction,
        //   });

        //   return txnHash;
        // },
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => useContext(PortalContext);

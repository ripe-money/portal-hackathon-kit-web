/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    portalClientApiKey: process.env.PORTAL_CLIENT_API_KEY,
    solMint: 'So11111111111111111111111111111111111111112',
    solanaChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Mainnet
    pyUsdMint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo', // Mainnet
    solanaRpcUrl:
      'https://mainnet.helius-rpc.com/?api-key=' + process.env.HELIUS_API_KEY, // Mainnet
    // solanaChainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',                //Dev net
    // pyUsdMint: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',               // Dev net
    // solanaRpcUrl: 'https://api.devnet.solana.com',                           // Dev net
  },
};

export default nextConfig;

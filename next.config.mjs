/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    portalClientApiKey: process.env.PORTAL_CLIENT_API_KEY,
    alchemyApiKey: process.env.ALCHEMY_API_KEY,
    solanaChainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    solMint: 'So11111111111111111111111111111111111111112',
    pyUsdMint: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',
    solanaRpcUrl: 'https://api.devnet.solana.com',
    pyUsdMainnet: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  },
};

export default nextConfig;

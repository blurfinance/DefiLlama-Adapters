const sdk = require("@defillama/sdk")
const abi = require('./abi')
const { getChainTransform } = require('../helper/portedTokens')
const chain = 'bsc'
const { getLPData, getTokenPrices, } = require('../helper/unknownTokens')
let totalTvl


const contract = '0xf300b9171aAb493F4584b8f5601d97E627AaB451'
const sushi = '0x4165084A6e5388ce53c9D9892f904a2712Dd943A'
const busd = '0x66e428c3f67a68878562e79a0234c1f83c208770'

async function gettotalTvl(block) {
  if (!totalTvl) totalTvl = getTVL()
  return totalTvl

  async function getTVL() {
    const transform = await getChainTransform(chain)
    const balances = {
      tvl: {},
    }
    const { output: length } = await sdk.api.abi.call({
      target: contract,
      abi: abi.poolLength,
      chain, block,
    })

    const calls = []
    for (let i = 0; i < length; i++) calls.push({ params: [i] })
    const { output: data } = await sdk.api.abi.multiCall({
      target: contract,
      abi: abi.poolInfo2,
      calls,
      chain, block,
    })

    const tempBalances = {}
    const lps = []

    data.forEach(({ output }) => {
      const token = output.lpToken.toLowerCase()
      const amount = output.amount0
      sdk.util.sumSingleBalance(tempBalances, token, amount)
      lps.push(token)
    })
    const pairs = await getLPData({ lps, chain, block })

    const { updateBalances, } = await getTokenPrices({ lps: Object.keys(pairs), allLps: true, coreAssets: [busd], block, chain, minLPRatio: 0.001 })

    Object.entries(tempBalances).forEach(([token, balance]) => {
      sdk.util.sumSingleBalance(balances.tvl, transform(token), balance)
    })

    await updateBalances(balances.tvl)

    return balances
  }
}

async function tvl(_, _b, { [chain]: block }) {
  return (await gettotalTvl(block)).tvl
}



module.exports = {
  bsc: {
    tvl,
  }
}
/**
 * @notice we are going to get Wrapped ETH from the contract
 * we just have to deposit ETH and get WETH
 */

const { getNamedAccounts, ethers } = require("hardhat")
const { wethTokenAddress, amount } = require("../helper-hardhat-config")

async function getWeth() {
  const { deployer } = await getNamedAccounts()

  // call the "deposit" function on the weth contract
  // get ABI and Contract Address

  // Get a contract from a specific address
  const iWeth = await ethers.getContractAt("IWeth", wethTokenAddress, deployer)
  const tx = await iWeth.deposit({
    value: amount,
  })

  await tx.wait(1)
  const wethBalance = await iWeth.balanceOf(deployer)
  console.log(`WETH BALANCE: ${wethBalance.toString()} `)
}

module.exports = { getWeth }

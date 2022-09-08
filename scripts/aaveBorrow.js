/**
 * @notice the aave protocol treats everything as an ERC20 token
 * The token WrappedETH is basically ETH wrapped in a ERC20 contract
 * @notice here we interact with the aave protocol
 * we will deposit WETH as collateral and borrow DAI
 * @dev we need a contract (LendingPoolAddressProvider) to get another contract
 * (LendinPool) address
 */

const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth } = require("./getWeth")
const {
  daiEthPriceFeedAddress,
  daiTokenAddress,
  wethTokenAddress,
  amount,
} = require("../helper-hardhat-config")

async function main() {
  await getWeth()
  const { deployer } = await getNamedAccounts()
  const lendingPool = await getLendingPool(deployer)

  // now we can make our deposit
  // but first we have to approve aave to have access to our tokens
  // we want the lending pool to have the permission to pull token from our account

  await approveErc20(wethTokenAddress, lendingPool.address, amount, deployer)
  console.log("Depositing...")
  await lendingPool.deposit(wethTokenAddress, amount, deployer, 0)
  console.log("Deposited!")

  // Before borrowing  we need to know: how much we have borrowed and how much we can borrow
  let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(
    lendingPool,
    deployer
  )

  const daiPrice = await getDaiPrice()
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
  console.log(`You can borrow ${amountDaiToBorrow} DAI`)
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  )

  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
  await getBorrowUserData(lendingPool, deployer)

  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
  await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveErc20(daiAddress, lendingPool.address, amount, account)
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
  await repayTx.wait(1)
  console.log("Repaid!")
}

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowWei,
    1,
    0,
    account
  )
  await borrowTx.wait(1)
  console.log("Success! You borrowed DAI!")
}

async function getDaiPrice() {
  // note: we don't have to connect any account
  // we are just reading, not modifying any state
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    daiEthPriceFeedAddress
  )

  const [_, answer] = await daiEthPriceFeed.latestRoundData()
  return answer
}

async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account)

  console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
  console.log(`Your have ${totalDebtETH} worth of ETH borrowed`)
  console.log(`You have ${availableBorrowsETH} worth of ETH available`)

  return { totalCollateralETH, totalDebtETH, availableBorrowsETH }
}

async function getLendingPool(account) {
  // lending pool address provider
  // 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  )

  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  )
  return lendingPool
}

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20 = await ethers.getContractAt("IERC20", erc20Address, account)
  const tx = await erc20.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log("ERC20 Approved!")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })

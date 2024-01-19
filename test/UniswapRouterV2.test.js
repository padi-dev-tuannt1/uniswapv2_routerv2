const { ethers } = require("hardhat");
const { expect } = require("chai");
const uniswapV2Factory = require("../abis/UniswapV2Factory.json");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("UniswapV2Router02", () => {
  let uniswapV2FactoryContract;
  let uniswapV2RouterV2;
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let impersonateAddress = "0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b";
  let uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  let feeRecipient = "0xe42B1F6BE2DDb834615943F2b41242B172788E7E";
  let fee = 50; //0.5%
  let path = [wethAddress, "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"]; // WETH,UNI
  let uniToken;
  let impersonate;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAddress],
    });
    impersonate = await ethers.getSigner(impersonateAddress);
    uniswapV2FactoryContract = await ethers.getContractAt(
      uniswapV2Factory.abi,
      uniswapV2FactoryAddress
    );
    const uniswapRouterV2 = await hre.ethers.getContractFactory(
      "UniswapV2Router02"
    );
    uniswapV2RouterV2 = await uniswapRouterV2.deploy(
      uniswapV2FactoryContract.address,
      wethAddress,
      feeRecipient,
      fee
    );
    uniToken = await ethers.getContractAt(
      "ERC20",
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
    );
  });

  it("Swap ETH for exact token fail if invalid path", async () => {
    const invalidPath = [
      ethers.constants.AddressZero,
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    ]; // WETH,UNI
    const quote = await uniswapV2RouterV2.getAmountsOut(
      ethers.utils.parseEther("0.01"),
      path
    );
    const amountOut = quote[1];
    await expect(
      uniswapV2RouterV2.swapETHForExactTokens(
        amountOut,
        invalidPath,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999),
        { value: ethers.utils.parseEther("0.01") }
      )
    ).revertedWith("UniswapV2Router: INVALID_PATH");
  });

  it("Swap ETH for Exact Token fail if you don't have enough money to swap", async () => {
    const quote = await uniswapV2RouterV2.getAmountsOut(
      ethers.utils.parseEther("0.01"),
      path
    );
    const amountOut = quote[1];
    await expect(
      uniswapV2RouterV2.swapETHForExactTokens(
        amountOut,
        path,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999),
        { value: ethers.utils.parseEther("0.009") }
      )
    ).revertedWith("UniswapV2Router: EXCESSIVE_INPUT_AMOUNT");
  });

  it("Swap ETH for Exact Token successfully", async () => {
    const balanceBefore = await uniToken.balanceOf(impersonateAddress);
    const quote = await uniswapV2RouterV2.getAmountsOut(
      ethers.utils.parseEther("0.01"),
      path
    );
    const amountOut = quote[1];
    await uniswapV2RouterV2.swapETHForExactTokens(
      amountOut,
      path,
      impersonateAddress,
      ethers.BigNumber.from(9999999999999),
      { value: ethers.utils.parseEther("0.01") }
    );
    const balanceAfter = await uniToken.balanceOf(impersonateAddress);
    expect(balanceAfter - balanceBefore).to.greaterThan(0);

    expect(
      (await ethers.provider.getBalance(feeRecipient)).toNumber()
    ).to.greaterThan(0);
  });

  it("Swap token for exact ETH fail if invalid path", async () => {
    const invalidPath = [
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      ethers.constants.AddressZero,
    ]; // WETH,UNI

    await expect(
      uniswapV2RouterV2.swapTokensForExactETH(
        ethers.utils.parseEther("0.01"),
        0,
        invalidPath,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999)
      )
    ).revertedWith("UniswapV2Router: INVALID_PATH");
  });

  it("Swap token for exact ETH fail if not enough token", async () => {
    const path2 = ["0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", wethAddress];
    await expect(
      uniswapV2RouterV2.swapTokensForExactETH(
        ethers.utils.parseEther("0.01"),
        0,
        path2,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999)
      )
    ).revertedWith("UniswapV2Router: EXCESSIVE_INPUT_AMOUNT");
  });

  it("Swap token for exact ETH successfully", async () => {
    const path3 = ["0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", wethAddress];
    const quote = await uniswapV2RouterV2.getAmountsOut(
      ethers.utils.parseEther("0.1"),
      path3
    );
    const amountOut = quote[1];
    await uniToken
      .connect(impersonate)
      .approve(uniswapV2RouterV2.address, ethers.utils.parseEther("0.1"));

    await uniswapV2RouterV2
      .connect(impersonate)
      .swapTokensForExactETH(
        amountOut,
        ethers.utils.parseEther("0.1"),
        path3,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999)
      );
  });

  it("Swap token for exact token fail if not enough token", async () => {
    const path4 = [uniToken.address, wethAddress];
    await expect(
      uniswapV2RouterV2.swapTokensForExactTokens(
        ethers.utils.parseEther("0.01"),
        0,
        path4,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999)
      )
    ).revertedWith("UniswapV2Router: EXCESSIVE_INPUT_AMOUNT");
  });

  it("Swap token for exact token succesfully", async () => {
    const path4 = [uniToken.address, wethAddress];
    const quote = await uniswapV2RouterV2.getAmountsOut(
      ethers.utils.parseEther("0.01"),
      path4
    );
    const amountOut = quote[1];
    await uniToken
      .connect(impersonate)
      .approve(uniswapV2RouterV2.address, ethers.utils.parseEther("0.01"));
    await uniswapV2RouterV2
      .connect(impersonate)
      .swapTokensForExactTokens(
        amountOut,
        ethers.utils.parseEther("0.01"),
        path4,
        impersonateAddress,
        ethers.BigNumber.from(9999999999999)
      );
  });
});

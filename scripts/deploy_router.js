const hre = require("hardhat");

async function main() {
    const uniswapRouterV2 = await hre.ethers.getContractFactory("UniswapV2Router02");
    const uniswapRouterContract = await uniswapRouterV2.deploy("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", "0xe42B1F6BE2DDb834615943F2b41242B172788E7E", 50)
    //////////////////////////////////////////////////////////////factory                                      //weth                                      //feeRecipient                                //fee 0.5%               
    console.log(uniswapRouterContract.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
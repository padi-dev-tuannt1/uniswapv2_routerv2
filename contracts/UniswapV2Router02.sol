pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import './interfaces/IUniswapV2Router01.sol';
import './libraries/UniswapV2Library.sol';
import './libraries/SafeMath.sol';
import './interfaces/IERC20.sol';
import './interfaces/IWETH.sol';

contract UniswapV2Router02 is IUniswapV2Router01, Ownable {
    using SafeMath for uint;

    address public immutable override factory;
    address public immutable override WETH;
    address feeRecipient;
    uint256 fee;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'UniswapV2Router: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH, address _feeRecipient, uint256 _fee) public {
        factory = _factory;
        WETH = _WETH;
        feeRecipient = _feeRecipient;
        fee = _fee;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = UniswapV2Library.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;
            IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        uint256 feeSwap = amountIn.mul(fee) / 10000;
       
        amounts = UniswapV2Library.getAmountsOut(factory, amountIn - feeSwap, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');

        bool success = IERC20(path[0]).transferFrom(msg.sender, feeRecipient, feeSwap);
        require(success, 'Fee transfer failed');
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            UniswapV2Library.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);
        uint256 feeSwap = _calculateFeeSwap(amounts[0]);
        require(amounts[0] + feeSwap <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
        bool success = IERC20(path[0]).transferFrom(msg.sender, feeRecipient, feeSwap);
        require(success, 'Fee transfer failed');

        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            UniswapV2Library.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable virtual override ensure(deadline) returns (uint[] memory amounts) {
        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');
        uint256 feeSwap = msg.value.mul(fee) / 10000;
        (bool sent, ) = feeRecipient.call{value: feeSwap}('');
        require(sent, 'Failed to send Ether');
        amounts = UniswapV2Library.getAmountsOut(factory, msg.value - feeSwap, path);

        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
    }

    function swapTokensForExactETH(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);

        uint256 feeSwap = _calculateFeeSwap(amounts[0]);
        require(amounts[0] + feeSwap <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
   
        bool success = IERC20(path[0]).transferFrom(msg.sender, feeRecipient, feeSwap);
        require(success, 'Fee transfer failed');
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            UniswapV2Library.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');
        uint256 feeSwap = amountIn.mul(fee) / 10000;
        bool success = IERC20(path[0]).transferFrom(msg.sender, feeRecipient, feeSwap);
        require(success, 'Fee transfer failed');

        amounts = UniswapV2Library.getAmountsOut(factory, amountIn - feeSwap, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0],
            msg.sender,
            UniswapV2Library.pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }

    function swapETHForExactTokens(
        uint amountOut,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable virtual override ensure(deadline) returns (uint[] memory amounts) {
        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);
        uint256 feeSwap = _calculateFeeSwap(amounts[0]);
        (bool sent, ) = feeRecipient.call{value: feeSwap}('');
        require(sent, 'Failed to send Ether');

        require(amounts[0] + feeSwap <= msg.value, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        // refund dust eth, if any
        if (msg.value > amounts[0] + feeSwap)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amounts[0] - feeSwap);
    }

    // **** LIBRARY FUNCTIONS ****
    function quote(uint amountA, uint reserveA, uint reserveB) public view virtual override returns (uint amountB) {
        return UniswapV2Library.quote(amountA - _calculateFeeSwap(amountA), reserveA, reserveB);
    }

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) public view virtual override returns (uint amountOut) {
        return UniswapV2Library.getAmountOut(amountIn - _calculateFeeSwap(amountIn), reserveIn, reserveOut);
    }

    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) public view virtual override returns (uint amountIn) {
        amountIn = UniswapV2Library.getAmountIn(amountOut, reserveIn, reserveOut);
        return amountIn + _calculateFeeSwap(amountIn);
    }

    function getAmountsOut(
        uint amountIn,
        address[] memory path
    ) public view virtual override returns (uint[] memory amounts) {
        return UniswapV2Library.getAmountsOut(factory, amountIn - _calculateFeeSwap(amountIn), path);
    }

    function getAmountsIn(
        uint amountOut,
        address[] memory path
    ) public view virtual override returns (uint[] memory amounts) {
        return UniswapV2Library.getAmountsIn(factory, amountOut, path);
    }

    function _calculateFeeSwap(uint256 _amount) private view returns (uint256) {
        return _amount.mul(fee) / (10000 - fee);
    }

    function setFee(uint256 _fee) external onlyOwner {
        require(_fee < 10000, 'Invalid fee');
        fee = _fee;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), 'Recipient cannot be zero address');
        feeRecipient = _recipient;
    }
}

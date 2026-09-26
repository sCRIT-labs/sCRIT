// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/// @notice Escrowed limit order book for testnet Rail B lots, quoted only in sCRIT.
contract LotMarketplace is ReentrancyGuard, ERC1155Holder {
    using SafeERC20 for IERC20;

    enum Side { Ask, Bid }
    struct Order {
        address maker;
        uint256 lotId;
        uint128 remaining;
        uint128 pricePerFraction;
        uint64 expiry;
        Side side;
        bool active;
    }

    IERC20 public immutable scrit;
    IERC1155 public immutable lots;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    event OrderPlaced(uint256 indexed orderId, address indexed maker, uint256 indexed lotId, Side side, uint256 fractions, uint256 pricePerFraction, uint64 expiry);
    event OrderMatched(uint256 indexed askId, uint256 indexed bidId, uint256 lotId, uint256 fractions, uint256 pricePerFraction, address seller, address buyer);
    event OrderCancelled(uint256 indexed orderId, address indexed maker, uint256 remaining);

    constructor(address scritToken, address lotToken) {
        require(scritToken != address(0) && lotToken != address(0), "zero address");
        scrit = IERC20(scritToken);
        lots = IERC1155(lotToken);
    }

    function placeAsk(uint256 lotId, uint128 fractions, uint128 price, uint64 expiry)
        external nonReentrant returns (uint256 id)
    {
        require(fractions > 0 && price > 0 && expiry > block.timestamp, "invalid order");
        lots.safeTransferFrom(msg.sender, address(this), lotId, fractions, "");
        id = _store(Order(msg.sender, lotId, fractions, price, expiry, Side.Ask, true));
    }

    function placeBid(uint256 lotId, uint128 fractions, uint128 price, uint64 expiry)
        external nonReentrant returns (uint256 id)
    {
        require(fractions > 0 && price > 0 && expiry > block.timestamp, "invalid order");
        scrit.safeTransferFrom(msg.sender, address(this), uint256(fractions) * price);
        id = _store(Order(msg.sender, lotId, fractions, price, expiry, Side.Bid, true));
    }

    function matchOrders(uint256 askId, uint256 bidId, uint128 fractions) external nonReentrant {
        Order storage ask = orders[askId];
        Order storage bid = orders[bidId];
        require(ask.active && bid.active && ask.side == Side.Ask && bid.side == Side.Bid, "orders unavailable");
        require(ask.lotId == bid.lotId && bid.pricePerFraction >= ask.pricePerFraction, "no price match");
        require(block.timestamp <= ask.expiry && block.timestamp <= bid.expiry, "order expired");
        require(fractions > 0 && fractions <= ask.remaining && fractions <= bid.remaining, "invalid fill");
        ask.remaining -= fractions;
        bid.remaining -= fractions;
        if (ask.remaining == 0) ask.active = false;
        if (bid.remaining == 0) bid.active = false;

        uint256 paid = uint256(fractions) * ask.pricePerFraction;
        uint256 priceImprovement = uint256(fractions) * (bid.pricePerFraction - ask.pricePerFraction);
        scrit.safeTransfer(ask.maker, paid);
        if (priceImprovement > 0) scrit.safeTransfer(bid.maker, priceImprovement);
        lots.safeTransferFrom(address(this), bid.maker, ask.lotId, fractions, "");
        emit OrderMatched(askId, bidId, ask.lotId, fractions, ask.pricePerFraction, ask.maker, bid.maker);
    }

    function cancelOrder(uint256 id) external nonReentrant {
        Order storage order = orders[id];
        require(order.active && order.maker == msg.sender, "not cancellable");
        order.active = false;
        uint128 remaining = order.remaining;
        order.remaining = 0;
        if (order.side == Side.Ask) lots.safeTransferFrom(address(this), msg.sender, order.lotId, remaining, "");
        else scrit.safeTransfer(msg.sender, uint256(remaining) * order.pricePerFraction);
        emit OrderCancelled(id, msg.sender, remaining);
    }

    function _store(Order memory order) private returns (uint256 id) {
        id = nextOrderId++;
        orders[id] = order;
        emit OrderPlaced(id, order.maker, order.lotId, order.side, order.remaining, order.pricePerFraction, order.expiry);
    }
}

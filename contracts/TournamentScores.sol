// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TournamentScores
 * @notice Write-once ledger of finished ft_transcendence tournaments.
 *
 * Integrity model
 * ---------------
 * The users service (the only account allowed to write, `owner`) records one entry per
 * finished tournament. The entry holds:
 *   - `resultHash`: keccak256 of the tournament's canonical result: the tournament key,
 *     winner, sorted player ids, and every match (player ids, scores, winner, timestamps).
 *     The canonical form is built by services/users/src/chain/canonical.ts. It uses
 *     pseudonymous numeric user ids and no names or emails, so no personal data goes on chain.
 *   - a few readable fields (winner id, player count, match count, end time) so a block
 *     explorer shows something meaningful without the off-chain data;
 *   - the block in which it was recorded, so the recording transaction can be found
 *     again with a one-block log query.
 *
 * Records are immutable: `recordTournament` reverts with `AlreadyRecorded` for an id that
 * exists, and no function can change or delete a record, not even the owner. Ownership can
 * be handed over, but a new owner can only add records for new ids.
 *
 * Verification: anyone recomputes the canonical hash from the application database and
 * compares it with `getTournament(id).resultHash` (or calls `verify`). If a score, winner
 * or player were changed in the database after recording, the hashes no longer match.
 * The chain proves the result has not changed since it was recorded. It does not prove the
 * result was correct when the owner recorded it, so the owner key must stay secret.
 */
contract TournamentScores {
    struct Record {
        bytes32 resultHash;
        uint64 winnerId;
        uint32 playerCount;
        uint32 matchCount;
        uint64 endedAt; // unix seconds, from the application
        uint64 recordedAt; // block timestamp
        uint64 blockNumber; // block that holds the TournamentRecorded event
    }

    address public owner;
    mapping(uint256 => Record) private records;
    uint256[] private recordedIds;

    event TournamentRecorded(
        uint256 indexed id,
        bytes32 indexed resultHash,
        uint64 winnerId,
        uint32 playerCount,
        uint32 matchCount,
        uint64 endedAt
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error AlreadyRecorded(uint256 id);
    error NotRecorded(uint256 id);
    error InvalidRecord();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Store a tournament result once. Reverts if `id` was already recorded.
    function recordTournament(
        uint256 id,
        bytes32 resultHash,
        uint64 winnerId,
        uint32 playerCount,
        uint32 matchCount,
        uint64 endedAt
    ) external onlyOwner {
        if (resultHash == bytes32(0) || playerCount == 0) revert InvalidRecord();
        if (records[id].resultHash != bytes32(0)) revert AlreadyRecorded(id);
        records[id] = Record({
            resultHash: resultHash,
            winnerId: winnerId,
            playerCount: playerCount,
            matchCount: matchCount,
            endedAt: endedAt,
            recordedAt: uint64(block.timestamp),
            blockNumber: uint64(block.number)
        });
        recordedIds.push(id);
        emit TournamentRecorded(id, resultHash, winnerId, playerCount, matchCount, endedAt);
    }

    /// @notice Hand the write permission to another account (key rotation).
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidRecord();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function isRecorded(uint256 id) external view returns (bool) {
        return records[id].resultHash != bytes32(0);
    }

    /// @notice The stored record. Reverts with `NotRecorded` for an unknown id.
    function getTournament(uint256 id) external view returns (Record memory) {
        Record memory r = records[id];
        if (r.resultHash == bytes32(0)) revert NotRecorded(id);
        return r;
    }

    /// @notice True when `resultHash` equals the recorded hash for `id`.
    function verify(uint256 id, bytes32 resultHash) external view returns (bool) {
        bytes32 stored = records[id].resultHash;
        return stored != bytes32(0) && stored == resultHash;
    }

    function tournamentCount() external view returns (uint256) {
        return recordedIds.length;
    }

    /// @notice Enumerate recorded ids in recording order (0-based index).
    function tournamentIdAt(uint256 index) external view returns (uint256) {
        return recordedIds[index];
    }
}

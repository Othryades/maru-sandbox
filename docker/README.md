# Linea + Rollup-Boost Integration POC

This POC demonstrates the successful integration of **Flashbots Rollup-Boost** ([GitHub](https://github.com/flashbots/rollup-boost)) with Linea's Maru consensus layer and Besu execution layer.

## Architecture

```
Maru (Consensus) → Rollup-Boost (Proxy) → Besu (Execution)
     :9080              :9551                 :9545/:9550
```

**Components:**
- **Maru**: Linea consensus client (latest: 2f9071c)
- **Rollup-Boost**: Flashbots block builder sidecar with op-alloy v0.22.0 fix
- **Besu**: Hyperledger Besu 25.10.0 execution layer

## Current Status

### ✅ **Working**
- **Continuous block production** - 100+ blocks produced and validated
- **Rollup-Boost proxy** - All Engine API and JSON-RPC calls forwarded correctly
- **No gasLimit errors** - Fixed with op-alloy v0.22.0 integration
- **Transaction submission** - Sub-30ms latency through Rollup-Boost
- **Complete stack operational** - Maru + Rollup-Boost + Besu integrated

### ⚠️ **Next Steps for Full Flashblocks**
- **Add op-rbuilder** - Block builder that generates Flashblocks every 200ms
- **WebSocket streaming** - Stream Flashblocks to clients for pre-confirmations
- **Test pre-confirmation receipts** - Validate 200ms pre-confirmation latency

## Quick Start

```bash
# Start the complete stack
CREATE_EMPTY_BLOCKS=true docker compose -f compose.poc.yaml up -d

# Check block production
curl -X POST http://localhost:9545 -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test Rollup-Boost proxy
curl -X POST http://localhost:9551 -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Testing

### Comprehensive POC Test
```bash
node test-final-poc.js
```

**Tests:**
- Block production continuity
- Rollup-Boost proxy functionality
- Transaction submission pathway
- JSON-RPC method forwarding

### Integration Test
```bash
./test-rollup-boost-poc.sh
```

## Configuration Files

- **`compose.poc.yaml`**: Complete stack configuration (based on Florian's feat/flashbot branch)
- **`maru/config.dev.toml`**: Maru configuration pointing to Rollup-Boost
- **`jwt`**: JWT secret for Engine API authentication
- **`initialization/`**: Genesis files with post-Prague configuration

## Technical Implementation

### Genesis Configuration
**All forks active from block 0:**
- `terminalTotalDifficulty: 0` (start directly in PoS)
- `shanghaiTime: 0` (active from genesis)
- `cancunTime: 0` (active from genesis)  
- `pragueTime: 0` (active from genesis)

**Why:** Linea is already post-Prague - no need for fork transitions.

### Rollup-Boost Build
**Custom build with op-alloy v0.22.0 fix:**

```toml
# Cargo.toml
reth-optimism-payload-builder = { git = "https://github.com/paradigmxyz/reth", rev = "e9400527cd687a890166a5d949ff57fc2a58f448" }
op-alloy-rpc-types-engine = "0.22.0"
op-alloy-consensus = "0.22.0"
op-alloy-rpc-types = "0.22.0"
op-alloy-network = "0.22.0"
```

**Build:** `docker build -t rollup-boost-working .`

### Key Issues Resolved

1. **gasLimit error** - Fixed with op-alloy v0.22.0 ([PR #603](https://github.com/alloy-rs/op-alloy/pull/603))
2. **Fork transition issues** - Resolved by starting directly in Prague
3. **Version conflicts** - Fixed by using specific reth commit with matching alloy versions
4. **JWT path issues** - Resolved by proper volume mounting

## Log Evidence

### Rollup-Boost Working (No gasLimit Errors)
```
INFO proxy::call: proxying request to rollup-boost server method="engine_forkchoiceUpdatedV3"
DEBUG request: forwarding eth_getBlockByNumber to l2
```

### Payload with gasLimit (Fix Confirmed)
```json
{
  "gasLimit": "0x1e92d37",
  "blockNumber": "0x44",
  "timestamp": "0x69038726"
}
```

## Resources

- [Flashbots Rollup-Boost](https://github.com/flashbots/rollup-boost)
- [Flashblocks Documentation](https://rollup-boost.flashbots.net/modules/flashblocks.html)
- [op-alloy Release v0.22.0](https://github.com/alloy-rs/op-alloy/releases/tag/v0.22.0)
- [Mikhail's fix guidance](https://github.com/alloy-rs/op-alloy/issues/601)

## Acknowledgments

Special thanks to:
- **Florian Huc** - Simplified configuration and Flashbots team coordination
- **Mikhail (Flashbots)** - Technical guidance on op-alloy integration
- **Flashbots team** - Quick response and fix for gasLimit issue

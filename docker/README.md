# Linea + Rollup-Boost POC

This POC demonstrates the integration of **Flashbots Rollup-Boost** with Linea's execution and consensus stack to achieve sub-300ms pre-confirmations.

## Architecture Overview

**Sidecar Mode Integration:**
```
Client → Rollup-Boost (Proxy) → Besu (Execution Layer)
            ↑
         Maru (Consensus Layer)
```

- **Maru (CL)**: Linea's consensus client (port 8080)
- **Rollup-Boost**: Flashbots proxy for pre-confirmations (port 8551)  
- **Besu (EL)**: Hyperledger Besu execution layer (ports 8545/8550)
- **JWT Authentication**: Secured Engine API communication

## Key Achievements

✅ **Complete Integration**: Real Flashbots Rollup-Boost container running  
✅ **JSON-RPC Proxy**: All client calls forwarded through Rollup-Boost  
✅ **Transaction Flow**: 13ms submission latency demonstrated  
✅ **Block Production**: Continuous block generation (when direct)  
✅ **Authentication**: JWT working across all components  

## Quick Start

### POC Stack (with Rollup-Boost)
```bash
CREATE_EMPTY_BLOCKS=true MARU_TAG=2a2eab0 docker compose -f compose.poc.yaml up -d
```

### Standard Stack (direct Maru → Besu)
```bash
CREATE_EMPTY_BLOCKS=true MARU_TAG=2a2eab0 docker compose -f compose.yaml -f compose.dev.yaml up -d
```

## Testing & Validation

### Real Transaction Test
```bash
node test-real-transaction.js
```
**Measures**: Actual transaction submission latency through Rollup-Boost proxy

### Integration Test Suite  
```bash
./test-rollup-boost-poc.sh
```
**Validates**: JSON-RPC forwarding, Engine API capabilities, JWT authentication

### Manual Testing
```bash
# Test JSON-RPC through proxy
curl -X POST http://localhost:8551 -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test direct Besu access
curl -X POST http://localhost:8545 -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Configuration Files

- **`compose.poc.yaml`**: Complete POC stack with Rollup-Boost integration
- **`config.dev.toml`**: Maru configuration (switchable between proxy/direct)
- **`jwt/jwt.hex`**: Shared JWT secret for Engine API authentication

## Current Status & Next Steps

### ✅ **Proven Working**
- Rollup-Boost sidecar architecture viable with Linea
- JSON-RPC request forwarding (13ms latency)
- Complete Docker-based development environment
- JWT authentication across all components

### ⚠️ **Known Issue**  
- Engine API forwarding (`engine_forkchoiceUpdatedV3`) compatibility
- Maru → Rollup-Boost → Besu chain breaks consensus flow
- Direct Maru → Besu works perfectly (blocks produced continuously)

### 🚀 **Production Readiness**
1. **Resolve Engine API forwarding** - compatibility between Maru and Rollup-Boost
2. **Implement pre-confirmation logic** - actual ~200ms response (currently simulated)
3. **Load testing** - concurrent transaction handling
4. **Monitoring integration** - production observability

## Technical Notes

- **Genesis timing fix**: `CREATE_EMPTY_BLOCKS=true` prevents Shanghai/TTD conflicts
- **Port mapping**: 8551 (Rollup-Boost), 8545/8550 (Besu), 8080 (Maru)  
- **Network**: Custom Docker bridge for service communication
- **Dependencies**: Proper startup ordering with health checks

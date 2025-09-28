# Linea + Rollup-Boost POC

This POC demonstrates the integration of **Flashbots Rollup-Boost** (https://github.com/flashbots/rollup-boost) with Linea's execution and consensus stack as a block builder sidecar.

## Architecture Overview

**Builder Sidecar Integration:**
```
Maru (CL) → Rollup-Boost (Builder Sidecar) → Besu (EL)
              ↓ multiplexes to ↓
         Proposer + Builder (same Besu)
```

- **Maru (CL)**: Linea's consensus client (port 8080)
- **Rollup-Boost**: Flashbots block builder sidecar (port 8551)  
- **Besu (EL)**: Hyperledger Besu as proposer AND builder (ports 8545/8550)
- **JWT Authentication**: Secured Engine API communication

## Key Achievements

 **Complete Integration**: Real Flashbots Rollup-Boost container operational  
 **Builder Multiplexing**: Engine API calls sent to both proposer AND builder  
 **Transaction Forwarding**: Transactions forwarded to both proposer and builder  
 **JSON-RPC Proxy**: All client calls proxied through Rollup-Boost  
 **Authentication**: JWT working across all components  

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

### Builder Workflow Test
```bash
node test-builder-complete-workflow.js
```
**Tests**: Complete builder workflow with multiplexing to proposer and builder

### Basic Integration Test  
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

### **Proven Working**
- Rollup-Boost builder sidecar integrated with Linea
- Engine API multiplexing to proposer AND builder (confirmed in logs)
- Transaction forwarding to both proposer and builder
- Complete Docker-based development environment
- JWT authentication across all components

### ⚠️ **Current Limitations**  
- No pre-confirmation logic implemented in Rollup-Boost
- Same Besu instance used as both proposer and builder
- Engine API compatibility issues with consensus layer

### **Next Steps ?**
1. **Implement pre-confirmation endpoints** - Add client-facing pre-confirmation API
2. **Add rapid transaction validation** - Balance, nonce, gas checks in ~200ms
3. **Build promise/fulfillment system** - Store and honor pre-confirmation promises
4. **Load testing** - Test with concurrent transactions

## Technical Notes

- **Genesis timing fix**: `CREATE_EMPTY_BLOCKS=true` prevents Shanghai/TTD conflicts
- **Port mapping**: 8551 (Rollup-Boost), 8545/8550 (Besu), 8080 (Maru)  
- **Network**: Custom Docker bridge for service communication

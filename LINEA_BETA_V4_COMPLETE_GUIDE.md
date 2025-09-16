# Linea Beta v4 / Pectra Upgrade - Complete Guide

## Overview
Linea Beta v4 introduces the **Maru Consensus Layer (CL)** alongside the existing Execution Layer (EL), transitioning from Clique to QBFT consensus. This requires all node operators to upgrade their EL client and run Maru.

## Key Architecture Changes

### Before (Current)
- **Single Layer**: EL client only (Besu with Clique consensus)
- **Sequencer Signatures**: Stored in EL block `extraData` field
- **Block Production**: Clique consensus handles everything

### After (Beta v4)
- **Dual Layer**: EL client + Maru Consensus Layer
- **Sequencer Signatures**: Moved to Maru's `SealedBeaconBlock.commitSeals` 
- **Block Production**: Maru (QBFT) coordinates consensus, EL handles execution
- **API Access**: Signatures available via Maru API as attestations

## Critical Integration Impact

### ⚠️ BREAKING CHANGE for Integrators
**Sequencer signatures will NO LONGER be in EL block extraData after the upgrade.**

#### Current Integration (Pre-Fork):
```rust
// Malda's current approach - WILL BREAK
let signatures = block.extra_data; // Contains Clique signatures
```

#### Required Integration (Post-Fork):
```
// New approach required
let signatures = maru_api.get_attestations(block_number); // Via Maru API
```

## EL Client Compatibility

### Confirmed Working Versions (from e2e tests):
- **Besu**: v25.6.0+ ✅
- **Geth**: v1.15.7+ ✅ (but requires downtime - see below)
- **Erigon**: Custom build (ethpandaops/erigon:main-8baa373a) ✅
- **Nethermind**: Custom build (nethermindeth/nethermind:clique-merge-fix) ✅

### Geth-Specific Issue:
- **Geth v1.15+**: Incompatible with Clique (pre-fork)
- **Geth v1.13**: Incompatible with Prague (post-fork)
- **Result**: Geth nodes **cannot upgrade with zero downtime** - maintenance window required

## Zero-Downtime Upgrade Strategy

### For Most Clients (Besu, Erigon, Nethermind):
1. **Start Maru BEFORE the fork timestamp**
2. **Keep EL client running** during transition
3. **Automatic handover** at fork timestamp
4. **No downtime required** ✅

### For Geth:
1. **Downtime unavoidable** due to version incompatibility
2. **Plan maintenance window** during fork transition
3. **Upgrade Geth version** + start Maru simultaneously

## Technical Details

### Fork Timestamps (Example from dev environment):
```json
{
  "0": {"type": "delegated", "blockTimeSeconds": 1},
  "1756035235": {"type": "qbft", "elFork": "Shanghai"},
  "1756035265": {"type": "qbft", "elFork": "Prague"}
}
```

### Block ExtraData Analysis:
- **Pre-fork**: 236 chars (118 bytes) - Standard Clique format
- **Post-fork**: TBD - No longer contains sequencer signatures

### Maru Configuration Requirements:
```toml
[syncing]
sync-target-selection = "Highest"
desync-tolerance = 10

[p2p]
static-peers = []
discovery = { bootnodes = [...] }
```

## Release Information

### Current Status:
- **Maru Docker**: `consensys/maru:6aa64fb` (latest)
- **Beta v4 Release**: Not yet available from linea-monorepo
- **Timeline**: Early September 2024 (tentative)

### Repositories to Monitor:
1. **Primary**: [linea-monorepo](https://github.com/Consensys/linea-monorepo)
2. **Maru**: [Consensys/maru](https://github.com/Consensys/maru)
3. **Linea-Besu**: [Consensys/linea-besu](https://github.com/Consensys/linea-besu)

## Installation & Setup Guide

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM recommended
- Ports available: 8545, 8550, 8551, 8080, 9090

### Step 1: EL Client Setup

#### Option A: Using Docker Compose (Recommended)
```bash
# Clone Maru repository
git clone https://github.com/Consensys/maru.git
cd maru/docker

# Start EL clients (Besu, Geth, Erigon, Nethermind)
docker compose -f compose.yaml up -d
```

#### Option B: Manual EL Client Setup
```bash
# Besu (Recommended)
docker run -d --name sequencer \
  -p 8545:8545 -p 8550:8550 -p 8551:8551 \
  hyperledger/besu:25.6.0 \
  --config-file=/var/lib/besu/config.toml \
  --genesis-file=/initialization/genesis-besu.json

# Geth (Requires downtime during upgrade)
docker run -d --name geth-node \
  -p 8545:8545 -p 8551:8551 \
  ethereum/client-go:v1.15.7 \
  --datadir /data --networkid 1337 \
  --http --http.addr 0.0.0.0 --http.port 8545 \
  --authrpc.addr 0.0.0.0 --authrpc.port 8551
```

### Step 2: Maru Installation

#### Option A: Docker (Recommended)
```bash
# Use latest Maru image
MARU_TAG=6aa64fb docker compose -f compose.yaml -f compose.dev.yaml up -d

# Or run Maru separately
docker run -d --name maru \
  -p 8080:8080 -p 9090:9090 \
  -v ./maru/config.dev.toml:/opt/consensys/maru/configs/config.dev.toml \
  -v ./initialization/genesis-maru.json:/opt/consensys/maru/configs/genesis.json \
  consensys/maru:6aa64fb
```

#### Option B: Build from Source
```bash
# Build Maru
./gradlew app:build

# Run Maru
java -jar app/build/libs/maru.jar \
  --config-file=docker/maru/config.dev.toml \
  --maru-genesis-file=docker/initialization/genesis-maru.json
```

### Step 3: Configuration Files

#### Maru Config (`config.dev.toml`)
```toml
allow-empty-blocks = true

[persistence]
data-path="/tmp/maru-db"
private-key-path="/tmp/maru-db/private-key"

[qbft]
fee-recipient = "0x0000000000000000000000000000000000000000"

[p2p]
port = 3322
ip-address = "0.0.0.0"
static-peers = []
reconnect-delay = "500 ms"

[p2p.discovery]
port = 3324
bootnodes = ["enr:-Iu4QHk0YN5IRRnufqsWkbO6Tn0iGTx4H_hnyiIEdXDuhIe0KKrxmaECisyvO40mEmmqKLhz_tdIhx2yFBK8XFKhvxABgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQOgBvD-dv0cX5szOeEsiAMtwxnP1q5CA5toYDrgUyOhV4N0Y3CCJBKDdWRwgiQT"]
refresh-interval = "2 minutes"

[payload-validator]
engine-api-endpoint = { endpoint = "http://sequencer:8550" }
eth-api-endpoint = { endpoint = "http://sequencer:8545" }

[follower-engine-apis]
"follower-erigon" = { endpoint = "http://follower-erigon:8551", jwt-secret-path = "../docker/jwt" }
"follower-nethermind" = { endpoint = "http://follower-nethermind:8550", jwt-secret-path = "../docker/jwt" }
"follower-geth" = { endpoint = "http://follower-geth:8551", jwt-secret-path = "../docker/jwt" }

[observability]
port = 9090
jvm-metrics-enabled = true
prometheus-metrics-enabled = true

[api]
port = 8080

[syncing]
peer-chain-height-polling-interval = "5 seconds"
el-sync-status-refresh-interval = "5 seconds"
use-unconditional-random-download-peer = false
sync-target-selection = "Highest"
desync-tolerance = 10
```

#### Genesis Configuration (`genesis-maru.json`)
```json
{
  "chainId": 1337,
  "config": {
    "0": {
      "type": "delegated",
      "blockTimeSeconds": 1
    },
    "1756035235": {
      "type": "qbft",
      "validatorSet": ["0x1b9abeec3215d8ade8a33607f2cf0f4f60e5f0d0"],
      "blockTimeSeconds": 7,
      "elFork": "Shanghai"
    },
    "1756035265": {
      "type": "qbft",
      "validatorSet": ["0x1b9abeec3215d8ade8a33607f2cf0f4f60e5f0d0"],
      "blockTimeSeconds": 7,
      "elFork": "Prague"
    }
  }
}
```

### Step 4: Connecting EL to Maru

#### JWT Authentication Setup
```bash
# Generate JWT secret (if not exists)
openssl rand -hex 32 > jwt-secret

# Ensure both EL and Maru use same JWT file
# EL: --authrpc.jwtsecret=/path/to/jwt-secret
# Maru: jwt-secret-path = "/path/to/jwt-secret"
```

#### Network Configuration
- **EL Client**: Expose engine API on port 8550 (authenticated)
- **Maru**: Configure engine-api-endpoint to connect to EL
- **P2P**: Maru handles consensus P2P on port 3322

### Step 5: Verification

#### Check EL Client
```bash
curl -X POST http://localhost:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### Check Maru
```bash
# Check Maru logs
docker logs maru --tail 50

# Check Maru API (if available)
curl -X GET http://localhost:8080/health
```

#### Verify Connection
```bash
# Check if Maru is coordinating with EL
docker logs maru | grep -i "forkchoice\|payload"
```

## Node Operator Actions Required

### Pre-Upgrade:
1. **Set up test environment** using above instructions
2. **Monitor announcements** for official release
3. **Plan maintenance windows** (especially for Geth)
4. **Update monitoring/alerting** for dual-layer architecture

### During Upgrade:
1. **Upgrade EL client** to compatible version
2. **Deploy Maru** with proper configuration
3. **Start Maru BEFORE fork timestamp** (except Geth)
4. **Monitor both EL and CL** during transition

### Post-Upgrade:
1. **Verify block production** on both layers
2. **Update integrations** if using extraData parsing
3. **Monitor performance** of dual-layer setup

## Integration Developer Guide

### For State Proof Systems (like Malda):
1. **Audit current code** for extraData dependencies
2. **Implement Maru API integration** for signature access
3. **Test with Maru development environment**
4. **Update documentation** for new architecture

### API Migration:
- **Old**: Parse `block.extraData` for signatures
- **New**: Call Maru API endpoints for attestations
- **Transition**: Detect fork block and switch methods

## Troubleshooting

### Common Issues:
1. **"Payload does not exist"**: EL/CL coordination problem
2. **"SyncTargetSelection missing"**: Outdated Maru config
3. **"ElFork.Shanghai not found"**: Version mismatch

### Debug Commands:
```bash
# Check Maru status
docker logs maru --tail 50

# Verify EL client health
curl -X POST http://localhost:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check block extraData
curl -X POST http://localhost:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest",false],"id":1}'
```

## FAQ

**Q: Can I upgrade without downtime?**
A: Yes for Besu/Erigon/Nethermind. No for Geth (version incompatibility).

**Q: Will my current integrations work?**
A: Only if they don't depend on parsing sequencer signatures from extraData.

**Q: When is the official release?**
A: Early September 2024 (tentative) - monitor linea-monorepo.

**Q: Do I need to run both EL and CL?**
A: Yes, both are required post-upgrade.

**Q: Where do I get Maru?**
A: Docker: `consensys/maru:6aa64fb` or build from source.

## Support Escalation

### For Node Operators:
- **Technical Issues**: Linea Discord #node-operators
- **Critical Problems**: Create GitHub issue in linea-monorepo

### For Integrators:
- **API Questions**: Contact Maru dev team directly
- **Breaking Changes**: Escalate via Linea support channels

---

**Last Updated**: August 2024  
**Maru Version**: 6aa64fb  
**Status**: Pre-release testing phase

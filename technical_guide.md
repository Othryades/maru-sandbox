# Linea Beta v4 / Pectra Upgrade — Complete Node Runner Guide

## 🚨 Mandatory Upgrade

Linea Beta v4 is a **mandatory hard fork** introducing **Maru**, the new Consensus Layer (CL).

This replaces Clique and aligns Linea with Ethereum’s dual-layer design (**Execution + Consensus**).

After the fork:

- You must run **both** an Execution Layer (EL) client **and** Maru.
- Sequencer signatures move from EL `extraData` → **Maru attestations API**.
- EL clients must be upgraded to **Beta v4 compatible versions**.

---

## ⚠️ Breaking Change for Integrators

**Sequencer signatures will NO LONGER be in EL block `extraData` after the upgrade.**

**Before (Pre-Fork):**

```rust
// Malda’s current approach — WILL BREAK
let signatures = block.extra_data;

```

**After (Post-Fork):**

```rust
// Must switch to Maru API
let signatures = maru_api.get_attestations(block_number);

```

---

## Key Architecture Changes

### Before (Current)

- **Single Layer**: EL client only (Besu with Clique consensus)
- **Sequencer Signatures**: Stored in EL block `extraData`
- **Block Production**: Clique consensus handles execution + consensus

### After (Beta v4)

- **Dual Layer**: EL client + Maru Consensus Layer
- **Sequencer Signatures**: Moved to Maru’s `SealedBeaconBlock.commitSeals`
- **Block Production**: Maru (QBFT) coordinates consensus, EL executes transactions
- **API Access**: Signatures and consensus data available via Maru APIs

---

## EL Client Compatibility

**Supported EL clients (from e2e tests):**

- **Besu**: v25.6.0+ ✅
- **Geth**: v1.15.7+ ✅ (*downtime required*)
- **Erigon**: Custom build (ethpandaops/erigon:main-8baa373a) ✅
- **Nethermind**: Custom build (nethermindeth/nethermind:clique-merge-fix) ✅

**⚠️ Geth-specific issue:**

- Geth v1.15+ → incompatible with Clique (pre-fork)
- Geth v1.13 → incompatible with Prague (post-fork)
- **Result**: No zero-downtime upgrade path. Must plan maintenance window.

---

## Zero-Downtime Upgrade Strategy

### For Besu, Erigon, Nethermind:

1. Start **Maru before fork timestamp**
2. Keep EL client running
3. Automatic handover at fork timestamp
4. ✅ No downtime required

### For Geth:

1. Downtime unavoidable (version mismatch)
2. Plan maintenance window
3. Upgrade Geth + start Maru together

---

## Technical Details

### Example Fork Schedule

```json
{
  "0": {"type": "delegated", "blockTimeSeconds": 1},
  "1756035235": {"type": "qbft", "elFork": "Shanghai"},
  "1756035265": {"type": "qbft", "elFork": "Prague"}
}

```

### Block `extraData`

- **Pre-fork**: contains Clique signatures
- **Post-fork**: no sequencer signatures (moved to Maru API)

---

## Installation & Setup Guide

### Prerequisites

- Docker & Docker Compose
- 8GB+ RAM (16GB recommended)
- Open ports: 8545, 8550, 8080, 9090, 31007, 31008
- Synced EL client (Besu recommended for Sepolia)

### Step 1: Directory Structure

```bash
mkdir -p ~/linea-node/{maru/config,besu/config}
cd ~/linea-node
```

### Step 2: Besu Configuration (Sepolia)

Create `besu/config/config.toml`:

```toml
# Sepolia configuration
data-path="/opt/besu/data"
genesis-file="/opt/besu/genesis.json"

# Sepolia bootnodes
bootnodes=[
  "enode://6f20afbe4397e51b717a7c1ad3095e79aee48c835eebd9237a3e8a16951ade1fe0e66e981e30ea269849fcb6ba03d838da37f524fabd2a557474194a2e2604fa@18.221.100.27:31002",
  "enode://ce1e0d8e0500cb5c0ac56bdcdafb2d6320c3a2c5125b5ccf12f5dfc9b47ee74acbcafc32559017613136c9c36a0ce74ba4f83b7fb8244f099f3b15708d9d3129@3.23.75.47:31000",
  "enode://1b026a5eb0ae74300f58987d235ef0e3a550df963345cb3574be3b0b54378bd11f14dfd515a8976f2c2d2826090e9507b8ccc24f896a9ffffffcabcfd996a733@3.129.120.128:31001"
]

# Sync configuration
sync-mode="SNAP"
data-storage-format="BONSAI"

# P2P
p2p-port=30303
p2p-host="YOUR_PUBLIC_IP"  # Replace with your EC2 public IP
host-allowlist=["*"]
discovery-enabled=true
fast-sync-min-peers=1

# Engine API (CRITICAL for Maru connection)
engine-host-allowlist=["*"]
engine-rpc-port=8550
engine-jwt-disabled=true  # No JWT required for development/testing

# JSON-RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ENGINE","DEBUG","NET","ETH","WEB3"]
```

### Step 3: Maru Configuration (Follower Node)

Create `maru/config/maru-config.toml`:

```toml
# IMPORTANT: No [qbft] section = follower node (not validator)

[persistence]
data-path = "/data"
private-key-path = "/data/private-key"  # Auto-generated if doesn't exist

[p2p]
port = 9000  # Default port (can be same as discovery)
ip-address = "0.0.0.0"
static-peers = ["/ip4/3.129.120.128/tcp/31005/p2p/16Uiu2HAmR33t8RZiAHovuH9iH2UuUrajrbfyYowiYDAQo3D5Y9wg"]
reconnect-delay = "500ms"

[p2p.discovery]
port = 9000  # Discovery uses UDP, not TCP
bootnodes = []
refresh-interval = "3s"

[payload-validator]
engine-api-endpoint = { endpoint = "http://linea-besu:8550" }  # Match Besu port!
eth-api-endpoint = { endpoint = "http://linea-besu:8545" }

[observability]
port = 9090
jvm-metrics-enabled = true
prometheus-metrics-enabled = true

[api]
port = 8080

[syncing]
peer-chain-height-polling-interval = "5s"
el-sync-status-refresh-interval = "5s"
sync-target-selection = "Highest"
desync-tolerance = 10

[syncing.download]
block-range-request-timeout = "10s"
blocks-batch-size = 10
blocks-parallelism = 10
max-retries = 5
backoff-delay = "1s"
use-unconditional-random-download-peer = false
```

### Step 4: Maru Genesis File

Create `maru/config/maru-genesis.json`:

⚠️ **Note**: This genesis configuration may change before mainnet deployment.

```json
{
  "chainId": 59141,
  "config": {
    "0": {
      "type": "delegated",
      "blockTimeSeconds": 1
    },
    "1755165600": {
      "type": "qbft",
      "validatorSet": ["0xbfe4ebafa3269c3d52ca59d6eda342af47cb7dde"],
      "blockTimeSeconds": 2,
      "elFork": "Shanghai"
    }
  }
}
```

### Step 5: Docker Compose Setup

Create `docker-compose.yml`:

```yaml
networks:
  linea: {}

services:
  besu:
    image: hyperledger/besu:25.6.0
    container_name: linea-besu
    restart: unless-stopped
    networks: [linea]
    ports:
      - "8545:8545"        # JSON-RPC
      - "8550:8550"        # Engine API
      - "30303:30303"      # P2P TCP
      - "30303:30303/udp"  # P2P UDP
    environment:
      - JAVA_OPTS=-Xmx4g
    volumes:
      - ./besu/data:/opt/besu/data
      - ./besu/config/config.toml:/opt/besu/config.toml:ro
      - ./besu/genesis.json:/opt/besu/genesis.json:ro
    command:
      - --config-file=/opt/besu/config.toml

  maru:
    image: consensys/maru:013d64f
    container_name: linea-maru
    restart: unless-stopped
    depends_on:
      - besu
    networks: [linea]  # Same network as Besu
    ports:
      - "8080:8080"         # Beacon/REST API
      - "9000:9000/tcp"     # P2P main port
      - "9000:9000/udp"     # P2P discovery port (UDP only)
      - "9090:9090"         # Metrics
    environment:
      - JAVA_OPTS=-Xmx2g
    volumes:
      - ./maru/config:/opt/consensys/maru/configs:ro
      - ./maru/data:/data
    command:
      - "java"
      - "-Dlog4j2.configurationFile=/opt/consensys/maru/configs/log4j.xml"
      - "-jar"
      - "/opt/consensys/maru/maru.jar"
      - "--maru-genesis-file"
      - "/opt/consensys/maru/configs/maru-genesis.json"
      - "--config"
      - "/opt/consensys/maru/configs/maru-config.toml"
```

### Step 6: Launch and Verify

```bash
# Start both services
docker-compose up -d

# Check Besu is syncing
curl -X POST http://localhost:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check Maru health
curl -X GET "http://localhost:8080/eth/v1/node/health"

# Verify P2P connection
docker logs linea-maru | grep "Currently connected peers"
# Should show: peers=[16Uiu2HAmR33t8RZiAHovuH9iH2UuUrajrbfyYowiYDAQo3D5Y9wg]

# Note: P2P ports updated to use default 9000 (both TCP/UDP)
```

## JWT Authentication (Production Setup)

For **production environments**, you should enable JWT authentication:

### Generate JWT Secret:
```bash
openssl rand -hex 32 > ~/linea-node/jwt/jwt.hex
```

### Update Besu config:
```toml
# Replace engine-jwt-disabled=true with:
engine-jwt-enabled=true
engine-jwt-file="/opt/besu/jwt.hex"
```

### Update Maru config:
```toml
[payload-validator]
engine-api-endpoint = { endpoint = "http://linea-besu:8550", jwt-secret-path = "/jwt.hex" }
```

### Update Docker volumes:
```yaml
# Add to both Besu and Maru:
volumes:
  - ./jwt/jwt.hex:/jwt.hex:ro
```

## Private Key Management

**Development**: Maru auto-generates private keys at startup if none exist.

**Production**: Generate and backup your validator private key:
```bash
# Option 1: Let Maru auto-generate, then backup:
docker cp linea-maru:/data/private-key ./backup/

# Option 2: Generate using Maru's key generation tool:
# https://github.com/Consensys/maru/tree/main/jvm-libs/utils
```

**Important**: For validators, maintaining the same private key preserves node identity across restarts.

---

## Node Operator Actions

### Pre-Upgrade

- Prepare Docker setup (EL + Maru)
- Monitor announcements for fork timestamp
- Plan downtime (if running Geth)

### During Upgrade

- Upgrade EL client
- Start Maru before fork (except Geth)
- Monitor logs for sync & consensus

### Post-Upgrade

- Verify block production in Maru logs
- Check EL `eth_blockNumber`
- Fetch attestations from Maru API
- Update integrations (no more `extraData` signatures)

---

## Troubleshooting

### Common Errors

- **"Failed to connect to linea-besu:8551"** → Port mismatch (use 8550, not 8551)
- **"Currently connected peers=[]"** → Check static peer port (use 31005, not 31006)
- **"[qbft] fee-recipient found"** → Remove qbft section (validator config)
- **"Payload does not exist"** → EL/CL desync
- **"SyncTargetSelection missing"** → outdated Maru config

### Debug Commands

```bash
# EL client block height
curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Maru health
curl http://localhost:8080/eth/v1/node/health

# Check block headers
curl http://localhost:8080/eth/v1/beacon/headers/head

```

---

## FAQ

**Q: Do I need both EL + CL?**

Yes. After the fork, EL alone cannot follow the chain.

**Q: Can I upgrade without downtime?**

Yes (Besu/Erigon/Nethermind). No (Geth).

**Q: Where do I get Maru?**

Docker: `consensys/maru:6aa64fb` or build from source.

**Q: What changes for integrations?**

Stop parsing EL `extraData`. Use Maru API for attestations.

---
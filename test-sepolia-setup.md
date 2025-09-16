# Testing Maru on Sepolia - Setup Guide

Based on Roman's latest updates and your EC2 setup.

## What Roman Provided

### Genesis File for Maru:
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

### Static Peer for P2P:
```
static-peers = ["/ip4/3.129.120.128/tcp/31006/p2p/16Uiu2HAmR33t8RZiAHovuH9iH2UuUrajrbfyYowiYDAQo3D5Y9wg"]
```

### Docker Image:
- Working: `consensys/maru:013d64f`
- Command: `java -Dlog4j2.configurationFile=/opt/consensys/maru/configs/log4j.xml -jar maru.jar --maru-genesis-file /opt/consensys/maru/configs/genesis.json --config /opt/consensys/maru/configs/configs.toml`

## Setup Steps

### 1. Maru Configuration
Create `maru-sepolia-config.toml`:
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
static-peers = ["/ip4/3.129.120.128/tcp/31006/p2p/16Uiu2HAmR33t8RZiAHovuH9iH2UuUrajrbfyYowiYDAQo3D5Y9wg"]
reconnect-delay = "500 ms"

[p2p.discovery]
port = 3324
bootnodes = []
refresh-interval = "2 minutes"

[payload-validator]
engine-api-endpoint = { endpoint = "http://localhost:8551", jwt-secret-path = "/path/to/jwt-secret" }
eth-api-endpoint = { endpoint = "http://localhost:8545" }

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

### 2. Genesis File
Create `maru-sepolia-genesis.json`:
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

### 3. Docker Compose Setup
```yaml
version: "3.8"

services:
  besu-sepolia:
    image: hyperledger/besu:25.6.0
    container_name: besu-sepolia
    ports:
      - "8545:8545"
      - "8551:8551"
      - "30303:30303"
    volumes:
      - ./besu-data:/data
      - ./jwt-secret:/jwt-secret:ro
    command:
      - --network=sepolia
      - --data-path=/data
      - --rpc-http-enabled
      - --rpc-http-host=0.0.0.0
      - --rpc-http-port=8545
      - --engine-rpc-enabled
      - --engine-rpc-port=8551
      - --engine-host-allowlist=*
      - --engine-jwt-secret=/jwt-secret
      - --sync-mode=SNAP
    restart: unless-stopped

  maru-sepolia:
    image: consensys/maru:013d64f
    container_name: maru-sepolia
    depends_on:
      - besu-sepolia
    ports:
      - "8080:8080"
      - "9090:9090"
      - "3322:3322"
    volumes:
      - ./maru-sepolia-config.toml:/opt/consensys/maru/configs/configs.toml:ro
      - ./maru-sepolia-genesis.json:/opt/consensys/maru/configs/genesis.json:ro
      - ./jwt-secret:/jwt-secret:ro
      - ./maru-data:/tmp/maru-db
    command:
      - java
      - -Dlog4j2.configurationFile=/opt/consensys/maru/configs/log4j.xml
      - -jar
      - maru.jar
      - --maru-genesis-file
      - /opt/consensys/maru/configs/genesis.json
      - --config
      - /opt/consensys/maru/configs/configs.toml
    restart: unless-stopped
```

### 4. JWT Secret Setup
```bash
# Generate JWT secret
mkdir -p ./jwt-secret
openssl rand -hex 32 > ./jwt-secret

# Create data directories
mkdir -p ./besu-data ./maru-data
```

## Testing Commands

### Start Services
```bash
docker compose up -d
```

### Verify Besu Sync
```bash
curl -X POST http://localhost:8545 -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'
```

### Check Maru Status
```bash
docker logs maru-sepolia --tail 50
```

### Verify P2P Connection
```bash
# Should show the static peer
docker logs maru-sepolia | grep -i "peer\|connected"
```

## Can you share your current docker compose and config files? 
I can help debug the connection issues you're having.


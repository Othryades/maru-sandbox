# Cool Maru API Requests

Now that your Maru is connected and working, let's explore what it can do!

## 1. Node Status & Health
```bash
# Check if Maru is ready
curl -X GET "http://localhost:8080/eth/v1/node/health"

# Get node identity and version
curl -X GET "http://localhost:8080/eth/v1/node/identity" | jq

# Check sync status
curl -X GET "http://localhost:8080/eth/v1/node/syncing" | jq
```

## 2. Peer Information
```bash
# Get connected peers (you should see Roman's peer!)
curl -X GET "http://localhost:8080/eth/v1/node/peers" | jq

# Get peer count
curl -X GET "http://localhost:8080/eth/v1/node/peer_count" | jq
```

## 3. Chain Information
```bash
# Get genesis information
curl -X GET "http://localhost:8080/eth/v1/beacon/genesis" | jq

# Get latest finalized checkpoint
curl -X GET "http://localhost:8080/eth/v1/beacon/states/finalized/finality_checkpoints" | jq

# Get chain head
curl -X GET "http://localhost:8080/eth/v1/beacon/headers/head" | jq
```

## 4. Block Information
```bash
# Get latest block
curl -X GET "http://localhost:8080/eth/v1/beacon/blocks/head" | jq

# Get block by slot number (try slot 1)
curl -X GET "http://localhost:8080/eth/v1/beacon/blocks/1" | jq
```

## 5. Fork Information (Cool for Beta v4!)
```bash
# Get current fork
curl -X GET "http://localhost:8080/eth/v1/beacon/states/head/fork" | jq

# Get fork schedule
curl -X GET "http://localhost:8080/eth/v1/config/fork_schedule" | jq
```


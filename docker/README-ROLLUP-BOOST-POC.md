# Linea Pre-Confirmation POC with Rollup-Boost

This POC demonstrates the integration of Flashbots' Rollup-Boost with Linea's execution and consensus stack to achieve ~200ms pre-confirmations.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Maru (CL)     │───▶│  Rollup-Boost    │───▶│   Besu (EL)     │
│  Consensus      │    │     Proxy        │    │   Execution     │
│  Layer          │    │                  │    │   Layer         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
      :8080                    :8551                   :8545/:8550
```

### Components

1. **Besu (Execution Layer)**
   - Hyperledger Besu as the execution client
   - Engine API on port 8550 (JWT protected)
   - JSON-RPC API on port 8545 (public)
   - Handles transaction execution and state management

2. **Rollup-Boost (Proxy/Sidecar)**
   - Flashbots Rollup-Boost acting as Engine API proxy
   - Intercepts and forwards Engine API calls between Maru and Besu
   - Enables pre-confirmation capabilities
   - Runs on port 8551

3. **Maru (Consensus Layer)**
   - Linea's consensus client
   - Connects to Rollup-Boost instead of directly to Besu
   - Handles consensus, block production, and finalization
   - API on port 8080

## Configuration

### JWT Authentication

All Engine API communications use JWT authentication with a shared secret:
- Location: `./jwt/jwt.hex`
- Format: 64-character hexadecimal string
- Used by Besu, Rollup-Boost, and Maru

### Maru Configuration

Key configuration sections in `maru/config.dev.toml`:

```toml
# Engine API connection through Rollup-Boost proxy
[validator-el-node]
engine-api-endpoint = { endpoint = "http://rollup-boost:8551", jwt-secret-path = "/opt/consensys/docker/jwt/jwt.hex" }

# QBFT consensus for block production
[qbft]
validator-id = "0x1b9abeec3215d8ade8a33607f2cf0f4f60e5f0d0"
validators = ["0x1b9abeec3215d8ade8a33607f2cf0f4f60e5f0d0"]
block-time = "2s"
```

### Rollup-Boost Configuration

Command-line parameters:
- `--jwt-path=/jwt/jwt.hex`: JWT secret for authentication
- `--l2-url=http://besu:8550`: L2 execution layer endpoint
- `--builder-url=http://besu:8550`: Builder endpoint (same as L2 for this POC)
- `--rpc-port=8551`: Port for Engine API proxy
- `--log-level=debug`: Verbose logging for debugging

## Running the POC

### Prerequisites

- Docker and Docker Compose
- At least 4GB RAM available for containers

### Start the Stack

```bash
cd docker
docker-compose -f compose.poc.yaml up -d
```

### Monitor Services

```bash
# Check container status
docker-compose -f compose.poc.yaml ps

# Follow logs
docker-compose -f compose.poc.yaml logs -f

# Individual service logs
docker-compose -f compose.poc.yaml logs -f rollup-boost
docker-compose -f compose.poc.yaml logs -f maru
docker-compose -f compose.poc.yaml logs -f besu
```

### Run Tests

```bash
# Run the comprehensive test script
./test-rollup-boost-poc.sh
```

## Testing and Verification

### Manual Testing Commands

1. **Test Besu JSON-RPC (Public API)**
   ```bash
   curl -X POST http://localhost:8545 \
     -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. **Test Besu Engine API (Direct)**
   ```bash
   JWT_TOKEN=$(cat jwt/jwt.hex)
   curl -X POST http://localhost:8550 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $JWT_TOKEN" \
     --data '{"jsonrpc":"2.0","method":"engine_exchangeCapabilities","params":[],"id":1}'
   ```

3. **Test Rollup-Boost Engine API (Proxy)**
   ```bash
   JWT_TOKEN=$(cat jwt/jwt.hex)
   curl -X POST http://localhost:8551 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $JWT_TOKEN" \
     --data '{"jsonrpc":"2.0","method":"engine_exchangeCapabilities","params":[],"id":1}'
   ```

4. **Test Maru API**
   ```bash
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}'
   ```

### Expected Behavior

1. **Service Startup Order**
   - Besu starts first and becomes healthy
   - Rollup-Boost starts and connects to Besu
   - Maru starts and connects to Rollup-Boost

2. **Engine API Flow**
   - Maru sends Engine API calls to Rollup-Boost (port 8551)
   - Rollup-Boost forwards calls to Besu (port 8550)
   - Rollup-Boost can intercept and enhance pre-confirmation logic

3. **Rollup-Boost Logs Should Show**
   - Successful JWT authentication
   - Forwarding of Engine API calls
   - Connection to both Maru and Besu

## Troubleshooting

### Common Issues

1. **Maru Configuration Errors**
   - Ensure all required TOML sections are present
   - Verify JWT path is correct
   - Check validator ID matches the private key

2. **JWT Authentication Failures**
   - Verify `jwt/jwt.hex` exists and is 64 hex characters
   - Ensure JWT file is mounted correctly in all containers
   - Check JWT secret paths in configurations

3. **Service Connection Issues**
   - Verify Docker network connectivity
   - Check port mappings and health checks
   - Ensure services start in correct dependency order

4. **Rollup-Boost Issues**
   - Check if the Docker image exists and is accessible
   - Verify command-line parameters are correct
   - Monitor logs for connection errors

### Debug Commands

```bash
# Check container health
docker-compose -f compose.poc.yaml ps

# Inspect network connectivity
docker network ls
docker network inspect docker_linea

# Check JWT file
cat jwt/jwt.hex | wc -c  # Should be 65 (64 chars + newline)

# Test internal connectivity
docker-compose -f compose.poc.yaml exec maru ping rollup-boost
docker-compose -f compose.poc.yaml exec rollup-boost ping besu
```

## Architecture Notes

### Sidecar vs Replacement Mode

This POC implements **Sidecar Mode**:
- Rollup-Boost runs alongside Besu as a proxy
- Besu continues to handle block building
- Rollup-Boost adds pre-confirmation capabilities
- Maintains compatibility with existing Linea infrastructure

### Pre-Confirmation Flow

1. Transaction submitted to Rollup-Boost
2. Rollup-Boost provides fast pre-confirmation (~200ms)
3. Transaction forwarded to Besu for execution
4. Maru includes transaction in next consensus block
5. Final confirmation when block is finalized

## Next Steps

1. **Performance Testing**: Measure actual pre-confirmation latency
2. **Load Testing**: Test with realistic transaction volumes
3. **Integration Testing**: Verify with Linea-specific transaction types
4. **Production Configuration**: Adapt for mainnet/testnet deployment
5. **Monitoring**: Add comprehensive metrics and alerting

## Files Modified/Created

- `compose.poc.yaml`: Added Rollup-Boost service
- `maru/config.dev.toml`: Updated to use Rollup-Boost proxy
- `test-rollup-boost-poc.sh`: Comprehensive test script
- `README-ROLLUP-BOOST-POC.md`: This documentation

## References

- [Flashbots Rollup-Boost](https://github.com/flashbots/rollup-boost)
- [Rollup-Boost Local Operator Guide](https://rollup-boost.flashbots.net/operators/local.html)
- [Linea Documentation](https://docs.linea.build/)
- [Engine API Specification](https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md)


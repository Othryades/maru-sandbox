# Debug Commands for Maru P2P Issues

## 1. Test network connectivity (alternative to nc)
```bash
# Test if port 31006 is reachable on the static peer
timeout 5 bash -c '</dev/tcp/3.129.120.128/31006' && echo "Port is open" || echo "Port is closed/filtered"

# Or use telnet if available
telnet 3.129.120.128 31006
```

## 2. Check Maru's full logs for P2P details
```bash
# Look for any P2P initialization or connection logs
docker logs linea-maru | grep -E "(P2P|libp2p|static.*peer)" | head -20

# Check for any multiaddr parsing or peer dialing
docker logs linea-maru | grep -E "(multiaddr|dial|peer.*add)" 
```

## 3. Check Maru API endpoints
```bash
# Check if API is working
curl -X GET "http://localhost:8080/eth/v1/node/health"

# Check peer information
curl -X GET "http://localhost:8080/eth/v1/node/peers" | head -200

# Check node identity
curl -X GET "http://localhost:8080/eth/v1/node/identity"
```

## 4. Verify container networking
```bash
# Check if Maru container can reach Besu
docker exec linea-maru ping -c 3 linea-besu

# Check if Maru can resolve external addresses
docker exec linea-maru nslookup 3.129.120.128
```

## 5. Check current timestamp vs fork time
```bash
# Current timestamp
date +%s

# Fork timestamp from genesis: 1755165600
# Check if we're past the fork
echo "Fork timestamp: 1755165600 ($(date -d @1755165600))"
echo "Current time:   $(date +%s) ($(date))"
```

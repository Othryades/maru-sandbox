#!/bin/bash

echo "=== Monitoring Maru P2P Connection ==="
echo "Maru Node ID: 16Uiu2HAmCHRf9mu92aBLrgKuGFdiLfGGWnBsVtdJyd8opsrA5Nfm"
echo "Static Peer:  16Uiu2HAmR33t8RZiAHovuH9iH2UuUrajrbfyYowiYDAQo3D5Y9wg"
echo "Target IP:    3.129.120.128:31006"
echo ""

# Function to check peer connection status
check_peers() {
    echo "=== $(date) ==="
    
    # Check peer count
    docker logs linea-maru --since=30s 2>/dev/null | grep -E "(peer|p2p|connected|ENR|discovery)" | tail -5
    
    # Try to connect to Maru API to check peer status
    echo "API Peer Check:"
    curl -s -X GET "http://localhost:8080/eth/v1/node/peers" 2>/dev/null | head -c 200
    echo ""
    
    # Check if we can reach the static peer
    echo "Network connectivity to static peer:"
    nc -zv 3.129.120.128 31006 2>&1 | head -1
    
    echo "----------------------------------------"
}

# Monitor every 30 seconds
while true; do
    check_peers
    sleep 30
done

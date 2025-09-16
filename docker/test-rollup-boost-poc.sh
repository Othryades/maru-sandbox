#!/bin/bash

# Linea Pre-Confirmation POC with Rollup-Boost Test Script
# This script tests the integration of Rollup-Boost with Linea's Maru CL + Besu EL

set -e

echo "🔧 Linea + Rollup-Boost POC Test Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test JSON-RPC endpoint
test_jsonrpc() {
    local url=$1
    local method=$2
    local params=$3
    local description=$4
    
    echo -e "\n${BLUE}Testing: ${description}${NC}"
    echo "URL: $url"
    echo "Method: $method"
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
        "$url" 2>/dev/null || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]] || [[ "$response" == *"error"* ]]; then
        echo -e "${RED}❌ FAILED${NC}"
        echo "Response: $response"
        return 1
    else
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "Response: $response"
        return 0
    fi
}

# Function to test Engine API with JWT
test_engine_api() {
    local url=$1
    local method=$2
    local params=$3
    local description=$4
    local jwt_token=$5
    
    echo -e "\n${BLUE}Testing: ${description}${NC}"
    echo "URL: $url"
    echo "Method: $method"
    
    if [[ -n "$jwt_token" ]]; then
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $jwt_token" \
            --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
            "$url" 2>/dev/null || echo "ERROR")
    else
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            --data "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":$params,\"id\":1}" \
            "$url" 2>/dev/null || echo "ERROR")
    fi
    
    if [[ "$response" == "ERROR" ]] || [[ "$response" == *"error"* ]]; then
        echo -e "${RED}❌ FAILED${NC}"
        echo "Response: $response"
        return 1
    else
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "Response: $response"
        return 0
    fi
}

# Wait for services to be ready
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Read JWT token
JWT_TOKEN=""
if [[ -f "./jwt/jwt.hex" ]]; then
    JWT_TOKEN=$(cat ./jwt/jwt.hex)
    echo -e "${GREEN}✅ JWT token loaded${NC}"
else
    echo -e "${RED}❌ JWT token not found at ./jwt/jwt.hex${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🧪 Starting POC Tests${NC}"
echo "========================"

# Test 1: Besu JSON-RPC (public API)
test_jsonrpc "http://localhost:8545" "web3_clientVersion" "[]" "Besu JSON-RPC - Client Version"
test_jsonrpc "http://localhost:8545" "eth_blockNumber" "[]" "Besu JSON-RPC - Block Number"

# Test 2: Besu Engine API (direct, should work with JWT)
test_engine_api "http://localhost:8550" "engine_exchangeCapabilities" "[]" "Besu Engine API - Exchange Capabilities" "$JWT_TOKEN"

# Test 3: Rollup-Boost Engine API (proxy, should forward to Besu)
test_engine_api "http://localhost:8551" "engine_exchangeCapabilities" "[]" "Rollup-Boost Engine API - Exchange Capabilities" "$JWT_TOKEN"

# Test 4: Maru API (if available)
test_jsonrpc "http://localhost:8080" "web3_clientVersion" "[]" "Maru API - Client Version"

echo -e "\n${YELLOW}📋 Service Status Check${NC}"
echo "=========================="

# Check if containers are running
echo -e "\n${BLUE}Docker Container Status:${NC}"
docker-compose -f compose.poc.yaml ps

echo -e "\n${BLUE}Rollup-Boost Logs (last 20 lines):${NC}"
docker-compose -f compose.poc.yaml logs --tail=20 rollup-boost

echo -e "\n${BLUE}Maru Logs (last 20 lines):${NC}"
docker-compose -f compose.poc.yaml logs --tail=20 maru

echo -e "\n${BLUE}Besu Logs (last 20 lines):${NC}"
docker-compose -f compose.poc.yaml logs --tail=20 besu

echo -e "\n${GREEN}🎉 POC Test Script Complete!${NC}"
echo "============================================"
echo "Architecture: Maru (CL) → Rollup-Boost → Besu (EL)"
echo "- Maru connects to Rollup-Boost on port 8551"
echo "- Rollup-Boost forwards Engine API calls to Besu on port 8550"
echo "- Besu provides execution layer functionality"
echo ""
echo "Key endpoints:"
echo "- Besu JSON-RPC: http://localhost:8545"
echo "- Besu Engine API: http://localhost:8550 (JWT required)"
echo "- Rollup-Boost Engine API: http://localhost:8551 (JWT required)"
echo "- Maru API: http://localhost:8080"

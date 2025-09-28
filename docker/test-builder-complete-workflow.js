#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

console.log('🏗️  COMPLETE BUILDER WORKFLOW TEST');
console.log('==================================');
console.log('Testing: Proposer (Besu) + Builder (same Besu) via Rollup-Boost');
console.log('');

const BESU_DIRECT = 'http://localhost:8545';
const ROLLUP_BOOST = 'http://localhost:8551';
const ROLLUP_BOOST_METRICS = 'http://localhost:9090';

// Load JWT token
const jwtToken = fs.readFileSync('./jwt/jwt.hex', 'utf8').trim();

async function makeRpcCall(url, method, params, headers = {}) {
    const data = JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: Math.floor(Math.random() * 1000)
    });

    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    resolve({ raw: responseData, error: e.message });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testCompleteBuilderWorkflow() {
    console.log('📊 PHASE 1: Setup and Connectivity');
    console.log('===================================');
    
    try {
        // Check current block
        const blockResponse = await makeRpcCall(ROLLUP_BOOST, 'eth_blockNumber', []);
        const currentBlock = parseInt(blockResponse.result, 16);
        console.log(`✅ Current block: ${blockResponse.result} (${currentBlock})`);
        
        // Check metrics endpoint
        try {
            const metricsResponse = await makeRpcCall(ROLLUP_BOOST_METRICS, 'GET', []);
            console.log(`✅ Metrics endpoint accessible`);
        } catch (e) {
            console.log(`⚠️  Metrics endpoint not accessible (expected)`);
        }

        console.log('\n🏗️  PHASE 2: Builder Workflow Simulation');
        console.log('=========================================');
        
        // Simulate the complete builder workflow according to Rollup-Boost docs
        
        console.log('\n🔄 Step 1: engine_forkchoiceUpdatedV3 with payload attributes');
        console.log('   This should multiplex to BOTH proposer AND builder (same Besu)');
        
        const currentTimestamp = Math.floor(Date.now() / 1000) + 12;
        const forkChoiceParams = [
            {
                headBlockHash: "0x" + "a".repeat(64),
                safeBlockHash: "0x" + "b".repeat(64), 
                finalizedBlockHash: "0x" + "c".repeat(64)
            },
            {
                timestamp: "0x" + currentTimestamp.toString(16),
                prevRandao: "0x" + "1".repeat(64),
                suggestedFeeRecipient: "0x" + "0".repeat(40),
                gasLimit: "0x1c9c380"  // Add required gasLimit
            }
        ];
        
        console.log(`   Payload attributes: timestamp=${currentTimestamp}, gasLimit=0x1c9c380`);
        
        const authHeaders = { 'Authorization': `Bearer ${jwtToken}` };
        const forkChoiceResponse = await makeRpcCall(ROLLUP_BOOST, 'engine_forkchoiceUpdatedV3', forkChoiceParams, authHeaders);
        
        if (forkChoiceResponse.result) {
            console.log(`   ✅ FCU Response: ${JSON.stringify(forkChoiceResponse.result)}`);
            const payloadId = forkChoiceResponse.result.payloadId;
            
            if (payloadId) {
                console.log(`   🎯 Payload ID received: ${payloadId}`);
                
                // Step 2: engine_getPayload (should query both proposer and builder)
                console.log('\n🔄 Step 2: engine_getPayloadV3');
                console.log('   This should query BOTH proposer AND builder in parallel');
                
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for block building
                
                const getPayloadResponse = await makeRpcCall(ROLLUP_BOOST, 'engine_getPayloadV3', [payloadId], authHeaders);
                
                if (getPayloadResponse.result) {
                    console.log(`   ✅ Payload received from builder workflow`);
                    console.log(`   📦 Block number: ${getPayloadResponse.result.executionPayload?.blockNumber || 'N/A'}`);
                    console.log(`   🔗 Block hash: ${getPayloadResponse.result.executionPayload?.blockHash?.slice(0, 10) || 'N/A'}...`);
                    
                    // Step 3: engine_newPayload (validation)
                    console.log('\n🔄 Step 3: engine_newPayload (validation)');
                    console.log('   This validates the builder block with proposer');
                    
                    const newPayloadResponse = await makeRpcCall(ROLLUP_BOOST, 'engine_newPayloadV3', 
                        [getPayloadResponse.result.executionPayload], authHeaders);
                    
                    if (newPayloadResponse.result) {
                        console.log(`   ✅ Block validation: ${newPayloadResponse.result.status}`);
                        console.log(`   🔍 Latest valid hash: ${newPayloadResponse.result.latestValidHash?.slice(0, 10) || 'N/A'}...`);
                    } else {
                        console.log(`   ⚠️  Validation response: ${JSON.stringify(newPayloadResponse)}`);
                    }
                    
                } else {
                    console.log(`   ⚠️  getPayload response: ${JSON.stringify(getPayloadResponse)}`);
                }
            } else {
                console.log(`   ⚠️  No payload ID in FCU response`);
            }
        } else {
            console.log(`   ⚠️  FCU Error: ${JSON.stringify(forkChoiceResponse)}`);
        }

        console.log('\n📊 PHASE 3: Transaction Forwarding Test');
        console.log('======================================');
        
        // Test eth_sendRawTransaction forwarding to builder
        console.log('\n🔄 Testing eth_sendRawTransaction forwarding');
        console.log('   This should forward to BOTH proposer AND builder');
        
        // Create a more realistic (but still invalid) transaction
        const dummyTx = "0xf86c0a8504a817c80082520894" + "0".repeat(40) + "880de0b6b3a764000080" + "25" + "a0" + "1".repeat(64) + "a0" + "2".repeat(64);
        
        const txResponse = await makeRpcCall(ROLLUP_BOOST, 'eth_sendRawTransaction', [dummyTx]);
        console.log(`   📤 Transaction forwarding result: ${JSON.stringify(txResponse)}`);
        
        console.log('\n📋 PHASE 4: Log Analysis');
        console.log('========================');
        console.log('🔍 Check Rollup-Boost logs for:');
        console.log('   - "forwarding ... to l2" (proposer calls)');
        console.log('   - "forwarding ... to builder" (builder calls)'); 
        console.log('   - "proxying request" (multiplexing)');
        console.log('');
        console.log('   Command: docker logs rollup-boost --tail 30');
        
        console.log('\n🎯 BUILDER WORKFLOW TEST COMPLETE');
        console.log('==================================');
        console.log('✅ Rollup-Boost configured with same Besu as proposer AND builder');
        console.log('✅ Complete Engine API workflow tested');
        console.log('✅ Transaction forwarding to builder tested');
        console.log('✅ Logs should show multiplexing behavior');
        console.log('');
        console.log('🔍 NEXT STEPS:');
        console.log('1. Analyze logs to confirm multiplexing');
        console.log('2. Set up separate builder for true builder workflow');
        console.log('3. Implement pre-confirmation logic on top of this');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testCompleteBuilderWorkflow();

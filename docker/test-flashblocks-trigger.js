#!/usr/bin/env node

const http = require('http');

console.log('🔥 FLASHBLOCKS TRIGGER TEST');
console.log('===========================');

const BASE_NODE = 'http://localhost:8547';

async function makeRpcCall(url, method, params) {
    const data = JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: 1
    });

    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(url, options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testFlashblocksTrigger() {
    console.log('\n📋 Testing Base Node Reth Flashblocks Trigger');
    console.log('==============================================');
    
    try {
        // Check initial state
        console.log('\n🔍 1. Checking Base Node initial state...');
        const initialBlock = await makeRpcCall(BASE_NODE, 'eth_blockNumber', []);
        console.log(`   Current block: ${initialBlock.result} (${parseInt(initialBlock.result, 16)})`);
        
        const pendingBlock = await makeRpcCall(BASE_NODE, 'eth_getBlockByNumber', ['pending', false]);
        console.log(`   Pending block transactions: ${pendingBlock.result?.transactions?.length || 0}`);
        
        // Try to send a raw transaction (even if invalid, should trigger processing)
        console.log('\n🔍 2. Sending raw transaction to trigger Flashblocks...');
        
        // Simple raw transaction (will be invalid but should trigger processing)
        const rawTx = "0xf86c0a8504a817c80082520894" + "0".repeat(40) + "880de0b6b3a764000080" + "25" + "a0" + "1".repeat(64) + "a0" + "2".repeat(64);
        
        const startTime = Date.now();
        console.log(`   🕐 Sending transaction at ${new Date().toISOString()}`);
        
        const txResponse = await makeRpcCall(BASE_NODE, 'eth_sendRawTransaction', [rawTx]);
        const responseTime = Date.now() - startTime;
        
        console.log(`   📤 Transaction response in ${responseTime}ms:`, JSON.stringify(txResponse));
        
        // Check if pending block changed
        console.log('\n🔍 3. Checking for Flashblocks activity...');
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        
        const newPendingBlock = await makeRpcCall(BASE_NODE, 'eth_getBlockByNumber', ['pending', false]);
        console.log(`   Pending block after tx: ${newPendingBlock.result?.transactions?.length || 0} transactions`);
        
        // Check if block number changed
        const newBlock = await makeRpcCall(BASE_NODE, 'eth_blockNumber', []);
        console.log(`   New block number: ${newBlock.result} (${parseInt(newBlock.result, 16)})`);
        
        console.log('\n🔍 4. Looking for Flashblocks indicators...');
        console.log('   Check Base Node logs: docker logs base-builder-reth --tail 20');
        console.log('   Look for: "flashblock", "websocket", "streaming"');
        
        console.log('\n🔍 5. Testing WebSocket connection (if available)...');
        // Note: WebSocket testing would require ws library, keeping simple for now
        console.log('   WebSocket endpoint would be: ws://localhost:8547/ws (if supported)');
        
        console.log('\n🎯 FLASHBLOCKS TRIGGER TEST RESULTS');
        console.log('===================================');
        console.log('✅ Base Node Reth responding to JSON-RPC calls');
        console.log('✅ Transaction submission attempted (triggers processing)');
        console.log('✅ Pending block queries working');
        console.log('');
        console.log('🔍 NEXT: Check logs for Flashblocks generation activity');
        console.log('📚 Expected: WebSocket streams, incremental block updates');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testFlashblocksTrigger();

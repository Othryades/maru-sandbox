#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔥 FLASHBLOCKS WEBSOCKET CLIENT');
console.log('================================');
console.log('Connecting to Base Sepolia Flashblocks WebSocket to understand format...\n');

const WS_URL = 'wss://sepolia.flashblocks.base.org/ws';

const ws = new WebSocket(WS_URL);

let flashblockCount = 0;
let currentBlockNumber = null;

ws.on('open', () => {
    console.log('✅ Connected to Base Sepolia Flashblocks WebSocket!');
    console.log('📡 Listening for Flashblocks...\n');
});

ws.on('message', (data) => {
    flashblockCount++;
    const timestamp = new Date().toISOString();
    
    try {
        // Try to parse as JSON
        const flashblock = JSON.parse(data.toString());
        
        const blockNum = flashblock.payload_id || flashblock.index || flashblock.block_number || 'unknown';
        const txCount = flashblock.diff?.transactions?.length || flashblock.transactions?.length || 0;
        const gasUsed = flashblock.diff?.gas_used || flashblock.gas_used || '0x0';
        
        console.log(`🔹 Flashblock #${flashblockCount} at ${timestamp}`);
        console.log(`   Block/Index: ${blockNum}`);
        console.log(`   Transactions: ${txCount}`);
        console.log(`   Gas used: ${gasUsed}`);
        
        if (flashblock.index === 0) {
            console.log(`   🆕 NEW BLOCK STARTED (index 0)`);
            if (flashblock.base) {
                console.log(`   Base data: block ${flashblock.base.block_number}, gasLimit ${flashblock.base.gas_limit}`);
            }
        }
        
        console.log('   Raw structure:', Object.keys(flashblock).join(', '));
        console.log('');
        
        // Show full structure for first few Flashblocks
        if (flashblockCount <= 3) {
            console.log('   📋 FULL FLASHBLOCK STRUCTURE:');
            console.log(JSON.stringify(flashblock, null, 2).split('\n').slice(0, 30).join('\n'));
            console.log('   ...\n');
        }
        
    } catch (e) {
        // Binary data - show hex
        const hex = data.toString('hex');
        console.log(`🔹 Flashblock #${flashblockCount} at ${timestamp} (binary)`);
        console.log(`   Length: ${data.length} bytes`);
        console.log(`   First 64 bytes (hex): ${hex.slice(0, 128)}...`);
        console.log('');
    }
    
    // Stop after 20 Flashblocks to avoid spam
    if (flashblockCount >= 20) {
        console.log('\n🎯 FLASHBLOCKS ANALYSIS COMPLETE');
        console.log('================================');
        console.log(`Received ${flashblockCount} Flashblocks`);
        console.log('');
        console.log('📚 WHAT WE LEARNED:');
        console.log('- Flashblocks are streamed via WebSocket');
        console.log('- Each Flashblock contains incremental block data');
        console.log('- Index 0 = new block start with base data');
        console.log('- Subsequent Flashblocks = diffs with new transactions');
        console.log('');
        console.log('🎯 THIS FORMAT IS WHAT BESU SHOULD GENERATE!');
        ws.close();
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
    console.log('\n📡 WebSocket connection closed');
    console.log(`Total Flashblocks received: ${flashblockCount}`);
});

// Timeout after 2 minutes
setTimeout(() => {
    console.log('\n⏰ Test timeout - closing connection');
    ws.close();
}, 120000);

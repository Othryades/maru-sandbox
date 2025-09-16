# Message for Roman

Hi Roman,

I've set up Maru with the config you provided but running into a connectivity issue:

**Setup Status:**
- ✅ Maru is running with the correct genesis and config
- ✅ Maru API is responding ("Node is ready")
- ✅ Static peer is configured: `/ip4/3.129.120.128/tcp/31006/p2p/16Uiu2HAmR33t8RZiAHovuH9iH2UuUrajrbfyYowiYDAQo3D5Y9wg`
- ❌ Cannot connect to static peer: port 31006 is closed/filtered from my EC2

**Network Test:**
```bash
timeout 5 bash -c '</dev/tcp/3.129.120.128/31006' && echo "Port is open" || echo "Port is closed/filtered"
# Result: Port is closed/filtered
```

**Maru Logs:**
- P2P network starts correctly on port 31007
- Shows "Currently connected peers=[]" every 20 seconds
- No connection attempt logs to the static peer

**Questions:**
1. Is the static peer `3.129.120.128:31006` currently online?
2. Should I try a different static peer address?
3. Are there any firewall/security group requirements for the static peer connection?
4. Is there an alternative bootstrap method if static peers aren't reachable?

**Current Status:**
- Timestamp: 1756463517 (past fork time 1755165600)
- Maru Node ID: `16Uiu2HAmCHRf9mu92aBLrgKuGFdiLfGGWnBsVtdJyd8opsrA5Nfm`
- Running on EC2 with Docker Compose

Thanks!


---
title: "TCP Three-Way Handshake: What Really Happens Under the Hood"
description: "A deep dive into how TCP establishes connections, what SYN/ACK packets actually do, and why this matters for building reliable network applications."
publishedAt: 2024-11-08
draft: false
---

Every time you hit a website, your browser and the server do a little dance called the TCP three-way handshake. It's the foundation of reliable internet communication, but what's actually happening at the packet level?

## The Problem TCP Solves

Unlike UDP which just yeets packets into the void and hopes they arrive, TCP guarantees delivery. But before any data moves, both sides need to agree they're ready to talk. That's where the handshake comes in.

## Breaking Down the Handshake

### Step 1: SYN (Client → Server)

The client sends a SYN packet with a random sequence number. This isn't just a "hello" - the sequence number is crucial for tracking packets and preventing replay attacks.

```
Client: "Hey server, let's talk. My starting sequence is 1000."
```

### Step 2: SYN-ACK (Server → Client)

The server responds with its own sequence number AND acknowledges the client's by incrementing it.

```
Server: "Got it. My sequence starts at 2000, and I'm ready for your packet 1001."
```

### Step 3: ACK (Client → Server)

The client acknowledges the server's sequence number, and now both sides can start sending data.

```
Client: "Cool, ready for your packet 2001. Let's do this."
```

## Why Three Steps?

You might think "why not just two?" But that third ACK is critical. Without it, the server can't be sure the client received its SYN-ACK. This prevents half-open connections where the server allocates resources but the client never shows up.

## What This Means for Your Code

When you call `connect()` in your application, all this happens transparently. But understanding it helps you debug:

- **Connection timeouts?** Probably stuck waiting for SYN-ACK
- **TIME_WAIT states piling up?** That's TCP ensuring all packets cleared before reusing ports
- **SYN flood attacks?** Attackers spam SYN packets but never complete the handshake, exhausting server resources

## Seeing It in Action

You can actually watch this happen with tcpdump:

```bash
sudo tcpdump -i any port 80 -n
```

Connect to any website and you'll see the three packets clear as day.

The beauty of TCP is that it handles all this complexity so your application doesn't have to. But when things go wrong, knowing what's happening under the hood makes all the difference.

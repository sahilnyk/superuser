---
title: "DNS Resolution: From URL to IP Address in Milliseconds"
description: "Ever wondered what happens between typing a URL and your browser loading the page? Let's trace the entire DNS resolution process step by step."
publishedAt: 2024-09-22
draft: false
---

You type `google.com` and hit enter. In less than 50ms, your browser has the IP address and starts loading the page. But there's a fascinating journey happening behind that simple action.

## The DNS Hierarchy

DNS isn't one big database - it's a distributed system of servers organized in a hierarchy:

1. **Root servers** (13 of them globally)
2. **TLD servers** (.com, .org, etc.)
3. **Authoritative nameservers** (the source of truth for specific domains)
4. **Recursive resolvers** (your ISP or 8.8.8.8)

## The Resolution Process

### Step 1: Check the Local Cache

Your OS maintains a DNS cache. If you recently visited the site, it's already there. Check it:

```bash
# Linux
cat /etc/resolv.conf

# Windows
ipconfig /displaydns
```

### Step 2: Ask the Recursive Resolver

If not cached, your system asks a recursive resolver (usually your ISP's or Google's 8.8.8.8). This resolver does the heavy lifting.

### Step 3: Root Server Query

The resolver asks a root server: "Who handles .com domains?"

Root server responds: "Ask this TLD server at 192.5.6.30"

### Step 4: TLD Server Query

Resolver asks TLD server: "Who's authoritative for google.com?"

TLD responds: "Ask ns1.google.com at 216.239.32.10"

### Step 5: Authoritative Nameserver

Finally, the resolver asks Google's nameserver: "What's the IP for google.com?"

Authoritative server: "142.250.185.46"

Your browser gets this IP and opens a TCP connection.

## Why It's Fast Despite All These Hops

**Caching at every level.** Each server caches responses based on TTL (Time To Live). That's why changing DNS records takes time to propagate - old cached values need to expire.

## Debugging DNS Issues

When things break, these commands save lives:

```bash
# See the full resolution path
dig +trace google.com

# Check specific nameserver
dig @8.8.8.8 google.com

# See what's cached locally
nslookup google.com
```

## The Security Side

DNS was designed in the 1980s without security in mind. That's why we now have:

- **DNSSEC**: Cryptographically signs DNS records
- **DNS over HTTPS (DoH)**: Encrypts DNS queries so your ISP can't snoop
- **DNS over TLS (DoT)**: Same idea, different protocol

Understanding DNS helps you debug weird network issues, optimize performance with proper TTLs, and appreciate the invisible infrastructure that makes the internet work.

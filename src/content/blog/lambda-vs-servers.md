---
title: "Lambda vs Servers: Which One Should You Use?"
description: "Simple breakdown of when serverless makes sense and when it's just extra cost."
publishedAt: 2025-03-28
draft: false
---

Lambda and servers both run your code. But they work differently and cost differently.

## What's Lambda?

Lambda is Amazon's "serverless" service. You upload your code, and AWS runs it whenever needed. You don't manage servers - AWS handles everything.

**How it works:**
1. Someone hits your API
2. AWS spins up a container with your code
3. Your code runs
4. Container shuts down
5. You pay only for those few seconds

## What's a Server?

A traditional server (like EC2) runs 24/7. Even when nobody's using your app, it's running and you're paying.

## The Real Differences

**Lambda gives you:**
- Pay-per-use (nothing if nobody visits)
- Auto-scales instantly (10 users → 10,000 users, no setup)
- Zero maintenance (no updates, no patching)

**Lambda takes away:**
- Predictable speed (cold starts)
- Long-running tasks (15 min max)
- Persistent connections (WebSockets are hard)

**Servers give you:**
- Consistent speed
- Run forever if needed
- Database connection pools that stay alive

**Servers take away:**
- Your time (maintenance, updates, scaling)
- Your money (running 24/7 even at low traffic)

## Cold Starts: The Lambda Tax

Here's the annoying part. When Lambda hasn't been used in a while, it takes time to start up:

- Python/Node: 200-500ms first time
- Go: 100-200ms first time  
- Java: 2-8 seconds (ouch)

After that first "cold" start, it's fast (under 10ms). But that first hit after idle time is slow.

**When it matters:** User-facing APIs where every millisecond counts

**When it doesn't:** Background jobs, scheduled tasks, internal tools

## The Cost Math

Let me show you real numbers.

**Lambda serving 100 requests/sec:**
- 10 million requests/month
- ~$400/month

**Small server (t3.medium):**
- Handles 100+ req/sec easily
- $30/month flat

Lambda costs 10x more at constant traffic. But wait...

That $30 doesn't include:
- Your time setting up auto-scaling
- Load balancer fees
- Over-provisioning for traffic spikes
- Getting paged at 3am when disk is full

For me? I'll pay the Lambda premium to avoid that headache.

## When Lambda Wins

**Background jobs**
```
Image uploaded to S3 → Lambda resizes it → saves thumbnail
```

Perfect for Lambda. Sporadic, short-lived, scales automatically.

**Scheduled tasks**

Need to send a daily report at 9am? Why run a server 24/7 for 5 minutes of work? Lambda costs pennies.

**Spiky traffic**

Your app normally gets 10 req/sec, but occasionally spikes to 5,000 when you hit HackerNews front page. 

With servers, you either:
- Pay for 5,000 req/sec capacity 24/7 (expensive)
- Crash during spikes (bad)

Lambda just scales. No setup needed.

## When Servers Win

**Database-heavy apps**

Lambda creates a new database connection every time. With 100 concurrent Lambdas, that's 100 connections. Your database freaks out.

Servers keep a connection pool alive. Way more efficient.

**WebSockets or long connections**

Lambda isn't built for this. You can hack it with API Gateway WebSockets, but it's messy.

**Long tasks**

Processing video? Training models? Anything over 15 minutes? Lambda hard-stops at 15 minutes. Use a server.

**Consistent high traffic**

If you're doing 1,000 req/sec 24/7, servers are way cheaper. Lambda pricing adds up fast.

## What I Actually Do

I use both:

**User-facing API** → Server (ECS/Fargate)
- Needs consistent speed
- Heavy database use
- Predictable traffic

**Image processing** → Lambda
- Triggered by S3 uploads
- Sporadic and spiky
- Don't want to manage servers for it

**Cron jobs** → Lambda
- Runs once a day for 2 minutes
- Would waste money on a 24/7 server

**Internal tools** → Lambda
- Low traffic
- Don't care about cold starts
- Costs almost nothing

## Quick Decision Guide

Use **Lambda** if:
- Traffic is unpredictable or very low
- Tasks run for less than 15 minutes
- You want zero maintenance
- It's triggered by AWS events (S3, SQS)

Use **Servers** if:
- Traffic is steady and high (>50 req/s all day)
- You need database connection pools
- You need WebSockets
- Tasks run for hours
- You need every millisecond of latency

When in doubt? Start with Lambda. It's easier to begin with, and you can always move to servers later when costs justify it.

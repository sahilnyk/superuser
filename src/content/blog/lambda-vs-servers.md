---
title: "Lambda vs Servers: When I Use Each"
description: "Cold starts suck but so does managing servers. Here's when I reach for Lambda and when I don't."
publishedAt: 2025-03-28
draft: false
---

I've run services both ways - Lambda and traditional servers. Neither is obviously better. They're different tradeoffs.

## What Lambda Actually Gives You

**Zero idle cost.** If nobody hits your endpoint, you pay nothing. With EC2, that server is burning $30/month even at zero traffic.

**Instant scaling.** Traffic spikes from 10 req/s to 1000? Lambda handles it automatically. With servers, you're either over-provisioned (wasting money) or under-provisioned (site goes down).

**No server maintenance.** No SSH. No patches. No "the disk filled up" pages at 2am.

The catch? Cold starts and a 15-minute execution limit.

## Cold Starts Are Real

When a Lambda hasn't been used recently, AWS has to spin up a new container. This takes time:

- Python/Node: 200-500ms
- Go: 100-200ms  
- Java without SnapStart: 2-8 seconds (brutal)

Once warm, invocations are fast (single-digit milliseconds). But that first hit after idle time hurts.

I learned this the hard way. Built an API, tested it (always fast because I was hitting it repeatedly), deployed to prod. Users complained about random slow responses. Turned out to be cold starts on low-traffic endpoints.

## When Cold Starts Don't Matter

If you're building:
- Async background jobs (SQS triggers, S3 events)
- Scheduled cron tasks
- Internal tools with low traffic
- APIs where p99 latency of 500ms is acceptable

Cold starts aren't a problem. Most of my Lambda usage falls into these categories.

## When Cold Starts Kill You

High-traffic user-facing APIs with strict latency SLAs. If your p99 needs to be under 50ms, Lambda requires "provisioned concurrency" - which means paying to keep instances warm. At that point, you're paying for idle capacity anyway, so why not just use a server?

## The Cost Crossover

I ran the numbers for a simple API endpoint:

**Lambda at 100 req/s, 200ms duration, 512MB memory:**
```
~10M requests/month
Cost: ~$400/month
```

**t3.medium (2 vCPU, 4GB RAM):**
```
Handles 100+ req/s easily
Cost: $30/month
```

Lambda is 10x more expensive at steady load. The break-even is somewhere around 1-5M requests/month, depending on your specifics.

But that $30 doesn't include:
- Load balancer costs
- My time setting up auto-scaling
- On-call burden when the server fills disk/runs out of memory
- Over-provisioning for traffic spikes

For me, Lambda is often worth the premium.

## Where Servers Win Hard

**Database-heavy workloads.** Lambda creates a new DB connection on every cold start. With RDS, you'll exhaust connection pools fast. RDS Proxy helps but adds latency and cost.

A server keeps a persistent connection pool. Way simpler.

**WebSockets or long-lived connections.** Lambda isn't built for this. You can hack it with API Gateway WebSocket APIs, but it's painful.

**Anything over 15 minutes.** Hard Lambda limit. If you're processing video, training models, running large batch jobs - use a server or Step Functions + multiple Lambdas.

## My Current Pattern

**User-facing APIs** → ECS Fargate usually. Consistent latency matters, traffic is somewhat predictable.

**Background jobs** → Lambda. Processing S3 uploads, handling SQS messages, sending emails. Traffic is spiky, latency doesn't matter.

**Scheduled tasks** → Lambda. Why run a server 24/7 to execute a 5-minute job once a day?

**Low-traffic internal tools** → Lambda. Cost is negligible, don't want to maintain servers.

This isn't a compromise - it's using the right tool for each job.

## The Real Decision Criteria

Ask yourself:

1. Is traffic consistent and >50 req/s 24/7? → Probably cheaper on servers
2. Do I need persistent connections (WebSockets, DB pools)? → Servers
3. Does it run for >15 minutes? → Servers (or step functions)
4. Is p99 latency under 100ms critical? → Servers (unless you pay for provisioned concurrency)
5. Is traffic super spiky or near-zero most of the time? → Lambda
6. Is it triggered by AWS events (S3, SQS)? → Lambda is the easiest path
7. Am I okay with some occasional 200-500ms responses? → Lambda is fine

When I'm starting something new and don't know the traffic patterns yet, I default to Lambda. It's less to manage, scales automatically, and I can always move to servers later when the economics make sense.

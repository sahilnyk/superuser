---
title: "Why Serving LLMs Is So Damn Expensive"
description: "KV caches eat your GPU memory, batching is harder than it looks, and quantization might be your only hope."
publishedAt: 2025-05-20
draft: false
---

Running an LLM in production is expensive in ways that surprised me. A single A100 GPU costs $3-4/hour and might serve 20-50 concurrent users. Understanding why helps you optimize the right things.

## Prefill vs Decode: Two Different Bottlenecks

LLM inference has two phases that behave completely differently.

**Prefill** is when you feed in the prompt. All tokens get processed in parallel through the transformer. This is compute-bound - your GPU is actually busy doing matrix math.

**Decode** is generating tokens one at a time. Each token requires loading the entire model from memory, but only produces one single token. Your GPU spends most of its time waiting on memory bandwidth, not computing.

This is why a 1000-token prompt might process in 200ms, but generating 100 output tokens takes 2-3 seconds. Decode is the bottleneck.

## The KV Cache: Trading Memory for Speed

Here's the thing about transformers - each new token needs to "attend to" all previous tokens in the sequence. Without caching, you'd recompute attention for the whole sequence every time you generate a token. That's insane.

The KV cache stores the key and value matrices from all previous tokens. So when generating token N, you just look up the cached K/V from tokens 1 through N-1, and only compute fresh values for token N.

```
Without cache:
Token 1: process prompt (1000 tokens)
Token 2: process prompt + token 1 (1001 tokens)  
Token 3: process prompt + token 1-2 (1002 tokens)
...this is O(n²) and completely impractical

With KV cache:
Token 1: process prompt → cache K,V for all 1000 tokens
Token 2: load cached K,V → compute only for new token
Token 3: load cached K,V → compute only for new token
...now it's O(n)
```

The catch: KV cache is huge. For a 70B model with 32K context window, you can easily need 10-20GB of cache per request. This is why GPU memory limits how many users you can serve concurrently, not compute power.

## Batching Sounds Simple, Isn't

My first thought: just batch requests together, process them in parallel. Done.

Problem: requests finish at different times. User A wants 50 tokens, User B wants 300. Do you make User A wait for User B? That sucks. Do you return A early and waste the batch slot? That sucks too.

Modern inference servers (vLLM, TGI) use "continuous batching" - requests join and leave the batch dynamically. As soon as one finishes, a new one takes its slot. The batch is always full and always making progress.

This alone can 2-3x your throughput compared to naive static batching.

## PagedAttention: Borrowing from the OS

vLLM's key trick is treating KV cache like virtual memory. Instead of pre-allocating max context length for each request (wasting tons of memory), they allocate cache in fixed-size blocks and use a page table to track them.

When a sequence finishes, its blocks get freed immediately. No fragmentation, no wasted pre-allocation.

Real impact: I've seen vLLM serve 3-4x more concurrent requests than naive implementations on the same GPU.

## Quantization: Your Escape Hatch

A 70B parameter model in fp16 needs 140GB of GPU memory. Most consumer/prosumer GPUs have 24-48GB. You literally can't load the model.

Quantization reduces precision:

**int8 (8-bit):** Half the memory, quality loss is usually imperceptible. This is the sweet spot for production.

**int4 (4-bit):** Quarter the memory, quality starts degrading noticeably on complex reasoning tasks. But for most chatbot stuff, it's fine.

**GGUF Q4_K_M:** Even more aggressive quantization for running on CPU/Mac. Quality takes a real hit but better than nothing.

I quantize everything to int8 by default now. The quality difference is negligible and it lets me fit 2x the batch size or run bigger models.

## Speculative Decoding: The Clever Trick

This one blew my mind when I first learned it. Use a small 7B model to quickly generate candidate tokens, then verify them with your big 70B model in one parallel pass (like prefill).

```
Draft model (7B): generates 5 candidate tokens (~10ms)
Target model (70B): verifies all 5 in one shot (~50ms)
If 4 out of 5 correct: you got 4 tokens for the cost of one decode step
```

When the draft model's guesses are good (which they often are for common patterns), you effectively generate tokens 2-3x faster. And the verification guarantees mathematically identical output to just using the big model - no quality loss.

## What I Actually Do

When deploying an LLM:

1. **Use vLLM or TGI** - don't write your own serving code, continuous batching and PagedAttention are too important
2. **Quantize to int8** - barely any quality hit, halves your memory requirements  
3. **Profile first** - check if you're compute-bound or memory-bound before optimizing
4. **Optimize for throughput, not latency** - serving 50 users at 2s per response is better than 10 users at 1s each
5. **Consider longer context wisely** - KV cache scales linearly with context length, it adds up fast

The performance gap between naive inference and optimized inference is easily 5-10x. Most of those gains come from better memory management (PagedAttention, quantization) and better batching, not from fancy algorithmic tricks.

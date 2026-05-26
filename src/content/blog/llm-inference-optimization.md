---
title: "Why Running AI Models Is So Expensive"
description: "Simple explanation of why ChatGPT-like models cost so much to run and how companies make them faster."
publishedAt: 2025-05-20
draft: false
---

Running a large AI model like GPT-4 or Llama costs thousands of dollars per hour. A single GPU might only serve 20-50 people at once. Here's why it's so expensive and what people do about it.

## Two Steps: Reading and Writing

When an AI generates text, it does two things:

**Step 1: Read your prompt (fast)**

You type "Write me a story about a robot." The AI reads all those words at once, in parallel. This is fast - maybe 200ms.

**Step 2: Generate the response (slow)**

The AI writes one word at a time. "Once"... "upon"... "a"... "time"...

Each word requires loading the entire model from memory. And the model is HUGE - like 140GB. So each word takes time.

This is why you see responses appear word-by-word. The AI literally can't do it faster - it's limited by how fast it can read from memory.

## The Memory Problem

Think of it like this: you're writing an essay. Every time you write a new word, you have to re-read the entire encyclopedia. That's what the AI does.

The bigger the model, the more it has to read each time. A 70 billion parameter model needs to read 140GB from memory for every single word it generates.

**Why it matters:** Memory speed is the bottleneck, not thinking speed. Your expensive GPU is mostly just waiting.

## The KV Cache: Remember What You Read

Here's the clever trick. Instead of re-reading everything about previous words, the AI saves notes about them (called KV cache).

**Without cache:**
- Word 1: Read entire model
- Word 2: Read entire model again + remember word 1
- Word 3: Read entire model again + remember words 1-2
- (This is insane)

**With cache:**
- Word 1: Read model, save notes about word 1
- Word 2: Read model, look up notes about word 1
- Word 3: Read model, look up notes about words 1-2
- (Much better)

**The catch:** Those notes take up memory. A lot. For a long conversation with a big model, the cache can use 10-20GB per person.

That's why you can only serve 20-50 people on one GPU - you run out of memory for the cache.

## Batching: Serve Multiple People at Once

Instead of generating text for one person at a time, process multiple people in parallel.

**Without batching:**
- Person A: generate word (40ms)
- Person B: generate word (40ms)
- Person C: generate word (40ms)
- Total: 120ms for 3 words across 3 people

**With batching:**
- All at once: generate 3 words in parallel (40ms)
- Total: 40ms for 3 words across 3 people

This is how ChatGPT handles thousands of users - it groups requests together.

## Making Models Smaller (Quantization)

A 70 billion parameter model normally takes 140GB of memory. Too big for most GPUs.

Solution: use lower precision numbers. Like storing "3.14159" as just "3.14".

**Options:**
- **Full precision (fp16):** 140GB, best quality
- **8-bit (int8):** 70GB, almost same quality (this is the sweet spot)
- **4-bit (int4):** 35GB, quality drops but still usable

Most companies use 8-bit. You cut memory in half with barely any quality loss. This means you can:
- Run bigger models on smaller GPUs
- Serve more users at once
- Save money

## Speculative Decoding: Guess Ahead

This one's clever. Use a small, fast model to guess what words come next. Then check those guesses with the big model all at once.

**How it works:**

1. Small model guesses: "Once upon a time there"
2. Big model checks all 5 words in one shot (fast, like reading a prompt)
3. If 4 out of 5 are right, you just generated 4 words in the time it normally takes for 1

When it works well, you can generate text 2-3x faster with zero quality loss (the big model still verifies everything).

## What Companies Actually Do

When serving AI models in production:

**1. Use specialized software**

Tools like vLLM or Text Generation Inference handle the batching and caching automatically. Don't build this yourself.

**2. Quantize to 8-bit**

Cuts memory in half, barely affects quality. Easy win.

**3. Batch aggressively**

Process multiple users together. This is how you get from serving 10 people to serving 100.

**4. Profile first**

Check if you're limited by compute (GPU doing math) or memory (GPU waiting for data). Most of the time it's memory.

**5. Pick the right size**

Don't use a 70B model if a 13B model works fine. Smaller = faster + cheaper + more users per GPU.

## The Bottom Line

Running big AI models is expensive because:
- They're huge (100GB+)
- They need to load from memory for every word
- Memory is slower than compute
- You need massive GPUs

Companies make it cheaper by:
- Caching previous words (KV cache)
- Processing multiple users together (batching)
- Using lower precision numbers (quantization)
- Using small models to guess ahead (speculative decoding)

Even with all these tricks, a single A100 GPU ($3-4/hour) might only serve 50 concurrent users. That's why ChatGPT Plus costs $20/month - the infrastructure is expensive.

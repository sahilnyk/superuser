---
title: "Trying to Understand LLM Inference (as a Beginner)"
description: "I don't train models. I just got curious why a chatbot reply takes longer some days than others, so I went down a rabbit hole."
publishedAt: 2025-09-14
draft: false
---

I want to say upfront I'm not an ML person. I write regular backend code, and until recently "inference" was just a word I nodded along to in blog posts. What got me curious was noticing that some of my API calls to an LLM came back almost instantly, and others took several seconds for a similar-length prompt. I wanted to know why, without pretending I understand the math behind transformers.

The first thing that clicked for me: inference isn't one big calculation, it's the model generating one token, then the next, then the next, feeding its own output back in each time. That's why longer responses take longer, obviously, but it also explains why the first token can feel slow even for a short reply. There's a setup cost (loading the prompt into the model's attention) before generation even starts.

The other thing I didn't know: context length matters a lot more than I assumed. A longer prompt doesn't just cost more tokens, it costs more compute per token generated afterward, because the model has to attend to everything that came before. I'd been pasting huge chunks of text into prompts without thinking about that at all.

I also learned the word "batching" exists for a reason. If a server is running one request at a time, it's wasting a lot of the GPU. Providers batch multiple users' requests together so the hardware isn't sitting idle, which is part of why the same model can feel fast or slow depending on how busy things are, not just what you're asking it.

None of this makes me qualified to explain attention mechanisms to anyone. But I've stopped being confused about why my chatbot sometimes stalls, and that's a fine place to stop for now.

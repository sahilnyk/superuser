---
title: "I Ran a Local LLM Badly, and Learned Something Anyway"
description: "I tried running a quantized model on my own laptop out of curiosity and it was slow and my fan screamed, but I still learned more from it than any article had taught me."
publishedAt: 2026-07-02
draft: false
---

After my last post about inference I wanted to actually watch it happen instead of only reading about it, so I downloaded a small quantized model and ran it on my own laptop using Ollama just to poke at it. The first thing that surprised me was that "quantized" is not a scary word at all, because it just means the numbers inside the model are stored with less precision so the model takes less memory and runs faster while losing a bit of quality, and I had seen the word a dozen times before without realising it was that simple. A 7B model that would need a lot more RAM at full precision fit on my laptop without a problem once it was quantized down.

The second thing that surprised me was that my laptop fan told me exactly when the generation started and stopped, so I did not need a dashboard for it and the noise was enough. Watching `ollama run` push out the tokens one at a time, which was slower than I expected, made the whole idea of next-token prediction feel real to me instead of theoretical, because every single token had a cost that I could see.

I also understood for the first time why people care about tokens per second as a number, because when you only read about it then it is just a metric, but when you watch your own machine doing around 8 tokens a second while a hosted API does 80 the difference is not subtle and you feel the gap while you sit and wait for one sentence to finish.

I am still nowhere near understanding the actual internals of the model. But running something this small and this slow on my own hardware taught me more about what inference actually costs than any explainer article had taught me before.

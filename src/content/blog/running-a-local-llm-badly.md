---
title: "I Ran a Local LLM Badly, and Learned Something Anyway"
description: "Tried running a quantized model on my own laptop out of curiosity. It was slow, my fan screamed, and I still learned more than any article had taught me."
publishedAt: 2026-07-02
draft: false
---

After my last post about inference, I wanted to actually see it happen instead of just reading about it. So I downloaded a small quantized model and ran it locally with Ollama, just to poke at it.

First surprise: "quantized" isn't some scary term, it just means the model's numbers are stored with less precision so it takes up less memory and runs faster, at some cost to quality. I'd seen the word a dozen times without knowing it was that simple. A 7B model that would need way more RAM at full precision fit comfortably on my laptop once quantized down.

Second surprise: my laptop's fan told me exactly when generation started and stopped. No dashboard needed, just noise. Watching `ollama run` spit out tokens one at a time, slower than I expected, made the whole "next-token prediction" idea feel real instead of theoretical. Every token had a visible, physical cost.

I also finally understood why people care about tokens per second as a number. Reading about it, it's just a metric. Watching your own machine generate text at, say, 8 tokens a second versus a hosted API doing 80, the difference is not subtle. You feel the gap while staring at the screen waiting for a sentence to finish.

I'm still nowhere near understanding the actual model internals. But running something small and slow on my own hardware taught me more about what "inference" costs than any explainer article did. Sometimes you just have to let your fan scream at you.

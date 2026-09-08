---
title: "Trying to Understand LLM Inference (as a Beginner)"
description: "I do not train models, I just got curious about why a chatbot reply takes longer on some days than others, so I went down a rabbit hole."
publishedAt: 2025-09-14
draft: false
---

I want to say at the start that I am not an ML person, I write normal backend code and until recently the word "inference" was just something I nodded along to whenever I read it in a blog post. What made me curious was that some of my API calls to an LLM came back almost instantly while other calls took several seconds for a prompt of roughly the same length, so I wanted to understand why that happened without pretending that I understand the math behind transformers.

The first thing that made sense to me was that inference is not one big calculation, because the model generates one token and then the next token and then the next, and each time it feeds its own output back into itself. This is why a longer response takes longer, which is obvious, but it also explains why the first token can feel slow even on a short reply, because there is a setup cost while the prompt is loaded into the attention of the model before any generation starts.

The other thing I did not know is that context length matters much more than I assumed, because a longer prompt does not just cost more tokens, it costs more compute for every token that is generated after it, since the model has to attend to everything that came before it, and I had been pasting huge blocks of text into my prompts without thinking about this at all.

I also learned that "batching" is a word that exists for a reason, because a server that runs one request at a time is wasting a lot of the GPU, so the providers batch the requests of several users together to keep the hardware from sitting idle, and this is part of why the same model can feel fast or slow depending on how busy it is and not just on what you are asking it.

None of this makes me qualified to explain attention mechanisms to anyone. But I have stopped being confused about why my chatbot sometimes stalls, and for me that is enough for now.

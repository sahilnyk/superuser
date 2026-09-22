---
title: Trying to Understand LLM Inference (as a Beginner)
publishedAt: 2025-09-14
draft: false
---
Just a quick intro before starting. I am not an expert-level ML guy because my main focus has always been backend development and applied AI, mostly integrating existing AI models into systems whenever the product needs them.

But recently I came across multiple posts on LinkedIn and X where people were discussing inference, batching, tokens per second and KV cache. Tbh it gave me a bit of FOMO because I was using LLM <Claude and Codex>APIs but didnt properly understand what was happening behind those API calls, so I started reading about it and noted down everything in a simple way that other people like me can also understand.

Inference simply means using an already trained model to generate an output. The model is not learning from our prompt at that moment because its training has already happened. It is just using the patterns and information learned during training to predict what should come next based on the input we provide.

Most LLMs are built using an architecture called a Transformer. Before Transformers, language models commonly processed text more sequentially, which made it harder to handle long relationships in the text and limited how much work could be done in parallel. A Transformer uses attention to check how strongly each token is related to the other relevant tokens in the input, which helps it build a better understanding of the complete context. Since much of this work can happen in parallel during training and prompt processing, Transformers work well for large language models.

Before the model processes our prompt it first breaks the text into smaller pieces called tokens. A token can be a complete word, part of a word or even punctuation, so two prompts that look almost equal in length to us may still contain a different number of tokens.

After tokenization the inference process mainly happens in two stages: prefill and decode.

During prefill the model processes all the input tokens and prepares the information needed to generate the first output token. If I send a short question there is not much input to process, but if I paste a large code file along with error logs and the previous conversation then the model has to process all of it before the response can begin. This waiting period is why the first token may take longer to appear even when the final answer itself is short.

During decode the model generates the response one token at a time. After generating one token it adds that token to the existing context and uses the updated context to predict the next one, repeating the same process until the response is complete. This means a short answer usually finishes faster than a detailed explanation because every additional output token has to be generated through another decoding step.

Now if the model had to recalculate everything about every previous token before generating each new token then this process would become very slow, which is where the KV cache comes in.

A simple way to understand KV cache is to imagine that I am debugging a large codebase and writing down the useful information I find, such as where a function is defined and which files call it. When I need that information again I can check my notes instead of searching through the entire codebase from the beginning.

The KV cache does something similar for the model. While processing tokens it stores some of the attention calculations for the previous tokens, then reuses those stored results while generating the next token instead of repeating the same calculations. This makes generation faster, but those stored values take GPU memory and the required memory increases as the context becomes longer.

Then there is batching. Running one small request at a time may not use the GPU properly, so inference providers process requests from multiple users together. My request might be handled alongside someone summarising a document and another person generating code, which allows the provider to use more of the available GPU capacity.

Because of this the speed of an API call does not depend only on the visible length of my prompt. It can also depend on the actual number of tokens, the amount of generated output, the model being used, the available GPU memory, the number of requests being handled and how the inference server schedules them.

So when two prompts look almost the same but one responds faster there may be multiple reasons behind it. One might contain more tokens, one might require a longer response or one might have reached the server while it was processing more requests.

I still dont understand all the maths behind attention or everything happening inside each Transformer layer, but now inference is no longer just another word I nod along to whenever I see it in a post. I at least understand what happens after I send an API request and why the model sometimes responds instantly while other times it takes a few seconds.

I understood a lot of this from [How LLM Inference Works](https://arpitbhayani.me/blogs/how-llm-inference-works) by Arpit Bhayani.
---
title: "AWS SQS: What I Wish Someone Told Me First"
description: "Simple explanations of queues, timeouts, and the mistakes that cost me hours of debugging."
publishedAt: 2025-04-15
draft: false
---

SQS is Amazon's message queue. Think of it like a to-do list for your app. You add tasks to the list, and workers pick them up and complete them.

Sounds simple, right? I thought so too. Then things went wrong.

## What's a Queue Anyway?

Imagine you run a pizza shop. Orders come in faster than you can make pizzas. So you write each order on a sticky note and stick it on the wall. Your pizza makers grab notes one by one and make those pizzas.

That's a queue. Orders are messages. Pizza makers are workers. The wall is SQS.

## Standard vs FIFO Queues

AWS gives you two types:

**Standard Queue** - Fast but messy
- Can handle tons of messages per second
- But sometimes a message shows up twice
- And orders might get mixed up

**FIFO Queue** - Organized but slower  
- Messages arrive in exact order
- Never duplicates
- But limited to 3,000 messages per second

I always picked FIFO at first because "order matters!" Then I hit the speed limit hard.

**What I do now:** Use Standard queues. They're faster and cheaper. Just make sure your code can handle seeing the same message twice (more on that later).

## Visibility Timeout: The Sneaky Problem

This confused me for days. Here's what happens:

1. Your code grabs a message from the queue
2. SQS hides that message for 30 seconds (default)
3. If your code doesn't delete it within 30 seconds, the message becomes visible again
4. Another worker grabs the same message
5. Now two workers are doing the same job!

**My mistake:** I had a task that took 45 seconds. The timeout was 30 seconds. So halfway through processing, the message would reappear and get picked up again. Double work!

**The fix:** Make the timeout longer than your longest job.

```python
# If your job takes 60 seconds, give it 3 minutes
sqs.set_queue_attributes(
    QueueUrl=queue_url,
    Attributes={
        'VisibilityTimeout': '180'  # 180 seconds = 3 minutes
    }
)
```

Simple rule: timeout should be 3x your typical job time.

## Dead Letter Queues: Your Safety Net

Picture this: someone sends a broken message to your queue. Your code tries to process it, fails, and crashes. The message goes back to the queue. Another worker picks it up. Crashes again. Over and over.

That one bad message stops everything. Your queue is stuck.

**Dead Letter Queue (DLQ) saves you:**

After the message fails 3 times, SQS automatically moves it to a separate "failed messages" queue. Your main queue keeps working. You can check the DLQ later to see what broke.

```python
import boto3
import json

sqs = boto3.client('sqs')

# Step 1: Create the backup queue for failed messages
dlq = sqs.create_queue(QueueName='failed-orders-queue')

# Step 2: Tell main queue to use it after 3 failures
sqs.create_queue(
    QueueName='orders-queue',
    Attributes={
        'RedrivePolicy': json.dumps({
            'deadLetterTargetArn': 'arn:of:dlq:here',
            'maxReceiveCount': '3'  # fail 3 times → move to DLQ
        })
    }
)
```

Set up an alert when messages land in the DLQ. That way you know when something's broken.

## Long Polling Cut My AWS Bill in Half

Early on, my SQS costs were weirdly high. I was polling every second, getting empty responses most of the time. Each poll counted as a request.

Short polling (the default) returns immediately whether or not there are messages. So you end up doing thousands of polls per minute just to stay responsive.

Long polling waits up to 20 seconds for messages to arrive:

```python
# Bad: returns immediately with 0 messages most of the time
response = sqs.receive_message(QueueUrl=queue_url)

# Good: waits up to 20 seconds for messages
response = sqs.receive_message(
    QueueUrl=queue_url,
    WaitTimeSeconds=20,
    MaxNumberOfMessages=10
)
```

One long poll can replace 20 short polls. My SQS costs dropped like 60% when I switched.

## Send Messages in Batches (Save Money)

I was sending 100 messages like this:

```python
# Send one at a time - costs 100 API calls
for order in orders:
    sqs.send_message(QueueUrl=queue_url, MessageBody=order)
```

AWS charges per API call. This cost me $10 when it should've cost $1.

**Send in batches instead:**

```python
# Send 10 at once - costs only 10 API calls
batch = []
for order in orders:
    batch.append({'Id': str(len(batch)), 'MessageBody': order})
    
    if len(batch) == 10:  # SQS max is 10 per batch
        sqs.send_message_batch(QueueUrl=queue_url, Entries=batch)
        batch = []
```

10 messages in one request = 10x cheaper. Always batch.

## Fan-Out: One Message, Multiple Services

Say a user places an order. You need to:
1. Send them an email
2. Post to Slack  
3. Log it for analytics

**Bad way:** Your code sends to 3 different queues.

**Better way:** Use SNS (another AWS service) to broadcast:

```
Order placed → SNS topic (like a loudspeaker)
               ↓
               ├→ Email queue
               ├→ Slack queue
               └→ Analytics queue
```

You publish once. SNS copies it to all three queues. Each service processes at its own pace. If email is slow, Slack isn't affected.

## Things That Bit Me

**1. Handle duplicates**

Standard queues sometimes deliver the same message twice. Your code must check "did I already do this?"

```python
# Check if already processed
if order_id in processed_orders:
    return  # Skip it
    
# Process and remember
process_order(order_id)
processed_orders.add(order_id)
```

**2. Delete AFTER processing, not before**

I once wrote code that deleted the message first, then processed it. The code crashed mid-processing. Message gone, work not done. Lost data.

Always: process first, then delete.

**3. Messages can't be huge**

Max size is 256KB. If you need to send big data, store it in S3 first, then send the S3 link in the message.

**4. Watch your queue depth**

If messages pile up faster than you can process them, add more workers. AWS can auto-scale based on queue size.

## The Bottom Line

SQS is great when you understand these patterns. It absorbs traffic spikes, keeps your app responsive, and costs pennies if you batch and use long polling.

My queue has processed millions of messages with zero manual intervention. Just make sure to:
- Use long polling (WaitTimeSeconds=20)
- Batch your sends
- Set visibility timeout higher than job time  
- Add a dead letter queue for safety

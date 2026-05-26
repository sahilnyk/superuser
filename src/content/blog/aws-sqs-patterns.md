---
title: "SQS Patterns I Learned the Hard Way"
description: "Dead letter queues saved me, visibility timeouts burned me, and why I stopped using FIFO queues for everything."
publishedAt: 2025-04-15
draft: false
---

I thought SQS was simple. Put messages in queue, read them out, delete when done. What could go wrong?

Then I watched a payment get processed twice because I didn't understand visibility timeouts. Debugged a queue that mysteriously stopped processing after hitting 1 million messages. Paid AWS way more than I should have because of short polling.

## Standard vs FIFO (Just Use Standard)

When I started, I defaulted to FIFO queues because "guaranteed ordering" sounded obviously better. Then I hit the throughput limits.

FIFO caps at 300 messages/sec normally, 3,000 with batching. Standard gives you basically unlimited throughput - tens of thousands per second, no problem.

The tradeoff: Standard queues can deliver messages more than once, and not always in order.

My take after a few years: just use Standard and make your consumers idempotent. It's way simpler than architecting around FIFO's throughput limits. The only time I reach for FIFO now is when ordering is genuinely critical - like processing bank transactions in sequence.

## Visibility Timeout Kicked My Ass

This one took me a while to understand. When your code receives a message, SQS doesn't delete it immediately. It just hides it for X seconds (default 30). If you don't explicitly delete the message in that time, it pops back up and another worker grabs it.

I had a job that took 45 seconds to process. Kept seeing duplicates. Took me embarrassingly long to realize the visibility timeout was expiring mid-processing.

The fix: set visibility timeout to at least 2-3x your job duration. Give yourself breathing room.

```python
# If your job takes ~60 seconds, set timeout way higher
sqs.set_queue_attributes(
    QueueUrl=queue_url,
    Attributes={
        'VisibilityTimeout': '180'  # 3 minutes, not 30 seconds
    }
)
```

## Dead Letter Queues Saved My Weekend

Here's what happened: a malformed message got into my queue. My consumer would pick it up, fail to parse the JSON, crash, and not delete the message. It would become visible again 30 seconds later. Repeat forever.

The queue basically stalled. That one poison message got picked up over and over, blocking everything behind it.

Dead letter queues fix this. After N failed receive attempts (I use 3), SQS automatically moves the message to a separate "dead letter" queue.

```python
import boto3
import json

sqs = boto3.client('sqs')

# Create DLQ
dlq_response = sqs.create_queue(QueueName='my-queue-dlq')
dlq_url = dlq_response['QueueUrl']

# Get DLQ ARN
dlq_attrs = sqs.get_queue_attributes(
    QueueUrl=dlq_url,
    AttributeNames=['QueueArn']
)
dlq_arn = dlq_attrs['Attributes']['QueueArn']

# Main queue points to DLQ
sqs.create_queue(
    QueueName='my-queue',
    Attributes={
        'RedrivePolicy': json.dumps({
            'deadLetterTargetArn': dlq_arn,
            'maxReceiveCount': '3'
        })
    }
)
```

Now poison messages go to the DLQ instead of blocking your queue forever. Set up a CloudWatch alarm for DLQ depth > 0 so you get paged when something's wrong.

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

## Always Batch Your Sends and Deletes

I was sending messages one at a time like an idiot. SQS charges per API call, not per message. Sending 10 messages individually costs 10x more than sending them as one batch.

```python
# Expensive - 100 API calls
for item in items:
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(item)
    )

# Cheap - 10 API calls (batch size maxes at 10)
for i in range(0, len(items), 10):
    batch = items[i:i+10]
    entries = [
        {'Id': str(j), 'MessageBody': json.dumps(item)}
        for j, item in enumerate(batch)
    ]
    sqs.send_message_batch(QueueUrl=queue_url, Entries=entries)
```

Same deal with deletes. Always batch.

## Fan-Out with SNS

Once needed to send order confirmations to three different services - email, Slack notification, and analytics. My first instinct was to write code that sends to three different SQS queues.

Don't do this. Use SNS as a pub/sub layer:

```
Order placed → SNS topic
               ↓ (subscribes to topic)
               ├→ SQS queue (email service)
               ├→ SQS queue (slack service)
               └→ SQS queue (analytics)
```

Publish once to SNS. It fans out to all the SQS queues automatically. If one consumer is slow or down, doesn't affect the others.

## What I Wish I'd Known Earlier

**Make consumers idempotent.** Standard queues will occasionally deliver the same message twice. Your code needs to handle this. Check if you've already processed this order ID, user ID, whatever.

**Delete after processing, not before.** Obvious in hindsight, but I've seen code that deletes the message, then tries to process it, then crashes. Now the message is gone but the work didn't happen.

**Message size limit is 256KB.** Hit this trying to queue up large JSON objects. Solution: store the data in S3, put the S3 key in the message body.

**Monitor `ApproximateAgeOfOldestMessage`.** If this number keeps growing, your consumers are falling behind. Time to scale up.

## When Queue Depth Grows

Sometimes your queue backs up. Orders are coming in faster than you can process them. This is fine - that's what queues are for.

If it's temporary, just let it ride. SQS holds messages for 14 days by default.

If it's persistent, auto-scale your consumers based on queue depth. I usually target around 100 messages per consumer instance. When depth exceeds that, spin up more workers.

```python
# Scale based on this CloudWatch metric
ApproximateNumberOfMessages / DesiredConsumerInstances
```

The beauty of SQS is it buffers the spikes. Your API doesn't slow down waiting for background jobs. Queue grows, consumers catch up when they can.

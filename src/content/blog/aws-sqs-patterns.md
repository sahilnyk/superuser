---
title: "SQS Mistakes That Cost Me a Weekend"
description: "The time I processed the same payment twice, killed my queue with one bad message, and burned $200 on polling."
publishedAt: 2025-04-15
draft: false
---

I thought queues were simple. Add message, process message, done. Then I shipped to production and everything broke.

## The Double Payment Disaster

First week, I get a Slack message: "User was charged twice for the same order."

I check the logs. Same order ID, processed twice, 40 seconds apart. What the hell?

Turns out I didn't understand visibility timeout. Here's what happened:

```python
# My broken code
def process_orders():
    while True:
        messages = sqs.receive_message(QueueUrl=queue_url)
        
        for msg in messages.get('Messages', []):
            order = json.loads(msg['Body'])
            process_payment(order)  # Takes 45 seconds
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=msg['ReceiptHandle']
            )
```

The default visibility timeout is 30 seconds. My payment processing took 45 seconds. So here's what happened:

```
0:00  - Worker 1 grabs message
0:30  - Timeout expires, message becomes visible again
0:31  - Worker 2 grabs the SAME message
0:45  - Worker 1 finishes, deletes message
0:46  - Worker 2 finishes, tries to delete (already gone), charges user again
```

Two payments. One very angry user. I had to refund manually.

**The fix:**

```python
# Set visibility timeout to 3x your longest job
sqs.create_queue(
    QueueName='payments',
    Attributes={
        'VisibilityTimeout': '180'  # 3 minutes for 45-sec job
    }
)
```

Now when a worker grabs a message, it stays hidden for 3 minutes. Plenty of time.

## The Poison Message That Killed Everything

Month later, different problem. Queue stopped processing. 50,000 messages backed up. My on-call phone wouldn't stop ringing.

I SSH into a worker and check logs:

```
[ERROR] Failed to parse message: Expecting value: line 1 column 1
[ERROR] Failed to parse message: Expecting value: line 1 column 1
[ERROR] Failed to parse message: Expecting value: line 1 column 1
```

Same error, over and over. Someone sent a malformed message. My code would:

1. Grab the message
2. Try to parse JSON
3. Crash
4. Message goes back to queue (not deleted)
5. Next worker grabs it
6. Repeat forever

One bad message blocked 50,000 legitimate orders.

```python
# My broken code (no error handling)
def process_orders():
    messages = sqs.receive_message(QueueUrl=queue_url)
    for msg in messages.get('Messages', []):
        order = json.loads(msg['Body'])  # This crashes on bad JSON
        process_order(order)
        sqs.delete_message(...)
```

**The fix: Dead Letter Queue**

```python
# Step 1: Create a "failed messages" queue
dlq_response = sqs.create_queue(QueueName='orders-dlq')
dlq_url = dlq_response['QueueUrl']

# Get its ARN
dlq_arn = sqs.get_queue_attributes(
    QueueUrl=dlq_url,
    AttributeNames=['QueueArn']
)['Attributes']['QueueArn']

# Step 2: Tell main queue to move messages after 3 failures
sqs.create_queue(
    QueueName='orders',
    Attributes={
        'RedrivePolicy': json.dumps({
            'deadLetterTargetArn': dlq_arn,
            'maxReceiveCount': '3'
        })
    }
)
```

Now if a message fails 3 times, SQS automatically moves it to the DLQ. Main queue keeps flowing. I check the DLQ once a day to see what broke.

I also added better error handling:

```python
def process_orders():
    messages = sqs.receive_message(QueueUrl=queue_url)
    
    for msg in messages.get('Messages', []):
        try:
            order = json.loads(msg['Body'])
            process_order(order)
            
            # Only delete if successful
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=msg['ReceiptHandle']
            )
        except json.JSONDecodeError:
            print(f"Bad JSON: {msg['Body']}")
            # Don't delete - let it go to DLQ after 3 tries
        except Exception as e:
            print(f"Processing failed: {e}")
            # Don't delete - will retry
```

## The $200 AWS Bill From Doing Nothing

Got my AWS bill: $200 for SQS. I was barely using it. What happened?

Turns out I was short polling:

```python
# This is expensive
while True:
    response = sqs.receive_message(QueueUrl=queue_url)
    
    if 'Messages' in response:
        process(response['Messages'])
    
    time.sleep(1)  # Check every second
```

Every call to `receive_message` is a request. Even if there are no messages. I was making:
- 1 request per second
- 60 per minute  
- 3,600 per hour
- 86,400 per day
- 2.6 million per month

At $0.40 per million requests = $1.04/day = $31/month. But I had 5 queues doing this. $155/month just to check for messages.

**Long polling fixed it:**

```python
while True:
    response = sqs.receive_message(
        QueueUrl=queue_url,
        WaitTimeSeconds=20,  # Wait up to 20 seconds for messages
        MaxNumberOfMessages=10  # Grab up to 10 at once
    )
    
    if 'Messages' in response:
        process(response['Messages'])
```

Now each call waits up to 20 seconds. If a message arrives in that time, it returns immediately. If not, it waits the full 20 seconds before returning empty.

Requests dropped from 2.6M/month to 130K/month. Bill went from $155 to $8.

## Batching: Send 10x Fewer Requests

I was also sending messages wrong:

```python
# Expensive - 100 API calls
for order in orders:
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(order)
    )
```

SQS charges per request. This costs 100x more than it should.

**Fixed:**

```python
# Cheap - 10 API calls (SQS batches max 10)
def send_in_batches(orders):
    for i in range(0, len(orders), 10):
        batch = orders[i:i+10]
        
        entries = [
            {
                'Id': str(idx),
                'MessageBody': json.dumps(order)
            }
            for idx, order in enumerate(batch)
        ]
        
        sqs.send_message_batch(
            QueueUrl=queue_url,
            Entries=entries
        )

send_in_batches(orders)
```

Same with deletes - batch them:

```python
# Process and collect receipt handles
receipts = []
for msg in messages:
    process(msg)
    receipts.append({
        'Id': str(len(receipts)),
        'ReceiptHandle': msg['ReceiptHandle']
    })

# Delete in batch
if receipts:
    sqs.delete_message_batch(
        QueueUrl=queue_url,
        Entries=receipts
    )
```

## What I Actually Run Now

Here's my production worker code:

```python
import boto3
import json
import time

sqs = boto3.client('sqs')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/xxx/orders'

def process_worker():
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=20,
                VisibilityTimeout=180
            )
            
            messages = response.get('Messages', [])
            if not messages:
                continue
            
            receipts = []
            
            for msg in messages:
                try:
                    order = json.loads(msg['Body'])
                    
                    # Check if already processed (idempotency)
                    if already_processed(order['id']):
                        receipts.append({
                            'Id': str(len(receipts)),
                            'ReceiptHandle': msg['ReceiptHandle']
                        })
                        continue
                    
                    # Process the order
                    process_order(order)
                    mark_as_processed(order['id'])
                    
                    # Queue for deletion
                    receipts.append({
                        'Id': str(len(receipts)),
                        'ReceiptHandle': msg['ReceiptHandle']
                    })
                    
                except Exception as e:
                    print(f"Failed to process: {e}")
                    # Don't add to receipts - will retry or go to DLQ
            
            # Delete successfully processed messages in batch
            if receipts:
                sqs.delete_message_batch(
                    QueueUrl=QUEUE_URL,
                    Entries=receipts
                )
                
        except Exception as e:
            print(f"Worker error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    process_worker()
```

This handles:
- Long polling (saves money)
- Batching (saves money)
- Idempotency checks (prevents double processing)
- Error handling (bad messages go to DLQ)
- Proper deletion (only after success)

Been running this for 2 years. Processed millions of orders. Zero incidents.

## Key Takeaways

1. **Set visibility timeout to 3x your job time** or you'll process messages twice
2. **Always use a dead letter queue** or one bad message kills everything
3. **Use long polling** (`WaitTimeSeconds=20`) or pay 20x more
4. **Batch everything** - sends, receives, deletes
5. **Make your code idempotent** - check if you already processed this message

SQS is solid once you understand these patterns. Just took me a few production incidents to learn them.

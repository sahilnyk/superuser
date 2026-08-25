---
title: "What Deploying on AWS Actually Taught Me"
description: "A small project pushed me into EC2, S3, and IAM for the first time. Here's what stuck."
publishedAt: 2026-02-18
draft: false
---

I'd used AWS before, but only by clicking around the console following a tutorial. This time I actually deployed something of my own, a small app with a Node backend, and had to figure out the pieces myself.

The EC2 side was the easy part. Spin up a t3.micro, SSH in, install Node, clone the repo, run it behind a reverse proxy. That's maybe an hour of work if you already know Linux basics. The part that actually taught me something was IAM.

I made the classic mistake early on: gave my app instance a wide-open IAM role because I didn't want to deal with permissions while debugging. It worked, obviously, and I moved on. A few days later I sat down and scoped it properly, one role with access to exactly one S3 bucket and nothing else. It's a small thing, but it changed how I think about access in general: default to nothing, add only what the app actually touches.

S3 ended up being where most of the "AWS is nice" feeling came from. Static assets, user uploads, a couple of backups, all offloaded from the instance itself. The instance stays small and disposable, which is really the whole point of not treating a server like a pet.

What made it click for me was realizing how well these pieces are meant to work together. EC2 for compute, S3 for storage, IAM gluing the permissions between them, and you can tear down and rebuild the compute layer without touching your data. Managing it isn't hard once you stop trying to do everything manually through the console and start thinking of the setup as pieces that snap together.

Would I reach for a bigger managed service (ECS, Lambda, whatever) for something more serious? Probably. But for a small project, EC2 plus S3 plus a properly scoped IAM role is close to the sweet spot of easy to deploy and easy to reason about.

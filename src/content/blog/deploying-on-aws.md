---
title: "What Deploying on AWS Actually Taught Me"
description: "A small project pushed me into EC2, S3 and IAM for the first time, and this is what actually stuck with me."
publishedAt: 2026-02-18
draft: false
---

I had used AWS before but only by clicking around inside the console while following a tutorial, so this time I actually deployed something of my own, which was a small app with a Node backend, and I had to work out the pieces by myself. The EC2 part was the easy one for me, because you spin up a t3.micro, SSH into it, install Node, clone the repo and run it behind a reverse proxy, and that is maybe an hour of work if you already know the Linux basics. The part that actually taught me something was IAM.

Early on I made the classic mistake, which is that I gave the app instance a wide open IAM role because I did not want to deal with permissions while I was still debugging, so it worked and I moved on. A few days later I sat down and scoped the role properly, so now it is one role with access to exactly one S3 bucket and nothing else, and this is a small thing but it changed how I think about access in general, because now I default to giving nothing and only add what the app actually touches.

S3 is where most of my "AWS is nice" feeling came from, because the static assets and the user uploads and a couple of backups all moved off the instance itself, so the instance stays small and disposable which is the whole point of not treating a server like a pet.

What made it click for me was seeing how well these pieces are meant to work together, because EC2 is for the compute and S3 is for the storage and IAM holds the permissions between them, so you can tear down and rebuild the compute layer without ever touching your data. Managing it is not hard once you stop trying to do everything by hand through the console and start thinking of the setup as pieces that connect together.

If I had something more serious then I would probably reach for a bigger managed service like ECS or Lambda, but for a small project the EC2 and S3 and a properly scoped IAM role are close to the sweet spot of being easy to deploy and easy to reason about.

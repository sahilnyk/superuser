---
title: "The LAMP Stack Still Just Works"
description: "I set up Linux, Apache, MySQL, and PHP for a client project and remembered why this stack refuses to die."
publishedAt: 2026-05-06
draft: false
---

A client needed a simple site with a login system and a database behind it. Nothing fancy. My first instinct was to reach for the usual modern setup, a Node backend, maybe a hosted Postgres instance, a build pipeline. Then I stopped and asked myself if any of that was actually needed here. It wasn't, so I went with LAMP instead.

Setting it up on a fresh Ubuntu box took under an hour:

```bash
sudo apt update
sudo apt install apache2 mysql-server php libapache2-mod-php php-mysql
sudo systemctl enable --now apache2 mysql
```

Point Apache at the project directory, create a database and a user, and PHP just runs. No build step, no bundler config, no separate process to keep alive. The whole stack is four well-understood pieces that have been running production sites since before I could code.

The part I appreciated most was how boring the maintenance is. `apt upgrade` handles security patches for Apache and MySQL. A single `mysqldump` cron job handles backups. If Apache falls over, systemd restarts it, no PM2 or supervisor layer needed on top. There's no separate deploy pipeline: I push files over SFTP, and they're live.

I get why people move past LAMP for anything with real scale or complex state. But for a small site that just needs to exist and not break, it's hard to beat something this well documented and this easy to hand off. The client's own hosting support team can SSH in and understand exactly what's running, because it's the same stack half the internet has been running for two decades.

Sometimes the boring choice is the correct one.

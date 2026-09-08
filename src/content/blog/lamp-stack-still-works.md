---
title: "The LAMP Stack Still Just Works"
description: "I set up Linux, Apache, MySQL and PHP for a client project and it reminded me why this stack still refuses to die."
publishedAt: 2026-05-06
draft: false
---

A client asked me to build a simple site with a login system and a database behind it and nothing more than that, so my first instinct was to reach for the setup I normally reach for, which is a Node backend with a hosted Postgres instance and a build pipeline on top of it. Then I stopped and asked myself whether any of that was actually needed for this project, and it was not, so I went with the LAMP stack instead.

Setting it up on a fresh Ubuntu machine took me less than an hour:

```bash
sudo apt update
sudo apt install apache2 mysql-server php libapache2-mod-php php-mysql
sudo systemctl enable --now apache2 mysql
```

After that I pointed Apache at the project directory, created a database and a user, and the PHP just ran, so there was no build step and no bundler config and no separate process that I had to keep alive. The whole stack is four pieces that are well understood and have been running production sites since before I could write code.

The part that mattered most to me was how boring the maintenance is, because `apt upgrade` takes care of the security patches for Apache and MySQL, a single `mysqldump` cron job takes care of the backups, and if Apache falls over then systemd just restarts it so there is no PM2 or supervisor layer sitting on top of it. There is also no deploy pipeline, I push the files over SFTP and they are live.

I understand why people move past LAMP for anything that has real scale or complex state, but for a small site that just needs to exist and not break it is hard to beat something that is this well documented and this easy to hand off, because the client's own hosting support team can SSH into the machine and understand exactly what is running when it is the same stack that half the internet has been running for two decades.

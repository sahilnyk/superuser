---
title: "Ditching nohup for systemd"
description: "How I stopped babysitting a Python script in a tmux session and let systemd handle it properly."
publishedAt: 2025-12-10
draft: false
---

For way too long, I ran a small background worker (a script that polls an API and writes to a database) inside a tmux session on a cheap VPS. Every time the server rebooted, or the script crashed, I had to SSH in, reattach, and restart it by hand. It worked, technically, but it was fragile and I hated depending on my own memory to keep a process alive.

The fix was a systemd unit file. Fifteen minutes of setup and the problem was gone for good.

I put the script's dependencies in a virtualenv and wrote a unit file at `/etc/systemd/system/poller.service`:

```ini
[Unit]
Description=API poller worker
After=network.target

[Service]
ExecStart=/home/sahil/poller/venv/bin/python /home/sahil/poller/run.py
Restart=on-failure
RestartSec=5
User=sahil
WorkingDirectory=/home/sahil/poller

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable poller.service
sudo systemctl start poller.service
```

That's it. If the script dies, `Restart=on-failure` brings it back after five seconds. If the box reboots, `enable` means it starts on its own, no tmux, no manual restart. Checking on it is just:

```bash
systemctl status poller.service
journalctl -u poller.service -f
```

The logs go straight into journalctl, so I stopped redirecting output to some log file I'd forget to rotate. I also moved a couple of cron jobs to systemd timers for the same reason: one place to check status, one place to check logs, and none of it depends on a terminal staying open.

Small change, but it's the kind of thing that should have been day-one setup instead of something I fixed a year in.

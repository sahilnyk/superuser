---
title: "Ditching nohup for systemd"
description: "How I stopped babysitting a Python script inside a tmux session and let systemd handle it properly."
publishedAt: 2025-12-10
draft: false
---

For a long time I was running a small background worker on a cheap VPS, and it is just a script that polls an API and writes the results into a database, but I was keeping it alive inside a tmux session. Every time the server rebooted or the script crashed I had to SSH into the machine, reattach to the tmux session and start the script again by hand, so it worked in a technical sense but it was fragile and I did not like that keeping the process alive depended on me remembering to do it.

The fix for this was a systemd unit file, and it took me around fifteen minutes to set up after which the problem was gone for good.

I put the dependencies of the script into a virtualenv and wrote a unit file at `/etc/systemd/system/poller.service`:

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

Then I ran:

```bash
sudo systemctl daemon-reload
sudo systemctl enable poller.service
sudo systemctl start poller.service
```

After this, if the script dies then `Restart=on-failure` brings it back after five seconds, and if the machine reboots then `enable` means the script comes up on its own, so there is no tmux involved and no manual restart from me. Checking on it is just:

```bash
systemctl status poller.service
journalctl -u poller.service -f
```

The logs now go straight into journalctl, so I stopped redirecting the output into some log file that I would forget to rotate later. I also moved a couple of cron jobs over to systemd timers for the same reason, because now there is one place where I check the status and one place where I check the logs and none of it depends on a terminal staying open somewhere. This was a small change but it is the kind of thing that I should have set up on day one instead of getting to it a year later.

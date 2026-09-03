---
title: "Objection Quick Reference"
date: 2026-09-03
draft: false
description: "Common objection commands for exploring and patching Android apps."
topics: ["android"]
---

[Objection](https://github.com/sensepost/objection) wraps Frida in a friendly REPL, useful for quick exploration without writing scripts.

## Getting started

```bash
pip install objection
objection patchapk -s app.apk        # embed the gadget
objection explore                    # attach to a running app
```

## Common commands

| Command | Purpose |
| --- | --- |
| `android hooking list activities` | Exported activities |
| `android hooking watch class <cls>` | Trace every method of a class |
| `android root disable` | Bypass common root checks |
| `android sslpinning disable` | Bypass SSL pinning attempts |
| `memory list modules` | Loaded native libraries |

> `android sslpinning disable` is a best-effort heuristic; complex pinning (OkHttp CertificatePinner, custom TrustManager) usually needs a hand-written Frida script.
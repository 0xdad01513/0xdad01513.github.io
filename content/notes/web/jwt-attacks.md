---
title: "JWT Attacks"
date: 2026-09-03
draft: false
description: "Common pitfalls in JSON Web Token implementations."
topics: ["web"]
---

A JWT is `base64url(header).base64url(payload).signature`. Most attacks target the signature verification step.

## alg: none

Strip the signature and change the header algorithm:

```json
{ "alg": "none", "typ": "JWT" }
```

Some libraries accept a token with an empty signature section.

## Key confusion

If the server verifies with an RSA **public** key but the library accepts HS256, sign the token with the public key as an HMAC secret.

## Weak HMAC secret

`alg: HS256` with a short or common secret is crackable:

```bash
hashcat -m 16500 jwt.txt -a 3 ?a?a?a?a?a?a
```

## Checklist

- [ ] Try `alg: none` and empty signature
- [ ] Try RS256 → HS256 key confusion
- [ ] Brute-force weak HMAC secrets
- [ ] Check `jku` / `x5u` / `kid` header injection
- [ ] Check expiry (`exp`) is actually validated
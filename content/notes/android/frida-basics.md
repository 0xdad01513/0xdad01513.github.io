---
title: "Frida Hooking Basics"
date: 2026-09-03
draft: false
description: "Attaching to processes, intercepting methods and tracing calls with Frida."
topics: ["android"]
---

Frida is the swiss-army knife of dynamic instrumentation: it injects a JavaScript runtime into the target process and lets you hook functions on the fly.

## Attaching to a process

The simplest workflow is attaching to a running app and listing its classes:

```javascript
Java.perform(function () {
  console.log("Attached to:", Process.id);
});
```

Run it with:

```bash
frida -U -l script.js com.example.app
```

## Intercepting a method

```javascript
Java.perform(function () {
  var Activity = Java.use("com.example.app.MainActivity");
  Activity.onCreate.overload("android.os.Bundle").implementation = function (bundle) {
    console.log("onCreate called");
    this.onCreate(bundle);
  };
});
```

## Useful one-liners

- Enumerate loaded classes: `Java.enumerateLoadedClasses()`
- List methods of a class: `Java.use("...").class.getDeclaredMethods()`
- Spawn the app instead of attaching: `frida -U -f com.example.app --no-pause`
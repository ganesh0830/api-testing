# Rest API Testing Framework Installation

## Install Node.js

Download Node.js LTS from [https://nodejs.org/en/download/](https://nodejs.org/en/download/) and install on your system.

## Atos web proxies
**Important:** If you are working behind a Atos web proxy please read this about setting up a [Cntlm Authentication Proxy](proxy-setup.md). Setting up a ntlm authentication proxy is the best way to work behind a Atos web proxy server. 

## Setup proxy for NPM

If you are setting up the project behind a proxy you will need configure a proxy server for downloading the dependencies packages from NPM.

Below is an example for setting up the proxy using Cntlm Authentication Proxy from the "Atos web proxies" section. 

```
npm config set https_proxy "http://127.0.0.1:3128"
npm config set proxy "http://127.0.0.1:3128"
```

## Setup proxy for NPM with Atos Web proxy

**This is only if you want to use NPM with the Atos Web Proxy. This is not recommended! Instead setup a [Cntlm Authentication Proxy](proxy-setup.md).** 

If you are setting up the project behind a proxy you will need configure a proxy server for downloading the dependencies packages from NPM.

Below is an example for setting up the proxy. Please carefully replace DASID and PASSWORD with your own DAS ID and password. Be careful not to remove %5C after the ww930.

```
npm config set https_proxy "http://ww930%5CDASID:PASSWORD@10.87.140.12:84"
npm config set proxy "http://ww930%5CDASID:PASSWORD@10.87.140.12:84"
```

## Installation of the Rest API Testing Framework
Download or clone the Rest API Testing Framework in to a folder called 
Rest-API-Testing-Framework on the server or developerment system. Within that folder run the command:

```
npm install
```
This will install the dependencies the Rest API Testing Framework requires.  You are now ready to use the Rest API Testing Framework!
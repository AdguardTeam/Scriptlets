## <a id="redirect-resources"></a> Available Redirect resources
* [1x1-transparent.gif](#1x1-transparent.gif)
* [2x2-transparent.png](#2x2-transparent.png)
* [3x2-transparent.png](#3x2-transparent.png)
* [32x32-transparent.png](#32x32-transparent.png)
* [noopframe](#noopframe)
* [noopcss](#noopcss)
* [noopjs](#noopjs)
* [noopjson](#noopjson)
* [nooptext](#nooptext)
* [empty](#empty)
* [noopvmap-1.0](#noopvmap-1.0)
* [noopvast-2.0](#noopvast-2.0)
* [noopvast-3.0](#noopvast-3.0)
* [noopvast-4.0](#noopvast-4.0)
* [noopmp3-0.1s](#noopmp3-0.1s)
* [noopmp4-1s](#noopmp4-1s)
* [click2load.html](#click2load.html)
* * *
### <a id="1x1-transparent.gif"></a> ⚡️ 1x1-transparent.gif
**Example**
```
||example.org^$image,redirect=1x1-transparent.gif
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="2x2-transparent.png"></a> ⚡️ 2x2-transparent.png
**Example**
```
||example.org^$image,redirect=2x2-transparent.png
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="3x2-transparent.png"></a> ⚡️ 3x2-transparent.png
**Example**
```
||example.org^$image,redirect=3x2-transparent.png
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="32x32-transparent.png"></a> ⚡️ 32x32-transparent.png
**Example**
```
||example.org^$image,redirect=32x32-transparent.png
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopframe"></a> ⚡️ noopframe
**Example**
```
||example.com^$subdocument,redirect=noopframe,domain=example.org
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopcss"></a> ⚡️ noopcss
**Example**
```
||example.org/style.css$stylesheet,redirect=noopcss
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopjs"></a> ⚡️ noopjs
**Example**
```
||example.org/advert.js$script,redirect=noopjs
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopjson"></a> ⚡️ noopjson
**Example**
```
||example.org/geo/location$xmlhttprequest,redirect=noopjson
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="nooptext"></a> ⚡️ nooptext
**Example**
```
||example.org/advert.js$xmlhttprequest,redirect=nooptext
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="empty"></a> ⚡️ empty
Pretty much the same as `nooptext`. Used for conversion of modifier `empty` so better avoid its using in production filter lists.

**Example**
```
||example.org/log$redirect=empty
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvmap-1.0"></a> ⚡️ noopvmap-1.0
Redirects request to an empty VMAP response.

**Example**
```
||example.org/vmap01.xml$xmlhttprequest,redirect=noopvmap-1.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-2.0"></a> ⚡️ noopvast-2.0
Redirects request to an empty VAST 2.0 response.

**Example**
```
||example.org/vast02.xml^$xmlhttprequest,redirect=noopvast-2.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-3.0"></a> ⚡️ noopvast-3.0
Redirects request to an empty VAST 3.0 response.

**Example**
```
||example.org/vast03.xml^$xmlhttprequest,redirect=noopvast-3.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopvast-4.0"></a> ⚡️ noopvast-4.0
Redirects request to an empty VAST 4.0 response.

**Example**
```
||example.org/vast04.xml^$xmlhttprequest,redirect=noopvast-4.0
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopmp3-0.1s"></a> ⚡️ noopmp3-0.1s
**Example**
```
||example.org/advert.mp3$media,redirect=noopmp3-0.1s
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="noopmp4-1s"></a> ⚡️ noopmp4-1s
**Example**
```
||example.org/advert.mp4$media,redirect=noopmp4-1s
```
[Redirect source](../src/redirects/static-redirects.yml)
* * *

### <a id="click2load.html"></a> ⚡️ click2load.html
Redirects resource and replaces supposed content by decoy frame with button for original content recovering

Related UBO redirect resource:
https://github.com/gorhill/uBlock/blob/1.31.0/src/web_accessible_resources/click2load.html

**Example**
```
||youtube.com/embed/$frame,third-party,redirect=click2load.html
```
[Redirect source](../src/redirects/blocking-redirects/click2load.html)
* * *


# myHomeCAN-srv
node.js server project of diy homeautomation project

## Setup

1. Checkout git [repository](https://github.com/gixxerPS/myHomeCAN-srv.git)
2. Install [node.js](https://nodejs.org/)
3. edit config files under ./config

Install required libraries:

    npm install

Start application:

    node ./index.js

Set debug log level via environment

    export MYHOMECANDEBUG='server can msg'
    
Set test environment (currently one pu and one iu)

    export MYHOMECANTESTENV=1
    
## Installation as service on raspberry pi

Restart service:
	
	sudo service myhomecan restart
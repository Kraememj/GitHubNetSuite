from hashlib import sha256

import oauth2 as oauth
import requests
import json

import generateHeaders
import buildParams

#Restlet URL for POST
#Example 'https://abc123.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=93&deploy=1'
url = "<URL>"

#Generate Headers for request
header_x = generateHeaders.run()

#Build Payload
organizedScripts = buildParams.build()
payload = json.dumps(organizedScripts)

response = requests.request("POST", url, data=payload, headers=header_x)
print(response.text)
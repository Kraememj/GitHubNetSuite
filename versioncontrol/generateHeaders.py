import binascii
import os
import hmac
import time
from hashlib import sha256

import oauth2 as oauth


def run():
    #Restlet URL for POST
    #Example 'https://abc123.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=93&deploy=1'
    url = "<URL>"

    token = oauth.Token(key=os.environ['TOKEN_KEY'],
                        secret=os.environ['TOKEN_SECRET'])
    consumer = oauth.Consumer(key=os.environ['CONSUMER_KEY'],
                            secret=os.environ['CONSUMER_SECRET'])

    http_method = "POST"
    #To Find realm, navigate to setup --> company  --> company information. Realm will be = to company id
    realm = "<COMPANYID>"

    params = {
        'oauth_version': "1.0",
        'oauth_nonce': oauth.generate_nonce(),
        'oauth_timestamp': str(int(time.time())),
        'oauth_token': token.key,
        'oauth_consumer_key': consumer.key
    }


    class SignatureMethod_HMAC_SHA256(oauth.SignatureMethod):
        name = 'HMAC-SHA256'

        def signing_base(self, request, consumer, token):
            if (not hasattr(request, 'normalized_url') or request.normalized_url is None):
                raise ValueError("Base URL for request is not set.")

            sig = (
                oauth.escape(request.method),
                oauth.escape(request.normalized_url),
                oauth.escape(request.get_normalized_parameters()),
            )

            key = '%s&' % oauth.escape(consumer.secret)
            if token:
                key += oauth.escape(token.secret)
            raw = '&'.join(sig)
            return key.encode('ascii'), raw.encode('ascii')

        def sign(self, request, consumer, token):
            """Builds the base signature string."""
            key, raw = self.signing_base(request, consumer, token)

            hashed = hmac.new(key, raw, sha256)

            # Calculate the digest base 64.
            return binascii.b2a_base64(hashed.digest())[:-1]


    req = oauth.Request(method=http_method, url=url, parameters=params)
    oauth.SignatureMethod_HMAC_SHA256 = SignatureMethod_HMAC_SHA256
    signature_method = oauth.SignatureMethod_HMAC_SHA256()
    req.sign_request(signature_method, consumer, token)
    header = req.to_header(realm)
    header_y = header['Authorization'].encode('ascii', 'ignore')
    header_x = {"Authorization": header_y, "Content-Type": "application/json"}
    return header_x
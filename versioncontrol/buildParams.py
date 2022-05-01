import os
import requests


GITHUB_OWNER = os.environ['GITHUB_OWNER']
GITHUB_REPO = os.environ['GITHUB_REPO']
GITHUB_REPO_URL = os.environ['GITHUB_REPO_URL']
GITHUB_AUTH = os.environ['AUTH_GITHUB']


def build():
    scripts = {
    'added': os.environ['ADDED_SCRIPTS'],
    'modified': os.environ['MODIFIED_SCRIPTS'],
    'removed': os.environ['REMOVED_SCRIPTS'],
    'renamed': os.environ['RENAMED_SCRIPTS'],
    'added_modified': os.environ['ADDED_MODIFIED_SCRIPTS']
    }

    headers={
        "accept":'application/vnd.github.v3+json',
        'Authorization': 'token ' + GITHUB_AUTH
        }
    
    sendArr = []
  
    for key,value in scripts.items():
        files = value.split()
        for file in files:
            try:
                if 'filecabinet' not in file.lower():
                    continue
                if key is 'removed':
                    sendArr.append({
                        'path': file,
                        'type': [key],
                    })
                    continue
                exists = False
                for newfile in sendArr:
                    if (newfile['path'] == file):
                        exists = True
                        newfile['type'].append(key)
                if (exists):
                    continue        
                url = 'https://api.github.com' + '/repos/' + GITHUB_REPO + '/contents/' + file
                response = requests.get(url,headers=headers)
                print('response text', response.text)
                data = response.json()
                sendArr.append({
                    'name': data['name'],
                    'content': data['content'].replace('\n', ''),
                    'path': data['path'],
                    'encoding': data['encoding'],
                    'type': [key]
                    })
            except:
                print(file + ' skipped.')
                continue        
    print('sendArr', sendArr)
    return sendArr 
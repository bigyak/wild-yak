#!/bin/bash
cd "$(dirname "$0")"
./build.sh
rsync -avz --delete --exclude '.git' --exclude 'chats' --exclude 'config' -e ssh . chad@jobhunt.in:~/sites/jobhunt.in/

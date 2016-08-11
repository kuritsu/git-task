#!/bin/bash

rm -rf git-task.tar.gz
tar -cvzf git-task.tar.gz ../git-task/ \
	--exclude=git-task/.tasks \
	--exclude=git-task/.git \
	--exclude=git-task/.idea \
	--exclude=git-task/node_modules \
	--exclude=git-task/*.gz \
	--exclude=git-task/*.sh \
	--exclude=git-task/.gitignore

if [ "$1" == "-i" ]; then
	npm install git-task.tar.gz
fi

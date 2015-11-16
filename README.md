Run mongodb:
1. make sure you have a directory '/data/db/'(if you dont have, use `mkdir` to create a folder)
2. run `mongod --dbpath /data/db/  --port <we have our port>`
3. run `mongo --port <the port>`
(this wise you can start multiple mongo servers at the same time)
------------------------------------------------------------------------------------------------------------------------------
Run `node seed.js' to seed your database, so that you can at least login
------------------------------------------------------------------------------------------------------------------------------
practice project

npm install
node seed.js
npm start

you might need to have a configuration file for tokens, will share.
------------------------------------------------------------------------------------------------------------------------------
Creating a new branch:

git status (just to check if your current branch is clean);

git checkout develop (always start from develop latest version)

git pull(update the current develop branch)

git checkout –b <branch name>

git push origin <branch name>

git branch --set-upstream-to=origin/<branch name>

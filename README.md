Run mongodb:
1. make sure you have a directory '/data/db/'(if you dont have, use `mkdir` to create a folder)
2. run `mongod --dbpath /data/db/  --port <we have our port>`
3. run `mongo --port <the port>`
(this wise you can start multiple mongo servers at the same time)

--------------------------------------------------------------------------------------------------------------------------------

Run `node seed.js' to seed your database, so that you can at least login

--------------------------------------------------------------------------------------------------------------------------------

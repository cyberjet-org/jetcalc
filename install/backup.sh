#!/bin/bash

now="$(date +'%Y-%m-%d-%H-%M')"
tmp=jetcalc

cd $HOME
if [ ! -d $tmp ] 
then
    mkdir $tmp
fi

dirname="$HOME/$tmp"
cd $tmp

mongodump -d jetcalc
export PGPASSWORD="postgres"
pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f $dirname/sql.backup jetcalc

cd $HOME
if [ ! -d backup ]
then
    mkdir backup
fi 

zip -r "backup/dump_$now.zip" $dirname
rm -R $tmp
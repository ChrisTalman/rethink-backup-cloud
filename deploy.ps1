$ErrorActionPreference = "Stop"

docker-compose build
docker-compose push

read-host -prompt "Press Any Key to Exit"
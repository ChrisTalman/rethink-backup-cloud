FROM mhart/alpine-node:12.14

WORKDIR /home/root/App

RUN apk update
RUN apk add python
RUN apk add make
RUN apk add g++

COPY ./package.json ./
COPY ./package-lock.json ./
RUN npm ci

COPY ./ ./

CMD node index.js --initialiseAutomaticBackup
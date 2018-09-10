FROM node:latest

RUN mkdir -p /user/src/app

WORKDIR /user/src/app

COPY package.json /user/src/app

RUN npm install --silent

COPY . /user/src/app

EXPOSE 8443

CMD ["npm", "start"]
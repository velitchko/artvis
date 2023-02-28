FROM node:18


COPY package.json .

RUN npm install

COPY . .

ENTRYPOINT npm run deploy
FROM node:20-slim

WORKDIR /usr/src/app

COPY ./ ./

RUN rm -rf ./node_modules/

RUN npm install

RUN npm run build

EXPOSE 8080

ENTRYPOINT ["npm", "start", "--"]

CMD ["--prod"]

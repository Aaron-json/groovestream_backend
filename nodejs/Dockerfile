FROM node:20-slim

WORKDIR /usr/src/app

COPY ./ ./

RUN rm -rf ./node_modules/ && npm install
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
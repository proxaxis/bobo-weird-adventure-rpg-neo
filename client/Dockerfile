FROM node:24.12.0

WORKDIR /app

RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node

COPY --chown=node:node ./app/ ./

# RUN npm install

EXPOSE 8010

# CMD ["npm", "run", "dev"]
CMD ["sleep", "infinity"]

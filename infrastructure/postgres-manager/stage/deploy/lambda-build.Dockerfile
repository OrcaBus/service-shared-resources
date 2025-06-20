FROM public.ecr.aws/lambda/nodejs:20-arm64 AS builder
WORKDIR /usr/app

COPY ./function ./function
COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable
RUN yarn --version

RUN yarn install --immutable
RUN yarn build

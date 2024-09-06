# Use a minimal base image for the builder stage
FROM node:22-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable

# Set the working directory
WORKDIR /app

# Copy only the package files to install dependencies
COPY package.json ./

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Set environment variable
ENV NODE_ENV=development
ENV NUXT_ENVIRONMENT=development


RUN pnpm run build

# Use a minimal base image for the production dependencies stage
FROM node:22-alpine AS prod-deps

# Enable corepack for pnpm
RUN corepack enable

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Install only production dependencies using pnpm
RUN pnpm install --prod

# Use a minimal base image for the final runtime stage
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Set environment variable
ENV NODE_ENV=development

# Copy the build output from the builder stage
COPY --from=builder /app/.output ./.output

# Copy production dependencies from the production dependencies stage
COPY --from=prod-deps /app/node_modules ./node_modules

# Expose the application port
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

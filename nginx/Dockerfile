# ----- BƯỚC 1: Build React App -----
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ENV VITE_API_URL=/api/v1
RUN npm run build

# ----- BƯỚC 2: Phục vụ bằng Nginx -----
FROM nginx:alpine
# Copy file cấu hình Nginx vừa tạo ở trên vào Container
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Copy các file tĩnh React đã build vào thư mục chứa web của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
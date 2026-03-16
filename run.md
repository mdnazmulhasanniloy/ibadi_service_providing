## 📁 Run in Docker

---

## 1. Build new Production Image:

Build new Production Image:

```sh
docker build --no-cache   --build-arg DATABASE_URL=""   -t nazmulhasn/prisma_project_format:latest .
```

---

## 2. Push to Docker Hub

```sh
docker push nazmulhasn/prisma_project_format:latest
```

## 3. Other computer/server: pull new image

Inside the project folder:

```sh
docker-compose pull
```

---

## 4. Restart with the updated version

```sh
docker-compose down
docker-compose up -d
```

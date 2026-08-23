## 📁 Run in Docker

---

## 1. Build new Production Image:

Build new Production Image:

```sh
docker build --no-cache   --build-arg DATABASE_URL="mongodb+srv://car-doctor:car-doctor@cluster0.pyj8wdj.mongodb.net/ibadi_serviceproviding?retryWrites=true&w=majority" -t nazmulhasn/iumi_app:latest .
```

---

## 2. Push to Docker Hub

```sh
docker push nazmulhasn/iumi_app:latest
```

## 3. Other computer/server: pull new image

Inside the project folder:

```sh
docker-compose pull
```
https://api.iumi.ro
---

## 4. Restart with the updated version

```sh
docker-compose down
docker-compose up -d
```

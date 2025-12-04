# ft_transcendence

# API Gateway
To get `server.crt` and `server.key`, you need to generate a self-signed SSL certificate and key (for development) or obtain them from a trusted Certificate Authority (for production).

For development (self-signed):
```
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout server.key -out server.crt \
-subj "/CN=localhost"
```
Run this command in your terminal:

This will create `server.crt` and `server.key` in your current directory.

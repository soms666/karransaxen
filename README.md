# Kärran & Saxen

Modern responsiv bokningsapp för klipptider.

## Kör lokalt

Öppna `index.html` direkt i webbläsaren eller starta en enkel statisk server:

```bash
cd /Users/sssrqs/GIT/private/karransaxen
python3 -m http.server 5173
```

## Funktioner

- Responsiv layout för mobil och desktop
- Tjänstval, stylistval, datum och tidsluckor
- Live-sammanfattning med pris och längd
- Lokalt sparade bokningar i webbläsaren
- Bokningsmejl adresseras till `cheriepallin@gmail.com`
- Enkel och modern visuell design

## E-post

Appen är förberedd för automatisk e-post via `bookingEndpoint` i `main.js`. Ange en säker server-endpoint där för att skicka mejl automatiskt via exempelvis Resend eller Brevo. Utan endpoint öppnas ett färdigifyllt mejl till salongens adress i besökarens mejlklient.

# World Cup Festival 688

Monorepo for the World Cup Festival 688 web application.

## Apps

- `apps/web`: React + Vite + TypeScript frontend
- `apps/api`: Node.js + Express backend

## Install

```bash
npm install
```

## Run

```bash
npm run dev:api
npm run dev:web
```

## Preview on a phone

Start the frontend with network access:

```env
# apps/web/.env
VITE_API_BASE_URL=http://<COMPUTER_LOCAL_IP>:3001
```

Then run:

```bash
npm run dev:host
```

Open `http://<COMPUTER_LOCAL_IP>:5173` on your phone. For example:

```text
http://192.168.110.119:5173
```

The phone and computer must be connected to the same Wi-Fi network. Keep the API running in a separate terminal with `npm run dev:api`. If Windows Firewall asks for permission, allow Node.js on private networks.

## Test

```bash
npm run test
```

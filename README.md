# open-carpool

Carpool operations tool for groups that already know each other (companies, universities, clubs, school parents).
Fixed crews, fair driver rotation, one-tap ride logs and admin reports. Not a stranger-matching app.

Status: v1 in development on the `develop` branch. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Develop

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
npm test          # unit tests
npm run test:rules  # Firestore security rules (needs Java 21+ for the Firebase emulators)
```

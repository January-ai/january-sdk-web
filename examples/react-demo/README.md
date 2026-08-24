# January Partner SDK React demo

A full-stack React and TypeScript demo built with TanStack Start, TanStack
Router, and TanStack Query. January API requests run in server functions so the
development API key is never included in the browser bundle.

## Run locally

From the SDK repository root, add the development credential to `.env.local`:

```sh
JANUARY_DEV_API_KEY=your-development-key
JANUARY_END_USER_ID=your-test-user-id
```

Then install and run the demo:

```sh
cd examples/react-demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The authentication boundary lives in `src/api/january.server.ts`. Replace that
adapter when short-lived partner tokens become available; route components and
query hooks should not need to change.

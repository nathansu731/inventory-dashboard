This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## How Redux Works Here

This project uses Redux Toolkit with Next.js App Router, following modern best practices. 
It is currently set up for client-side only, with support for SSR-ready architecture when needed later (e.g., with Apollo).

## Libraries Used

@reduxjs/toolkit – Standard for Redux development

react-redux – Official React bindings for Redux

next – App Router used (via /app directory)

next-redux-wrapper – Installed but not used yet

Note: next-redux-wrapper is installed but not currently used. It is typically used for SSR support, 
which will be added later when Apollo Client or server data preloading is introduced.

Folder Structure
store/
├── index.ts               # Redux store configuration
├── root-reducer.ts        # Combines all slice reducers
├── providers.tsx          # Redux Provider for App Router
├── slices/
│   └── ui-slice.ts        # Manages UI state (e.g. sidebar)
└── utils/
    └── hooks.ts           # Typed hooks for dispatch and selector

## How It Works

1. Store Setup

The Redux store is configured in store/index.ts using configureStore().
All slice reducers are combined in store/root-reducer.ts.

2. Provider Setup

A Providers component in store/providers.tsx wraps the app with <Provider>.
This component is marked as a use client component.
Providers is used in app/layout.tsx to inject Redux across the app.

3. Typed Hooks

useAppDispatch() and useAppSelector() are available via store/utils/hooks.ts.
These provide fully typed access to Redux state and actions.

4. Example Slice

```tsx
interface UIState {
  sidebarOpen: boolean;
}
const initialState: UIState = {
  sidebarOpen: false,
};
```

5. Example Usage

```tsx
'use client';

import { useAppDispatch, useAppSelector } from '@/store/utils/hooks';
import { toggleSidebar } from '@/store/slices/ui-slice';

export default function SidebarToggle() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <button onClick={() => dispatch(toggleSidebar())}>
      {sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
    </button>
  );
}
```

## How Apollo Works Here

This project uses Apollo Client v4 for GraphQL communication with a backend API. 
It is fully integrated with Next.js App Router and supports usage in client components for querying and mutating data.

## Libraries Used

@apollo/client – Apollo Client core
graphql – Required for parsing GraphQL syntax

Folder Structure
lib/
├── apollo-client.ts        # Apollo Client instance
└── graphql/
    └── queries/
        └── example-query.ts  # Example GraphQL query

## Query Example

Path: lib/graphql/queries/example-query.ts

```tsx
import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      price
    }
  }
`;
```

## Example Component Using the Query

```tsx
'use client';
import { useQuery } from '@apollo/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries/example-query';

export default function ProductList() {
    const { data, loading, error } = useQuery(GET_PRODUCTS);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <ul>
            {data.products.map((product: any) => (
                <li key={product.id}>
                    {product.name} - ${product.price}
                </li>
            ))}
        </ul>
    );
}
```



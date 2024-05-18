import React from "react";
import settings from "@/config/settings";
import authStorage from "@/utils/storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client/links/httpLink";
import { splitLink } from "@trpc/client/links/splitLink";
import { createWSClient, wsLink } from "@trpc/client/links/wsLink";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/server";

export const trpc = createTRPCReact<AppRouter>();
export { type RouterInputs, type RouterOutputs } from "@acme/server";

// let token: string | null = null;

// export function setHeaderToken(newToken: string | null) {
//   token = newToken;
// }

export function TRPCProvider(props: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: wsLink({
            client: createWSClient({
              url: settings.wsUrl,
              onOpen() {
                console.log("ws opened");
              },
              onClose() {
                console.log("ws closed");
              },
            }),
          }),
          false: httpLink({
            url: settings.apiUrl,
            headers: async () => {
              const headers = new Map<string, string>();
              headers.set("x-trpc-source", "expo-react");
              const token = await authStorage.getToken();
              if (token) {
                headers.set(`authorization`, `Bearer ${token}`);
              }
              return Object.fromEntries(headers);
            },
          }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

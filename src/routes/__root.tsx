import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "🐝 Worker Bee — Website Builder" },
      {
        name: "description",
        content:
          "Worker Bee is a local website-builder agent powered by Ollama — multi-tab agents, tools, and runtime config.",
      },
      { name: "author", content: "Worker Bee" },
      { property: "og:title", content: "🐝 Worker Bee — Website Builder" },
      {
        property: "og:description",
        content: "Local website-builder agent powered by Ollama. Always buzzing. Never sleeping.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "🐝 Worker Bee — Website Builder" },
      { name: "description", content: "Worker Bee is a website builder AI agent interface for local LLMs." },
      { property: "og:description", content: "Worker Bee is a website builder AI agent interface for local LLMs." },
      { name: "twitter:description", content: "Worker Bee is a website builder AI agent interface for local LLMs." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c47e664f-8902-45e4-b14a-507330d29415/id-preview-d6cb3b9e--20ac6b45-0072-4478-af97-e326b9c711e1.lovable.app-1776688796379.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c47e664f-8902-45e4-b14a-507330d29415/id-preview-d6cb3b9e--20ac6b45-0072-4478-af97-e326b9c711e1.lovable.app-1776688796379.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('workerbee_theme');if(t==='dark'){document.documentElement.classList.add('dark');}document.documentElement.classList.remove('light');}catch(e){}",
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" />
    </>
  );
}

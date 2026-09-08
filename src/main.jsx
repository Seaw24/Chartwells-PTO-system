import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient.js";
import { QueryBoundary } from "./components/ui/QueryBoundary.jsx";
import { SyncStatus } from "./components/ui/SyncStatus.jsx";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.jsx";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QueryBoundary>
          <App />
        </QueryBoundary>
        <SyncStatus />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

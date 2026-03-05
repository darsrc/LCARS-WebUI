import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/antonio/400.css";
import "@fontsource/antonio/700.css";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="boot-status error">
          <div>
            <p>LCARS UI runtime error</p>
            <pre style={{ fontSize: "0.75rem", marginTop: "1rem", textAlign: "left" }}>
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

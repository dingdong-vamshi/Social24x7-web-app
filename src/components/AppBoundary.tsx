import { Component, type ReactNode } from 'react';
import { isModuleLoadError } from '../lib/moduleLoadError';

export class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean; moduleFailure: boolean }> {
  state = { failed: false, moduleFailure: false };
  static getDerivedStateFromError(error: unknown) { return { failed: true, moduleFailure: isModuleLoadError(error) }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="public-info"><h1>{this.state.moduleFailure ? 'This workspace needs a fresh page.' : 'This page could not load.'}</h1>
      <p>{this.state.moduleFailure ? 'A workspace file could not be loaded. The site may have been updated, or your connection may be interrupted. Check your connection, then reload.' : 'Reload the page to try again.'}</p>
      <p>Saved account records are unchanged. Unsaved edits may be lost when you reload. We have not reloaded automatically.</p>
      <button className="public-cta" onClick={() => window.location.reload()}>Reload page</button>
    </main>;
  }
}

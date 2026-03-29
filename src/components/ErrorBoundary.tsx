import React from 'react'

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

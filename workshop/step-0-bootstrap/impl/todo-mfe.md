# todo-mfe — PROJ-000c

## Sub-task
Scaffold todo-mfe with hello component

## Repo-level PATs
- Given API returns a message, component displays it in `[data-testid='api-message']`
- Component renders container with `[data-testid='mfe-content']`

## Implementation

### Project structure
```
todo-mfe/
  src/
    App.jsx           # Main component, fetches from API
    bootstrap.js      # Module Federation bootstrap
    index.js          # Entry point
  webpack.config.js   # Module Federation plugin config
  package.json
  .gitlab-ci.yml
  Dockerfile
  README.md
```

### Module Federation config
```
// webpack.config.js (relevant section)
new ModuleFederationPlugin({
  name: 'todoMfe',
  filename: 'remoteEntry.js',
  exposes: {
    './App': './src/App',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
})
```

### Component
```
// src/App.jsx
function App({ apiUrl }) {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch(`${apiUrl}/hello`)
      .then(res => res.json())
      .then(data => setMessage(data.message));
  }, [apiUrl]);

  return (
    <div data-testid="mfe-content">
      <p data-testid="api-message">{message}</p>
    </div>
  );
}
```

### Repo-level testing
Tests use mocked API responses — no real API call. The story-level PATs in the root repo test the real integration.

```
// Example test setup
jest.mock('fetch');
fetch.mockResolvedValue({
  json: () => Promise.resolve({ message: 'Hello from API Read' })
});
```

### CI pipeline
Same structure as APIs — build, test, release stages with auto-tagging.

### Docker (for local composition)
```
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
```

## Notes
This MFE exposes a single component for Story Zero. In PROJ-001, it will expose TodoList, TodoItem, TodoEditor components. The Module Federation config will grow but the pattern stays the same.

## Release
Tag: `todo-mfe@v0.1.0`

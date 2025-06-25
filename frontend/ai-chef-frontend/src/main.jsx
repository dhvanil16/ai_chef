import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { AuthProvider } from './utils/AuthContext'
import { NotificationProvider } from './utils/NotificationContext'
import './index.css'
import App from './App.jsx'
import { auth0Config } from './utils/auth0-config'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      redirectUri={auth0Config.redirectUri}
      audience={auth0Config.audience}
      scope={auth0Config.scope}
    >
      <NotificationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
      </NotificationProvider>
    </Auth0Provider>
  </StrictMode>,
)

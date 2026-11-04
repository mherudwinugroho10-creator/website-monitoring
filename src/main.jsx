import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { readFirebaseConfig } from './config/firebaseEnv.js'

const root = createRoot(document.getElementById('root'))
const { missing, invalid } = readFirebaseConfig(import.meta.env)

// Aplikasi (dan Firebase di dalamnya) hanya dimuat bila konfigurasi lengkap. Bila tidak, yang tampil
// adalah petunjuk pengisian, bukan halaman kosong.
if (missing.length > 0 || invalid.length > 0) {
  import('./components/common/ConfigError.jsx').then(({ default: ConfigError }) => {
    root.render(<ConfigError missing={missing} invalid={invalid} />)
  })
} else {
  import('./App.jsx').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
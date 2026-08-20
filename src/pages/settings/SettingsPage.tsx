import { Button, Card, CardContent, Chip, Typography } from '@mui/material'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { authConfig } from '../../config/auth'
import { useAuth } from '../../hooks/useAuth'
import { isApiConfigured } from '../../services/apiClient'
import { PaymentMode, Person, TransactionType } from '../../types/transaction'
import { formatMode, formatTransactionType } from '../pageUtils'
import { PlaceholderPage } from '../PlaceholderPage'
import './SettingsPage.css'

const transactionTypes = [...new Set(Object.values(TransactionType))]

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="settings-detail"><dt>{label}</dt><dd>{value}</dd></div>
}

function CapabilityList({ values }: { readonly values: readonly string[] }) {
  return <div className="settings-chips">{values.map((value) => <Chip key={value} label={value} size="small" />)}</div>
}

export function SettingsPage() {
  const { signOut, user } = useAuth()

  return (
    <PlaceholderPage description="Review account, application, and ledger configuration." title="Settings">
      <div className="settings-grid">
        <Card className="settings-card" variant="outlined">
          <CardContent>
            <Typography component="h2" variant="h6">Account</Typography>
            <dl className="settings-details">
              <Detail label="Name" value={user?.name ?? 'Unavailable'} />
              <Detail label="Email" value={user?.email ?? 'Unavailable'} />
              <Detail label="Role" value={user?.role ?? 'Unavailable'} />
              <Detail label="Configured person" value={user?.person ?? 'Not configured'} />
            </dl>
          </CardContent>
        </Card>

        <Card className="settings-card" variant="outlined">
          <CardContent>
            <Typography component="h2" variant="h6">Application status</Typography>
            <dl className="settings-details">
              <Detail label="Frontend API" value={isApiConfigured() ? 'Configured' : 'Not configured'} />
              <Detail label="Google sign-in" value={authConfig.isValid ? 'Configured' : 'Not configured'} />
              <Detail label="Build mode" value={import.meta.env.MODE} />
            </dl>
          </CardContent>
        </Card>

        <Card className="settings-card settings-card--wide" variant="outlined">
          <CardContent>
            <Typography component="h2" variant="h6">Ledger capabilities</Typography>
            <div className="settings-capabilities">
              <div><Typography color="text.secondary" variant="body2">Supported people</Typography><CapabilityList values={Object.values(Person)} /></div>
              <div><Typography color="text.secondary" variant="body2">Transaction types</Typography><CapabilityList values={transactionTypes.map(formatTransactionType)} /></div>
              <div><Typography color="text.secondary" variant="body2">Payment modes</Typography><CapabilityList values={Object.values(PaymentMode).map(formatMode)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="settings-card settings-card--wide" variant="outlined">
          <CardContent className="settings-session">
            <div>
              <Typography component="h2" variant="h6">Session</Typography>
              <Typography color="text.secondary" variant="body2">Sign out of this browser session.</Typography>
            </div>
            <Button color="error" onClick={signOut} startIcon={<LogoutOutlinedIcon />} variant="outlined">Sign out</Button>
          </CardContent>
        </Card>
      </div>
    </PlaceholderPage>
  )
}

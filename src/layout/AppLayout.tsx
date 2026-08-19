import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { AppBar, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Paper, Toolbar, Typography } from '@mui/material'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useThemeMode } from '../hooks/useThemeMode'
import { UserRole } from '../types/auth'
import './AppLayout.css'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
const items = [{ label: 'Dashboard', path: '/', icon: DashboardOutlinedIcon }, { label: 'Transactions', path: '/transactions', icon: SwapHorizOutlinedIcon }, { label: 'Calendar', path: '/calendar', icon: CalendarMonthOutlinedIcon }, { label: 'Reports', path: '/reports', icon: DescriptionOutlinedIcon }, { label: 'Settings', path: '/settings', icon: SettingsOutlinedIcon, adminOnly: true }]
function Brand() { return <div className="brand"><AccountBalanceWalletOutlinedIcon /><Typography component="span">BalanceSheetApp</Typography></div> }
function Navigation({ close, isAdmin }: { close: () => void; isAdmin: boolean }) { return <List className="nav">{items.filter((item) => !item.adminOnly || isAdmin).map(({ label, path, icon: Icon }) => <ListItemButton className="nav__item" component={NavLink} key={path} onClick={close} to={path}><ListItemIcon><Icon /></ListItemIcon><ListItemText primary={label} /></ListItemButton>)}</List> }
export function AppLayout() { const [open, setOpen] = useState(false); const { user } = useAuth(); const { mode, toggleMode } = useThemeMode(); const close = () => setOpen(false); const isAdmin = user?.role === UserRole.Admin; return <div><aside className="sidebar"><Brand /><Navigation close={close} isAdmin={isAdmin} /></aside><AppBar className="header" color="transparent" elevation={0}><Toolbar className="toolbar"><div className="mobile-brand"><IconButton aria-label="Open navigation" onClick={() => setOpen(true)}><MenuOutlinedIcon /></IconButton><Brand /></div><IconButton aria-label="Toggle dark mode" onClick={toggleMode}>{mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}</IconButton></Toolbar></AppBar><Paper className={open ? 'drawer drawer--open' : 'drawer'} component="aside" elevation={8}><Brand /><Navigation close={close} isAdmin={isAdmin} /></Paper><button aria-label="Close navigation" className={open ? 'backdrop backdrop--open' : 'backdrop'} onClick={close} type="button" /><main className="content"><Outlet /></main></div> }

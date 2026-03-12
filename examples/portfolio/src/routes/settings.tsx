import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from './settings.component'

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
})

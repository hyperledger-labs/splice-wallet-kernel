import { createFileRoute } from '@tanstack/react-router'
import { OldApp } from './old.component'

export const Route = createFileRoute('/old')({
    component: OldApp,
})

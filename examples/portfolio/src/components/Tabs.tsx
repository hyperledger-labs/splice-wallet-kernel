import { useState, type ReactNode } from 'react'

export type TabDefinition = {
    label: string
    value: string
    content: ReactNode
}

export type TabsProps = {
    tabs: TabDefinition[]
    initialValue?: string
}

export const Tabs: React.FC<TabsProps> = ({ tabs, initialValue }) => {
    const defaultValue = initialValue ?? tabs[0]?.value
    const [active, setActive] = useState(defaultValue)

    const activeTab = tabs.find((t) => t.value === active)

    return (
        <div>
            <div role="tablist" className="flex gap-2 border-b">
                {tabs.map((t) => (
                    <button
                        key={t.value}
                        role="tab"
                        aria-selected={active === t.value}
                        className={`${
                            active === t.value
                                ? 'border-b-2 border-blue-500'
                                : 'opacity-60'
                        }`}
                        onClick={() => setActive(t.value)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div role="tabpanel">{activeTab?.content}</div>
        </div>
    )
}

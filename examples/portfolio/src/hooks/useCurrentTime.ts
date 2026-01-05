import { useEffect, useState } from 'react'

export function useCurrentTime(): Date {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date())
        }, 10_000)
        return () => clearInterval(intervalId)
    }, [])

    return now
}

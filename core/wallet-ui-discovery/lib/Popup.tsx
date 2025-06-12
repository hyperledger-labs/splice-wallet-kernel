import { useState } from 'react'

export function Popup() {
    const [count, setCount] = useState(0)

    return (
        <div id="root" style={{ backgroundColor: 'lightblue' }}>
            <h1>This is some example component!</h1>
            <button onClick={() => setCount((count) => count + 1)}>
                count is {count}
            </button>
        </div>
    )
}

import { createPopup } from '../lib'

function App() {
    return (
        <>
            <h1>Discovery Test</h1>
            <div className="card">
                <button onClick={() => createPopup('Test popup')}>popup</button>
            </div>
        </>
    )
}

export default App

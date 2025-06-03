import express from 'express'

const app = express()
const port = 3000

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' })
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})

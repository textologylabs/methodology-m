const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())

const <collection> = []

app.get('/<resource>', (req, res) => {
  res.json(<collection>)
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.STUB_PORT || <read-port>
const server = app.listen(PORT, () => {
  console.log('<api-name> stub on port ' + PORT)
})

module.exports = { app, <collection>, server }
